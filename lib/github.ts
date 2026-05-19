import fs from "node:fs/promises";
import path from "node:path";
import type { GitHubInfo, GitHubCollaborator } from "./types";

/**
 * GitHub integration. Two responsibilities:
 *  1. Detect the GitHub remote of a project (from .git/config).
 *  2. Fetch collaborators / contributors via the public GitHub API.
 *
 * Auth: if GITHUB_TOKEN is set in env, we use it for the collaborators
 * endpoint (private repos + full collaborator list). Otherwise we fall
 * back to the public contributors endpoint which doesn't require auth
 * but only shows people who have commits.
 */

interface GitConfigRemote {
  url: string;
  name: string;
}

async function readGitRemotes(projectRoot: string): Promise<GitConfigRemote[]> {
  const configPath = path.join(projectRoot, ".git", "config");
  let raw: string;
  try {
    raw = await fs.readFile(configPath, "utf-8");
  } catch {
    return [];
  }
  // Naive parser: look for [remote "<name>"] then url = <value>
  const remotes: GitConfigRemote[] = [];
  const lines = raw.split(/\r?\n/);
  let currentName: string | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const remoteMatch = line.match(/^\[remote\s+"([^"]+)"\]$/);
    if (remoteMatch) {
      currentName = remoteMatch[1];
      continue;
    }
    if (line.startsWith("[")) {
      currentName = null;
      continue;
    }
    if (currentName) {
      const urlMatch = line.match(/^url\s*=\s*(.+)$/);
      if (urlMatch) remotes.push({ name: currentName, url: urlMatch[1].trim() });
    }
  }
  return remotes;
}

function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  // Supports https://github.com/owner/repo(.git), git@github.com:owner/repo(.git),
  // ssh://git@github.com/owner/repo(.git)
  let m =
    url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i) ||
    url.match(/^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i) ||
    url.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function fetchCollaborators(
  owner: string,
  repo: string
): Promise<{ collaborators: GitHubCollaborator[]; error?: string }> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "Adeptly",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  // Prefer /collaborators when authenticated, fall back to /contributors
  const url = token
    ? `https://api.github.com/repos/${owner}/${repo}/collaborators?per_page=30`
    : `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=30`;

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { collaborators: [], error: `GitHub ${res.status}: ${body.slice(0, 200)}` };
    }
    const data: any[] = await res.json();
    const collaborators: GitHubCollaborator[] = data.map((u) => ({
      login: u.login,
      avatarUrl: u.avatar_url,
      htmlUrl: u.html_url,
      contributions: typeof u.contributions === "number" ? u.contributions : undefined,
    }));
    return { collaborators };
  } catch (err: any) {
    return { collaborators: [], error: err?.message ?? String(err) };
  }
}

export async function readGitHubInfo(projectRoot: string): Promise<GitHubInfo | null> {
  const remotes = await readGitRemotes(projectRoot);
  if (remotes.length === 0) return null;
  // Prefer "origin" if present
  const origin = remotes.find((r) => r.name === "origin") ?? remotes[0];
  const parsed = parseGitHubRemote(origin.url);
  if (!parsed) return null;
  const { collaborators, error } = await fetchCollaborators(parsed.owner, parsed.repo);
  return {
    owner: parsed.owner,
    repo: parsed.repo,
    remoteUrl: origin.url,
    collaborators,
    collaboratorsError: error,
  };
}
