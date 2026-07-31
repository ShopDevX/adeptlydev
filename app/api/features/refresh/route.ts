import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { discoverFeatures } from "@/lib/feature-refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // claude --print can take a while

// POST /api/features/refresh — ask the local claude CLI for features we don't have yet
export async function POST(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const result = await discoverFeatures(projectRoot);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
