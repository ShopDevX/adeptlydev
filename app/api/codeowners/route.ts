import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveProjectRoot } from "@/lib/projects";

export const dynamic = "force-dynamic";

const CANDIDATE_PATHS = [
  ".github/CODEOWNERS",
  "CODEOWNERS",
  "docs/CODEOWNERS",
];

/**
 * Returns the unique set of GitHub usernames mentioned in CODEOWNERS.
 * We don't try to map paths to rules — just gather everyone the repo
 * considers an owner so the reviewer picker can offer them as one-click
 * suggestions.
 *
 * Returns an empty list if no CODEOWNERS file exists or no usernames are
 * found. Never throws.
 */
export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    let content: string | null = null;
    let foundPath: string | null = null;
    for (const rel of CANDIDATE_PATHS) {
      try {
        content = await fs.readFile(path.join(projectRoot, rel), "utf-8");
        foundPath = rel;
        break;
      } catch {
        // try next candidate
      }
    }
    if (!content) {
      return NextResponse.json({ owners: [], source: null });
    }
    const owners = new Set<string>();
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.split("#")[0].trim(); // strip comments
      if (!line) continue;
      // Each token after the path glob is either @user or @org/team.
      // We only want @users for now (team mentions need a GH API call).
      const tokens = line.split(/\s+/).slice(1);
      for (const t of tokens) {
        if (!t.startsWith("@")) continue;
        const handle = t.slice(1);
        if (handle.includes("/")) continue; // skip org/team
        // Stay paranoid about pathological input
        if (/^[a-zA-Z0-9_-]+$/.test(handle)) owners.add(handle);
      }
    }
    return NextResponse.json({
      owners: Array.from(owners).sort(),
      source: foundPath,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
