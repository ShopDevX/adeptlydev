import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getPlansDir, getProjectRoot } from "./plans";
import { CLAUDE_CODE_FEATURES } from "./features";

export interface PlanRecipeSubagent {
  type: string;
  count: number;
  for: string;
}

export interface PlanRecipeSkill {
  name: string;
  when: string;
}

export interface PlanRecipeHook {
  type: string;
  for: string;
}

export interface PlanRecipe {
  start_with_plan_mode: boolean;
  subagents: PlanRecipeSubagent[];
  skills: PlanRecipeSkill[];
  hooks_to_consider: PlanRecipeHook[];
  expected_turns: number;
  estimated_cost_usd: number;
  execution_order: string[];
  rationale: string;
}

export interface PlanRecipeRecord {
  slug: string;
  inputHash: string;
  generatedAt: string;
  source: "claude-cli" | "fallback-keyword";
  recipe: PlanRecipe;
  rawOutput?: string;
  error?: string;
}

const RECIPE_DIR = "recipes";

export function getRecipesDir(projectRoot = getProjectRoot()): string {
  return path.join(getPlansDir(projectRoot), RECIPE_DIR);
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex").slice(0, 16);
}

export async function readCachedRecipe(
  slug: string,
  projectRoot = getProjectRoot()
): Promise<PlanRecipeRecord | null> {
  const file = path.join(getRecipesDir(projectRoot), `${slug}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as PlanRecipeRecord;
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

async function writeCachedRecipe(
  slug: string,
  record: PlanRecipeRecord,
  projectRoot = getProjectRoot()
): Promise<void> {
  const dir = getRecipesDir(projectRoot);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${slug}.json`);
  await fs.writeFile(file, JSON.stringify(record, null, 2) + "\n", "utf-8");
}

function buildPrompt(planTitle: string, planContent: string): string {
  // Compact feature catalogue (name + category + when-to-use only) to keep tokens down
  const catalogue = CLAUDE_CODE_FEATURES.map(
    (f) => `- ${f.name} (${f.category}): ${f.whenToUse}`
  ).join("\n");

  return `You are an expert at Claude Code. Given the development plan below, recommend the optimal Claude Code workflow to execute it.

You MUST respond with a single JSON object matching this exact schema (no markdown, no prose around it, JSON only):

{
  "start_with_plan_mode": boolean,
  "subagents": [
    { "type": "<subagent type name>", "count": <integer>, "for": "<one sentence on why>" }
  ],
  "skills": [
    { "name": "/<skill-name>", "when": "<one sentence on when to invoke>" }
  ],
  "hooks_to_consider": [
    { "type": "PreToolUse|PostToolUse|UserPromptSubmit|SessionStart|SessionEnd|Stop", "for": "<one sentence>" }
  ],
  "expected_turns": <integer estimate of how many Claude Code turns this plan will take>,
  "estimated_cost_usd": <number — your estimate at Haiku 4.5 rates of total LLM spend>,
  "execution_order": [
    "<numbered step describing the order of operations>"
  ],
  "rationale": "<2-3 sentences explaining the overall approach>"
}

Choose subagents only from this set: general-purpose, Explore, Plan, claude-code-guide, statusline-setup, code-reviewer, security-reviewer.

Choose skills only from this set: /init, /review, /security-review, /loop, /schedule, /help, /clear, /config, /memory.

Available Claude Code features and when to use them:
${catalogue}

The plan to analyse follows below the line.

PLAN TITLE: ${planTitle}

---

${planContent}

---

Return ONLY the JSON object. Do not wrap it in markdown fences. Do not explain.`;
}

function safeParseRecipe(raw: string): PlanRecipe | null {
  if (!raw) return null;
  // Strip code fences if Claude wraps anyway
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  // Find first { and last } in case there's any preamble
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return null;
  const slice = text.slice(first, last + 1);
  try {
    const parsed = JSON.parse(slice);
    // Minimal shape check
    if (
      typeof parsed?.start_with_plan_mode !== "boolean" ||
      !Array.isArray(parsed?.subagents) ||
      !Array.isArray(parsed?.skills) ||
      !Array.isArray(parsed?.hooks_to_consider) ||
      typeof parsed?.expected_turns !== "number" ||
      typeof parsed?.estimated_cost_usd !== "number" ||
      !Array.isArray(parsed?.execution_order)
    ) {
      return null;
    }
    return parsed as PlanRecipe;
  } catch {
    return null;
  }
}

async function callClaudeCli(prompt: string, timeoutMs = 90_000): Promise<{ stdout: string; stderr: string; code: number | null; error?: string }> {
  return new Promise((resolve) => {
    let resolved = false;
    let stdout = "";
    let stderr = "";

    // On Windows the binary is usually `claude.cmd`; on Unix it's `claude`.
    // child_process.spawn with `shell: true` lets us not care.
    const child = spawn("claude", ["--print"], {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    });

    const finish = (code: number | null, error?: string) => {
      if (resolved) return;
      resolved = true;
      resolve({ stdout, stderr, code, error });
    };

    child.on("error", (err) => finish(null, err.message));
    child.stdout?.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr?.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("close", (code) => finish(code));

    const t = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
      finish(null, `claude --print timed out after ${timeoutMs}ms`);
    }, timeoutMs);
    child.on("close", () => clearTimeout(t));

    try {
      child.stdin?.write(prompt);
      child.stdin?.end();
    } catch (err: any) {
      finish(null, err?.message ?? String(err));
    }
  });
}

function fallbackRecipe(): PlanRecipe {
  return {
    start_with_plan_mode: true,
    subagents: [
      { type: "Explore", count: 1, for: "Map the relevant code before any changes." },
      { type: "Plan", count: 1, for: "Draft the implementation plan." },
    ],
    skills: [
      { name: "/review", when: "Before merging the diff." },
    ],
    hooks_to_consider: [],
    expected_turns: 8,
    estimated_cost_usd: 0.2,
    execution_order: [
      "1. Enter Plan Mode and confirm approach.",
      "2. Spawn Explore subagent to map relevant code.",
      "3. Spawn Plan subagent for the design.",
      "4. Implement in the main session.",
      "5. Run /review before merge.",
    ],
    rationale:
      "Fallback recipe — Claude CLI was not available, so this is a generic safe default. Configure Claude Code (`claude` on PATH) to get a plan-specific recipe.",
  };
}

export async function generateRecipe(
  slug: string,
  planTitle: string,
  planContent: string,
  projectRoot = getProjectRoot()
): Promise<PlanRecipeRecord> {
  const inputHash = hashContent(planContent);
  const prompt = buildPrompt(planTitle, planContent);
  const result = await callClaudeCli(prompt);

  let record: PlanRecipeRecord;

  if (result.error || (result.code !== 0 && !result.stdout)) {
    // Treat as failure → fallback
    record = {
      slug,
      inputHash,
      generatedAt: new Date().toISOString(),
      source: "fallback-keyword",
      recipe: fallbackRecipe(),
      rawOutput: result.stdout || result.stderr || "",
      error: result.error || `claude exited with code ${result.code}`,
    };
  } else {
    const parsed = safeParseRecipe(result.stdout);
    if (parsed) {
      record = {
        slug,
        inputHash,
        generatedAt: new Date().toISOString(),
        source: "claude-cli",
        recipe: parsed,
        rawOutput: result.stdout,
      };
    } else {
      record = {
        slug,
        inputHash,
        generatedAt: new Date().toISOString(),
        source: "fallback-keyword",
        recipe: fallbackRecipe(),
        rawOutput: result.stdout,
        error: "Claude returned non-parseable JSON. Using fallback recipe.",
      };
    }
  }

  await writeCachedRecipe(slug, record, projectRoot);
  return record;
}

export function isStale(record: PlanRecipeRecord, currentContent: string): boolean {
  return record.inputHash !== hashContent(currentContent);
}
