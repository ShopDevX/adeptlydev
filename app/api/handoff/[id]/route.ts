import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { readHandoff, deleteHandoff, handoffResumePrompt } from "@/lib/handoff";

export const dynamic = "force-dynamic";

// GET /api/handoff/[id] — one note + its paste-ready resume prompt
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const note = await readHandoff(params.id, projectRoot);
    if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ note, resumePrompt: handoffResumePrompt(note) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

// DELETE /api/handoff/[id] — remove a note
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const ok = await deleteHandoff(params.id, projectRoot);
    return NextResponse.json({ ok });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
