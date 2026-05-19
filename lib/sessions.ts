import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { SessionSummary } from "./types";

/**
 * Reads Claude Code session transcripts from ~/.claude/projects/<project-slug>/*.jsonl.
 * The project-slug for a path like C:\xampp8\htdocs\adeptly is encoded as
 * "C--xampp8-htdocs-adeptly". We derive it from the current cwd and look there first,
 * then fall back to listing the most-recently-modified sessions across all projects.
 */

function pathToProjectSlug(p: string): string {
  return p.replace(/[\\:/]+/g, "-").replace(/^-+/, "");
}

function claudeProjectsRoot(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export async function listRecentSessions(limit = 10, cwd = process.cwd()): Promise<SessionSummary[]> {
  const slug = pathToProjectSlug(cwd);
  const projectsRoot = claudeProjectsRoot();
  const candidateDirs: string[] = [];

  const projectDir = path.join(projectsRoot, slug);
  try {
    await fs.access(projectDir);
    candidateDirs.push(projectDir);
  } catch {
    // No exact match for cwd — fall back to all project dirs
  }

  if (candidateDirs.length === 0) {
    try {
      const allDirs = await fs.readdir(projectsRoot);
      for (const d of allDirs) {
        const full = path.join(projectsRoot, d);
        const stat = await fs.stat(full);
        if (stat.isDirectory()) candidateDirs.push(full);
      }
    } catch {
      return [];
    }
  }

  const summaries: SessionSummary[] = [];
  for (const dir of candidateDirs) {
    let files: string[] = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }
    for (const f of files) {
      const full = path.join(dir, f);
      const summary = await readSessionSummary(full);
      if (summary) summaries.push(summary);
    }
  }

  summaries.sort((a, b) => b.lastTurnAt.localeCompare(a.lastTurnAt));
  return summaries.slice(0, limit);
}

async function readSessionSummary(filePath: string): Promise<SessionSummary | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return null;

    let firstUserMessage = "";
    let startedAt = "";
    let lastTurnAt = "";
    let cwd: string | undefined;
    let turnCount = 0;

    for (const line of lines) {
      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      turnCount += 1;
      const ts = obj.timestamp || obj.created_at || obj.ts;
      if (ts) {
        if (!startedAt) startedAt = ts;
        lastTurnAt = ts;
      }
      if (!cwd && obj.cwd) cwd = obj.cwd;
      if (!firstUserMessage) {
        const role = obj.role || obj.type;
        const content = obj.content || obj.message;
        if (role === "user" && typeof content === "string") {
          firstUserMessage = content.slice(0, 120);
        } else if (Array.isArray(content)) {
          const textPart = content.find((c: any) => c?.type === "text" && typeof c?.text === "string");
          if (textPart) firstUserMessage = textPart.text.slice(0, 120);
        }
      }
    }

    const filename = path.basename(filePath);
    const id = filename.replace(/\.jsonl$/, "");

    return {
      id,
      filename,
      startedAt: startedAt || "",
      lastTurnAt: lastTurnAt || startedAt || "",
      firstUserMessage: firstUserMessage || "(no user message captured)",
      turnCount,
      cwd,
    };
  } catch {
    return null;
  }
}
