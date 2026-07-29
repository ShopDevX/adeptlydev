import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { getRun, cancelRun } from "@/lib/crew";

export const dynamic = "force-dynamic";

// GET /api/runs/<id>?slug=<plan>&projectRoot=<path> — poll a run's live state
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    const run = await getRun(slug, params.id, projectRoot);
    if (!run) return NextResponse.json({ error: "run not found" }, { status: 404 });
    return NextResponse.json({ run });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

// POST /api/runs/<id> { action: "cancel", slug } — cancel an in-flight run
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json().catch(() => ({}));
    const slug = (body?.slug as string) || req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    if (body?.action === "cancel") {
      const run = await cancelRun(slug, params.id, projectRoot);
      if (!run) return NextResponse.json({ error: "run not found" }, { status: 404 });
      return NextResponse.json({ run });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
