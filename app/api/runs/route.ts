import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { startRun, listRuns, type RunMode } from "@/lib/crew";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/runs?slug=<plan>&projectRoot=<path> — list runs for a plan
export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    const runs = await listRuns(slug, projectRoot);
    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

// POST /api/runs { slug, mode } — start a run (returns immediately; poll [id])
export async function POST(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json().catch(() => ({}));
    const slug = body?.slug as string | undefined;
    const mode = (body?.mode as RunMode) ?? "dry-run";
    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    if (mode !== "dry-run" && mode !== "live") {
      return NextResponse.json({ error: "mode must be 'dry-run' or 'live'" }, { status: 400 });
    }
    const { run, error } = await startRun(slug, mode, projectRoot);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ run });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
