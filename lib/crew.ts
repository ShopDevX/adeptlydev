import fs from "node:fs/promises";
import path from "node:path";
import { getPlansDir, readPlan, getProjectRoot } from "./plans";
import { readCachedRecipe } from "./plan-recipe";
import { runClaude } from "./claude-cli";
import { capture } from "./exec";

/**
 * Adeptly Crew — turn an APPROVED plan into a real run.
 *
 * Adeptly already drafts the plan (docs/plans/*.md) and generates a Claude Code
 * "recipe" (which subagents/skills/order to use). The Crew closes the loop: it
 * EXECUTES that recipe as a pipeline of roles — Architect → Approval Gate →
 * Builder → Medic → Reviewer → Security → Pilot(PR) — each one a headless
 * `claude --print` turn inside your own repo.
 *
 * Safety model:
 *   - DRY-RUN by default. Simulates every stage; touches no git, no claude, no gh.
 *   - LIVE runs (`mode: "live"`) require the plan's approval.status === "approved"
 *     AND the env flag ADEPTLY_LIVE=1. Without both, a live run is refused.
 *   - Everything runs locally. Your code never leaves your machine.
 */

export type RunMode = "dry-run" | "live";

export type StageStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped";

export type RunStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "cancelled";

export interface RunStage {
  id: string;
  role: string; // display name
  title: string;
  status: StageStatus;
  startedAt?: string;
  endedAt?: string;
  log: string[];
  summary?: string;
}

export interface Run {
  id: string;
  slug: string;
  planTitle: string;
  mode: RunMode;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  branch?: string;
  prUrl?: string;
  error?: string;
  stages: RunStage[];
}

interface StageDef {
  id: string;
  role: string;
  title: string;
  dry: { log: string[]; summary: string };
}

/** The pipeline. Role ids mirror the DevCrew theme roles for future theming. */
const STAGE_DEFS: StageDef[] = [
  {
    id: "architect",
    role: "Architect",
    title: "Map the code & shape the approach",
    dry: {
      log: [
        "Reading the approved plan…",
        "Exploring the repo for the files it touches…",
        "Drafting an implementation brief.",
      ],
      summary: "Approach confirmed — plan is coherent and the touched files exist.",
    },
  },
  {
    id: "gate",
    role: "Approval Gate",
    title: "Verify the plan is approved",
    dry: {
      log: ["Checking approval status…"],
      summary: "Gate open — plan is approved. (Dry-run: no gate enforcement.)",
    },
  },
  {
    id: "builder",
    role: "Builder",
    title: "Branch & implement the change",
    dry: {
      log: [
        "Creating branch adeptly/<slug>…",
        "Applying the plan's create/modify/delete steps…",
        "Writing code with the smallest sensible diff.",
      ],
      summary: "Implemented the plan on a fresh branch (simulated).",
    },
  },
  {
    id: "medic",
    role: "Medic",
    title: "Build, test & self-heal",
    dry: {
      log: ["Running build / type-check / tests…", "All green on first pass."],
      summary: "Build & tests pass (simulated).",
    },
  },
  {
    id: "qa",
    role: "Reviewer",
    title: "Review the diff",
    dry: {
      log: ["Diffing against base…", "Checking for regressions and dead code."],
      summary: "No blocking issues found (simulated).",
    },
  },
  {
    id: "security",
    role: "Security",
    title: "Security review",
    dry: {
      log: ["Scanning the diff for injection, secrets, authz gaps…"],
      summary: "No security concerns in the diff (simulated).",
    },
  },
  {
    id: "pr",
    role: "Pilot",
    title: "Open the pull request",
    dry: {
      log: ["Committing…", "Pushing branch…", "Opening PR against base."],
      summary: "PR opened (simulated) — review and merge when ready.",
    },
  },
];

// ---- storage ---------------------------------------------------------------

export function getRunsDir(slug: string, projectRoot = getProjectRoot()): string {
  return path.join(getPlansDir(projectRoot), "runs", slug);
}

function runFile(slug: string, id: string, projectRoot = getProjectRoot()): string {
  return path.join(getRunsDir(slug, projectRoot), `${id}.json`);
}

// In-process registry so an in-flight run's live state is authoritative even
// before the next disk flush. Disk is the durable fallback across reloads.
const active = new Map<string, Run>();

async function persist(run: Run, projectRoot = getProjectRoot()): Promise<void> {
  run.updatedAt = new Date().toISOString();
  active.set(run.id, run);
  try {
    const dir = getRunsDir(run.slug, projectRoot);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(runFile(run.slug, run.id, projectRoot), JSON.stringify(run, null, 2) + "\n", "utf-8");
    // append-only audit line
    const audit = path.join(dir, "audit.jsonl");
    const last = run.stages.filter((s) => s.status !== "pending").slice(-1)[0];
    await fs.appendFile(
      audit,
      JSON.stringify({ t: run.updatedAt, id: run.id, status: run.status, stage: last?.id, stageStatus: last?.status }) + "\n",
      "utf-8"
    );
  } catch {
    // persistence is best-effort; the in-memory copy still drives the UI
  }
}

export async function getRun(slug: string, id: string, projectRoot = getProjectRoot()): Promise<Run | null> {
  if (active.has(id)) return active.get(id)!;
  try {
    const raw = await fs.readFile(runFile(slug, id, projectRoot), "utf-8");
    return JSON.parse(raw) as Run;
  } catch {
    return null;
  }
}

export async function listRuns(slug: string, projectRoot = getProjectRoot()): Promise<Run[]> {
  const dir = getRunsDir(slug, projectRoot);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const runs: Run[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const id = f.replace(/\.json$/, "");
    const r = active.get(id) ?? (await getRun(slug, id, projectRoot));
    if (r) runs.push(r);
  }
  runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return runs;
}

// ---- lifecycle -------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface StartRunResult {
  run?: Run;
  error?: string;
}

export async function startRun(
  slug: string,
  mode: RunMode,
  projectRoot = getProjectRoot()
): Promise<StartRunResult> {
  const plan = await readPlan(slug, projectRoot);
  if (!plan) return { error: "plan not found" };

  if (mode === "live") {
    if (process.env.ADEPTLY_LIVE !== "1") {
      return { error: "Live runs are disabled. Start Adeptly with ADEPTLY_LIVE=1 to enable real git/PR actions." };
    }
    if (plan.approval?.status !== "approved") {
      return { error: "Plan must be approved before a live run. Approve it in the Approval tab first." };
    }
  }

  const now = new Date().toISOString();
  const run: Run = {
    id: `run-${Date.now()}`,
    slug,
    planTitle: plan.title,
    mode,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    stages: STAGE_DEFS.map((d) => ({
      id: d.id,
      role: d.role,
      title: d.title,
      status: "pending",
      log: [],
    })),
  };
  await persist(run, projectRoot);

  // Fire-and-forget: the UI polls GET /api/runs/[id]. Local single-process
  // server, so the async task keeps running after the POST returns.
  void execute(run, projectRoot).catch(async (err) => {
    run.status = "failed";
    run.error = err?.message ?? String(err);
    await persist(run, projectRoot);
  });

  return { run };
}

export async function cancelRun(slug: string, id: string, projectRoot = getProjectRoot()): Promise<Run | null> {
  const run = active.get(id) ?? (await getRun(slug, id, projectRoot));
  if (!run) return null;
  if (run.status === "running" || run.status === "queued") {
    run.status = "cancelled";
    for (const s of run.stages) if (s.status === "pending" || s.status === "running") s.status = "skipped";
    await persist(run, projectRoot);
  }
  return run;
}

async function execute(run: Run, projectRoot: string): Promise<void> {
  run.status = "running";
  await persist(run, projectRoot);

  const ctx: LiveCtx = { branch: `adeptly/${run.slug}`, base: "", touched: false };
  // Read through a closure so TS doesn't narrow away the cancelled case
  // (cancelRun mutates run.status from a separate async context).
  const cancelled = () => run.status === "cancelled";

  for (const stage of run.stages) {
    if (cancelled()) return;
    stage.status = "running";
    stage.startedAt = new Date().toISOString();
    await persist(run, projectRoot);

    try {
      const ok =
        run.mode === "dry-run"
          ? await runDryStage(stage)
          : await runLiveStage(run, stage, ctx, projectRoot);

      stage.status = ok ? "passed" : "failed";
      stage.endedAt = new Date().toISOString();
      await persist(run, projectRoot);

      if (!ok) {
        run.status = "failed";
        await persist(run, projectRoot);
        return;
      }
    } catch (err: any) {
      stage.log.push(`error: ${err?.message ?? String(err)}`);
      stage.status = "failed";
      stage.endedAt = new Date().toISOString();
      run.status = "failed";
      run.error = err?.message ?? String(err);
      await persist(run, projectRoot);
      return;
    }
  }

  run.status = "passed";
  await persist(run, projectRoot);
}

async function runDryStage(stage: RunStage): Promise<boolean> {
  const def = STAGE_DEFS.find((d) => d.id === stage.id)!;
  for (const line of def.dry.log) {
    await sleep(500 + Math.floor(Math.random() * 500));
    stage.log.push(line);
  }
  stage.summary = def.dry.summary;
  return true;
}

// ---- live execution --------------------------------------------------------

interface LiveCtx {
  branch: string;
  base: string;
  touched: boolean;
}

function sh(cmd: string, args: string[], cwd: string, timeoutMs = 20_000) {
  return capture(cmd, args, { cwd, timeoutMs });
}

async function runLiveStage(run: Run, stage: RunStage, ctx: LiveCtx, projectRoot: string): Promise<boolean> {
  const plan = await readPlan(run.slug, projectRoot);
  if (!plan) {
    stage.log.push("plan disappeared");
    return false;
  }
  const recipe = await readCachedRecipe(run.slug, projectRoot);

  switch (stage.id) {
    case "architect": {
      stage.log.push("Asking Claude to map the code and confirm the approach…");
      const res = await runClaude(
        `You are the Architect. Read the approved plan below and the current repo. Produce a SHORT implementation brief: the files you'll touch, the order of edits, and any risk. Do NOT edit anything.\n\nPLAN: ${plan.title}\n\n${plan.content}`,
        { allowedTools: "Read,Grep,Glob", cwd: projectRoot, timeoutMs: 180_000 }
      );
      if (res.error) {
        stage.log.push(`claude unavailable: ${res.error}`);
        return false;
      }
      stage.summary = firstLines(res.stdout, 6);
      stage.log.push(res.stdout.slice(0, 4000));
      return true;
    }

    case "gate": {
      const approved = plan.approval?.status === "approved";
      stage.log.push(`Approval status: ${plan.approval?.status ?? "none"}`);
      stage.summary = approved ? "Gate open — plan is approved." : "Gate closed — plan not approved.";
      return approved;
    }

    case "builder": {
      // determine base branch, create the feature branch
      const cur = await sh("git", ["rev-parse", "--abbrev-ref", "HEAD"], projectRoot);
      ctx.base = cur.stdout.trim() || "main";
      stage.log.push(`Base branch: ${ctx.base}`);
      const co = await sh("git", ["checkout", "-B", ctx.branch], projectRoot);
      if (co.code !== 0) {
        stage.log.push(`git checkout failed: ${co.stderr.slice(0, 300)}`);
        return false;
      }
      stage.log.push(`On branch ${ctx.branch}. Implementing…`);
      const res = await runClaude(
        `You are the Builder. Implement the approved plan below in this repo. Make the smallest sensible diff, follow existing conventions, do not add unrelated changes. When done, stop.\n\nPLAN: ${plan.title}\n\n${plan.content}${
          recipe ? `\n\nRECIPE (execution order): ${recipe.recipe.execution_order.join(" | ")}` : ""
        }`,
        { allowedTools: "Read,Grep,Glob,Edit,Write,Bash", cwd: projectRoot, timeoutMs: 300_000 }
      );
      if (res.error) {
        stage.log.push(`claude unavailable: ${res.error}`);
        return false;
      }
      ctx.touched = true;
      stage.summary = firstLines(res.stdout, 4);
      stage.log.push(res.stdout.slice(0, 4000));
      const status = await sh("git", ["status", "--porcelain"], projectRoot);
      const changed = status.stdout.trim().split("\n").filter(Boolean).length;
      stage.log.push(`${changed} file(s) changed.`);
      return changed > 0;
    }

    case "medic": {
      const script = await pickScript(projectRoot);
      if (!script) {
        stage.log.push("No build/test/type-check script found — skipping verification.");
        stage.summary = "No verify script; skipped.";
        stage.status = "skipped";
        return true;
      }
      stage.log.push(`Running: npm run ${script}`);
      let res = await sh("npm", ["run", script], projectRoot, 240_000);
      if (res.code === 0) {
        stage.summary = `npm run ${script} passed.`;
        return true;
      }
      // one bounded self-heal pass
      stage.log.push(`Failed. Asking Medic to self-heal once…`);
      const errTail = (res.stdout + res.stderr).slice(-3000);
      const heal = await runClaude(
        `You are the Medic. The command \`npm run ${script}\` failed. Fix the code so it passes. Error output:\n\n${errTail}`,
        { allowedTools: "Read,Grep,Glob,Edit,Write,Bash", cwd: projectRoot, timeoutMs: 240_000 }
      );
      stage.log.push(heal.stdout?.slice(0, 2000) || heal.error || "");
      res = await sh("npm", ["run", script], projectRoot, 240_000);
      stage.summary = res.code === 0 ? `Healed — npm run ${script} passes.` : `Still failing after one heal.`;
      return res.code === 0;
    }

    case "qa": {
      const diff = await sh("git", ["--no-pager", "diff", `${ctx.base}...HEAD`], projectRoot, 15_000);
      const res = await runClaude(
        `You are the Reviewer. Review this diff for correctness, regressions, and dead code. Be concise; list blocking issues only.\n\n${diff.stdout.slice(0, 12000)}`,
        { allowedTools: "Read,Grep,Glob", cwd: projectRoot, timeoutMs: 180_000 }
      );
      stage.summary = firstLines(res.stdout, 5) || "Reviewed.";
      stage.log.push(res.stdout?.slice(0, 4000) || res.error || "");
      return true; // review is advisory, never blocks
    }

    case "security": {
      const diff = await sh("git", ["--no-pager", "diff", `${ctx.base}...HEAD`], projectRoot, 15_000);
      const res = await runClaude(
        `You are the Security reviewer. Scan this diff for injection, secret leakage, auth/authz gaps, and unsafe input handling. List concrete findings only.\n\n${diff.stdout.slice(0, 12000)}`,
        { allowedTools: "Read,Grep,Glob", cwd: projectRoot, timeoutMs: 180_000 }
      );
      stage.summary = firstLines(res.stdout, 5) || "No findings.";
      stage.log.push(res.stdout?.slice(0, 4000) || res.error || "");
      return true; // advisory
    }

    case "pr": {
      await sh("git", ["add", "-A"], projectRoot);
      const commit = await sh("git", ["commit", "-m", `feat: ${plan.title} (via Adeptly Crew)`], projectRoot);
      stage.log.push(commit.code === 0 ? "Committed." : `Nothing to commit or commit failed: ${commit.stderr.slice(0, 200)}`);
      const push = await sh("git", ["push", "-u", "origin", ctx.branch], projectRoot, 60_000);
      if (push.code !== 0) {
        stage.log.push(`push failed (auth?): ${push.stderr.slice(0, 300)}`);
        stage.summary = `Branch ${ctx.branch} committed locally. Push/PR needs git credentials.`;
        stage.status = "skipped";
        return true;
      }
      stage.log.push(`Pushed ${ctx.branch}.`);
      // Try gh first, then note manual PR
      const gh = await sh("gh", ["pr", "create", "--fill", "--head", ctx.branch, "--base", ctx.base], projectRoot, 60_000);
      if (gh.code === 0) {
        const url = (gh.stdout.match(/https?:\/\/\S+/) || [])[0];
        run.prUrl = url;
        stage.summary = url ? `PR opened: ${url}` : "PR opened.";
        stage.log.push(gh.stdout.slice(0, 500));
      } else {
        stage.summary = `Branch pushed. Open a PR for ${ctx.branch} → ${ctx.base}.`;
        stage.log.push("gh CLI not available or PR create failed; branch is pushed and ready.");
      }
      run.branch = ctx.branch;
      return true;
    }

    default:
      return true;
  }
}

async function pickScript(projectRoot: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, "package.json"), "utf-8");
    const scripts = (JSON.parse(raw).scripts ?? {}) as Record<string, string>;
    for (const s of ["type-check", "test", "build", "lint"]) {
      if (scripts[s]) return s;
    }
  } catch {}
  return null;
}

function firstLines(text: string, n: number): string {
  return (text || "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, n)
    .join(" ")
    .slice(0, 400);
}
