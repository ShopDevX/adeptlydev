import { NextRequest, NextResponse } from "next/server";
import { listRecentSessions } from "@/lib/sessions";
import { resolveProjectRoot } from "@/lib/projects";

export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const sessions = await listRecentSessions(10, projectRoot);
    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
