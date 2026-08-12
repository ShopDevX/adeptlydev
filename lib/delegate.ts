import fs from "node:fs/promises";
import path from "node:path";
import { getProjectRoot, readPlan } from "./plans";
import { runClaude } from "./claude-cli";
import { extractJsonArray } from "./llm-json";
import { getAgreement, wrapWithAgreement } from "./agreement";

/**
 * Delegate — split an approved plan into independent, guard-railed subtasks so
 * you can run them across parallel Claude Code sessions without them stepping on
 * each other or applying inconsistent rigor.
 *
 * Each subtask declares the files it will touch, so Adeptly can flag collisions
 * and tell every session which files are OFF-LIMITS (owned by another lane).
 * Each brief carries the Working Agreement, so the driver session runs the same
 * pre-flight checks as the delegated one. State lives in `.adeptly/delegate/`.
 */

export type SubtaskStatus = "todo" | "in-progress" | "done";

export interface Subtask {
  id: string; // s1, s2, …
  title: string;
  scope: string;
  files: string[]; // files/areas this subtask will touch
  dependsOn: string[]; // subtask ids that must complete first
  status: SubtaskStatus;
}

export interface DelegateBoard {
  slug: string;
  planTitle: string;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
}

export interface Collision {
  file: string;
  subtaskIds: string[];
}

function boardPath(slug: string, projectRoot: string): string {
  return path.join(projectRoot, ".adeptly", "delegate", `${slug}.json`);
}

export async function readBoard(slug: string, projectRoot = getProjectRoot()): Promise<DelegateBoard | null> {
  try {
    const raw = await fs.readFile(boardPath(slug, projectRoot), "utf-8");
    return JSON.parse(raw) as DelegateBoard;
  } catch {
    return null;
  }
}

async function writeBoard(board: DelegateBoard, projectRoot = getProjectRoot()): Promise<void> {
  const dir = path.dirname(boardPath(board.slug, projectRoot));
  await fs.mkdir(dir, { recursive: true });
  board.updatedAt = new Date().toISOString();
  await fs.writeFile(boardPath(board.slug, projectRoot), JSON.stringify(board, null, 2) + "\n", "utf-8");
}

/** Files touched by more than one subtask — the sessions would collide there. */
export function findCollisions(subtasks: Subtask[]): Collision[] {
  const byFile = new Map<string, string[]>();
  for (const s of subtasks) {
    for (const f of s.files || []) {
      const key = f.trim().toLowerCase();
      if (!key) continue;
      const arr = byFile.get(key) ?? [];
      if (!arr.includes(s.id)) arr.push(s.id);
      byFile.set(key, arr);
    }
  }
  const out: Collision[] = [];
  for (const [file, ids] of byFile) {
    if (ids.length > 1) out.push({ file, subtaskIds: ids });
  }
  return out;
}

function splitPrompt(planTitle: string, planContent: string, n: number): string {
  return `You are splitting an approved development plan into ${n} INDEPENDENT subtasks that different people (or parallel Claude Code sessions) can implement at the same time without colliding.

Rules:
- Divide by area/responsibility so subtasks touch DISJOINT files wherever possible.
- If two subtasks must share a file or one depends on another, record that in "dependsOn".
- Keep each subtask self-contained and concrete.

Respond with ONLY a JSON array (no prose, no fences), exactly ${n} elements:
[
  {
    "title": "<short subtask title>",
    "scope": "<2-3 sentences: what to build, boundaries>",
    "files": ["<relative/path/or/area it will touch>", "..."],
    "dependsOn": []   // titles or indices of subtasks that must finish first; usually empty
  }
]

PLAN: ${planTitle}

---

${planContent}

---

Return ONLY the JSON array of ${n} subtasks.`;
}

function coerce(item: any, i: number): Subtask | null {
  if (!item || typeof item !== "object") return null;
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const scope = typeof item.scope === "string" ? item.scope.trim() : "";
  if (!title) return null;
  const files = Array.isArray(item.files) ? item.files.filter((f: any) => typeof f === "string" && f.trim()).map((f: string) => f.trim()) : [];
  const dependsOn = Array.isArray(item.dependsOn) ? item.dependsOn.filter((d: any) => typeof d === "string").map((d: string) => d.trim()) : [];
  return { id: `s${i + 1}`, title, scope, files, dependsOn, status: "todo" };
}

export interface SplitResult {
  board?: DelegateBoard;
  error?: string;
}

export async function splitPlan(slug: string, n: number, projectRoot = getProjectRoot()): Promise<SplitResult> {
  const plan = await readPlan(slug, projectRoot);
  if (!plan) return { error: "plan not found" };
  const count = Math.max(2, Math.min(6, Math.floor(n) || 2));

  const res = await runClaude(splitPrompt(plan.title, plan.content, count), { timeoutMs: 90_000 });
  if (res.error || (res.code !== 0 && !res.stdout)) {
    return { error: res.error || `claude exited with code ${res.code}` };
  }
  const parsed = extractJsonArray<any>(res.stdout);
  if (!parsed || parsed.length === 0) {
    return { error: "Claude did not return a JSON array of subtasks. Try again." };
  }
  const subtasks = parsed.map(coerce).filter(Boolean) as Subtask[];
  if (subtasks.length === 0) return { error: "No valid subtasks parsed." };

  // Normalise dependsOn: map any title/index references to subtask ids.
  const idByTitle = new Map(subtasks.map((s) => [s.title.toLowerCase(), s.id]));
  for (const s of subtasks) {
    s.dependsOn = (s.dependsOn || [])
      .map((d) => {
        const asIdx = parseInt(d, 10);
        if (!isNaN(asIdx) && asIdx >= 1 && asIdx <= subtasks.length) return `s${asIdx}`;
        return idByTitle.get(d.toLowerCase()) ?? "";
      })
      .filter((d) => d && d !== s.id);
  }

  const now = new Date().toISOString();
  const board: DelegateBoard = { slug, planTitle: plan.title, createdAt: now, updatedAt: now, subtasks };
  await writeBoard(board, projectRoot);
  return { board };
}

export async function setStatus(
  slug: string,
  subtaskId: string,
  status: SubtaskStatus,
  projectRoot = getProjectRoot()
): Promise<DelegateBoard | null> {
  const board = await readBoard(slug, projectRoot);
  if (!board) return null;
  const t = board.subtasks.find((s) => s.id === subtaskId);
  if (t) t.status = status;
  await writeBoard(board, projectRoot);
  return board;
}

/** Build a paste-ready brief for one subtask: scope + lanes + Working Agreement. */
export async function buildBrief(
  slug: string,
  subtaskId: string,
  projectRoot = getProjectRoot()
): Promise<string | null> {
  const board = await readBoard(slug, projectRoot);
  if (!board) return null;
  const me = board.subtasks.find((s) => s.id === subtaskId);
  if (!me) return null;
  const { text: agreement } = await getAgreement(projectRoot);

  const others = board.subtasks.filter((s) => s.id !== me.id);
  // A file that's also in my lane is contested (surfaced as a collision), not
  // off-limits — never tell a session to both edit and avoid the same file.
  const myFiles = new Set(me.files.map((f) => f.toLowerCase()));
  const otherFiles = [...new Set(others.flatMap((s) => s.files))].filter((f) => !myFiles.has(f.toLowerCase()));
  const deps = me.dependsOn
    .map((id) => board.subtasks.find((s) => s.id === id)?.title)
    .filter(Boolean);

  const lines: string[] = [];
  lines.push(`# Subtask: ${me.title}`);
  lines.push(``);
  lines.push(`Part of the plan "${board.planTitle}". You are one of ${board.subtasks.length} parallel sessions.`);
  lines.push(``);
  lines.push(`## Your scope`);
  lines.push(me.scope || me.title);
  if (me.files.length) {
    lines.push(``);
    lines.push(`## Your lane (edit ONLY these)`);
    me.files.forEach((f) => lines.push(`- ${f}`));
  }
  if (otherFiles.length) {
    lines.push(``);
    lines.push(`## Off-limits (other sessions own these — do not touch)`);
    otherFiles.forEach((f) => lines.push(`- ${f}`));
  }
  if (deps.length) {
    lines.push(``);
    lines.push(`## Depends on (make sure these are done first)`);
    deps.forEach((d) => lines.push(`- ${d}`));
  }

  return wrapWithAgreement(lines.join("\n"), agreement);
}
