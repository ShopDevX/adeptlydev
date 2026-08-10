import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { listHandoffs, writeHandoff } from "@/lib/handoff";

export const dynamic = "force-dynamic";

// GET /api/handoff?projectRoot=<path> — list handoff notes
export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const notes = await listHandoffs(projectRoot);
    return NextResponse.json({ notes });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

// POST /api/handoff { title, body, planSlug?, branch?, id? } — create/update a note
export async function POST(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json().catch(() => ({}));
    const title = (body?.title as string | undefined)?.trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    const note = await writeHandoff(
      {
        title,
        body: (body?.body as string) ?? "",
        planSlug: body?.planSlug || undefined,
        branch: body?.branch || undefined,
        id: body?.id || undefined,
        now: new Date().toISOString(),
      },
      projectRoot
    );
    return NextResponse.json({ note });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
