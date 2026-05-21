import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Git integration for the multi-dev adoption story.
 *
 * The cheapest way to tell "who's working on what" across a team of 3-5
 * Claude Code users in the same repo is to surface the git status of each
 * plan: last commit author/email/date + whether the file is dirty
 * (modified locally), untracked, or in sync with the index.
 *
 * No GitHub API required — pure local `git` calls. The server runs the
 * commands inside the project root that the user opened.
 */

export interface GitPlanInfo {
  lastAuthor: string | null;
  lastEmail: string | null;
  lastDate: string | null;
  lastHash: string | null;
  /** True if the file has uncommitted changes. */
  dirty: boolean;
  /** True if the file isn't tracked by git at all. */
  untracked: boolean;
  /** True if the file is currently staged for commit. */
  staged: boolean;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function run(cmd: string, args: string[], cwd: string, timeoutMs = 4000): Promise<SpawnResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let resolved = false;
    const finish = (code: number | null) => {
      if (resolved) return;
      resolved = true;
      resolve({ stdout, stderr, code });
    };
    const child = spawn(cmd, args, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    child.on("error", () => finish(null));
    child.stdout?.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr?.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("close", (code) => finish(code));
    setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
      finish(null);
    }, timeoutMs);
  });
}

async function isGitRepo(projectRoot: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectRoot, ".git"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get git info for a single file (relative to projectRoot). Returns null
 * if the project isn't a git repo at all.
 */
export async function getGitPlanInfo(
  projectRoot: string,
  fileRelPath: string
): Promise<GitPlanInfo | null> {
  if (!(await isGitRepo(projectRoot))) return null;

  const info: GitPlanInfo = {
    lastAuthor: null,
    lastEmail: null,
    lastDate: null,
    lastHash: null,
    dirty: false,
    untracked: false,
    staged: false,
  };

  // Last commit touching this file
  const log = await run(
    "git",
    ["log", "-1", "--format=%an%x00%ae%x00%aI%x00%H", "--", fileRelPath],
    projectRoot
  );
  if (log.code === 0 && log.stdout.trim()) {
    const [author, email, date, hash] = log.stdout.trim().split("\x00");
    info.lastAuthor = author || null;
    info.lastEmail = email || null;
    info.lastDate = date || null;
    info.lastHash = hash || null;
  }

  // Current status — porcelain format
  // Output examples:
  //   " M file.md"   = modified, not staged
  //   "M  file.md"   = modified, staged
  //   "?? file.md"   = untracked
  //   "MM file.md"   = staged + further modified
  //   ""             = clean
  const status = await run(
    "git",
    ["status", "--porcelain=v1", "--", fileRelPath],
    projectRoot
  );
  if (status.code === 0 && status.stdout) {
    const line = status.stdout.split(/\r?\n/)[0] || "";
    if (line.startsWith("??")) {
      info.untracked = true;
    } else {
      const indexCh = line[0] || " ";
      const treeCh = line[1] || " ";
      if (indexCh !== " " && indexCh !== "?") info.staged = true;
      if (treeCh !== " " && treeCh !== "?") info.dirty = true;
    }
  }

  return info;
}

/**
 * Get git info for many files in parallel. Used by the plans-list endpoint.
 */
export async function getGitInfoForPlans(
  projectRoot: string,
  relPaths: string[]
): Promise<Record<string, GitPlanInfo | null>> {
  if (!(await isGitRepo(projectRoot))) {
    return Object.fromEntries(relPaths.map((p) => [p, null]));
  }
  const results = await Promise.all(
    relPaths.map(async (p) => [p, await getGitPlanInfo(projectRoot, p)] as const)
  );
  return Object.fromEntries(results);
}

// formatRelative moved to lib/format-time.ts (client-safe)
