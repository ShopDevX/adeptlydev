import { NextRequest, NextResponse } from "next/server";
import { readGitHubInfo } from "@/lib/github";
import { resolveProjectRoot } from "@/lib/projects";

export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const github = await readGitHubInfo(projectRoot);
    return NextResponse.json({ github });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
