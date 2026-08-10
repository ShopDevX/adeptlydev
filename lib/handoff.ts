import fs from "node:fs/promises";
import path from "node:path";
import { getProjectRoot } from "./plans";

/**
 * Session handoff — a tiny shared "note to the next session".
 *
 * Claude Code sessions can't talk to each other live: each `claude` process has
 * its own context. The practical bridge is a file both can read. A handoff note
 * captures what one session was doing (what's done, what's next, the branch,
 * the relevant plan) so another session — or you tomorrow — can resume without
 * rebuilding context from scratch. Stored as markdown under `.adeptly/handoff/`
 * (gitignored by default; commit them if you want to share across machines).
 */

const HANDOFF_DIR = ".adeptly/handoff";

export interface HandoffNote {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  planSlug?: string;
  branch?: string;
  /** freeform markdown: what's done, what's next, gotchas */
  body: string;
}

function dir(projectRoot: string): string {
  return path.join(projectRoot, HANDOFF_DIR);
}

function file(projectRoot: string, id: string): string {
  return path.join(dir(projectRoot), `${id}.json`);
}

function slugId(title: string): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "note";
  // Timestamp-free uniqueness is impossible without a clock; callers pass `now`.
  return base;
}

export async function listHandoffs(projectRoot = getProjectRoot()): Promise<HandoffNote[]> {
  let files: string[];
  try {
    files = await fs.readdir(dir(projectRoot));
  } catch {
    return [];
  }
  const notes: HandoffNote[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(dir(projectRoot), f), "utf-8");
      notes.push(JSON.parse(raw) as HandoffNote);
    } catch {
      /* skip malformed */
    }
  }
  notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return notes;
}

export async function readHandoff(id: string, projectRoot = getProjectRoot()): Promise<HandoffNote | null> {
  try {
    const raw = await fs.readFile(file(projectRoot, id), "utf-8");
    return JSON.parse(raw) as HandoffNote;
  } catch {
    return null;
  }
}

export interface WriteHandoffInput {
  title: string;
  body: string;
  planSlug?: string;
  branch?: string;
  /** ISO timestamp — passed in so this module stays clock-free/testable */
  now: string;
  /** update an existing note instead of creating a new one */
  id?: string;
}

export async function writeHandoff(
  input: WriteHandoffInput,
  projectRoot = getProjectRoot()
): Promise<HandoffNote> {
  await fs.mkdir(dir(projectRoot), { recursive: true });

  let id = input.id;
  let createdAt = input.now;
  if (id) {
    const existing = await readHandoff(id, projectRoot);
    if (existing) createdAt = existing.createdAt;
  } else {
    // derive a unique id from the title + a short time suffix
    const base = slugId(input.title);
    const suffix = input.now.replace(/[^0-9]/g, "").slice(-6);
    id = `${base}-${suffix}`;
  }

  const note: HandoffNote = {
    id,
    title: input.title.trim() || "Untitled handoff",
    createdAt,
    updatedAt: input.now,
    planSlug: input.planSlug,
    branch: input.branch,
    body: input.body,
  };
  await fs.writeFile(file(projectRoot, id), JSON.stringify(note, null, 2) + "\n", "utf-8");
  return note;
}

export async function deleteHandoff(id: string, projectRoot = getProjectRoot()): Promise<boolean> {
  try {
    await fs.unlink(file(projectRoot, id));
    return true;
  } catch {
    return false;
  }
}

/** Render a note as a paste-ready prompt for a fresh Claude Code session. */
export function handoffResumePrompt(note: HandoffNote): string {
  const bits = [
    `# Resuming work: ${note.title}`,
    "",
    "You are picking up from a previous Claude Code session. Here is the handoff context:",
    "",
  ];
  if (note.planSlug) bits.push(`- Related plan: \`docs/plans/${note.planSlug}.md\``);
  if (note.branch) bits.push(`- Working branch: \`${note.branch}\``);
  bits.push(`- Handed off: ${note.createdAt}`);
  bits.push("", "## Context", "", note.body.trim() || "(no details provided)", "");
  bits.push(
    "Read the related plan and branch first, confirm your understanding, then continue where the previous session left off. Ask before making large changes."
  );
  return bits.join("\n");
}
