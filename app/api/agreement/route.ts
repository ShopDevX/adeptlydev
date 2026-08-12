import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { getAgreement, setAgreement } from "@/lib/agreement";

export const dynamic = "force-dynamic";

// GET /api/agreement?projectRoot=<path> — the project's Working Agreement
export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const { text, custom } = await getAgreement(projectRoot);
    return NextResponse.json({ text, custom });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

// PUT /api/agreement { text } — save a custom Working Agreement
export async function PUT(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text : "";
    if (!text.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });
    await setAgreement(text, projectRoot);
    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
