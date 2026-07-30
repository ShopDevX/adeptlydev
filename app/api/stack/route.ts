import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { detectStack } from "@/lib/stack";

export const dynamic = "force-dynamic";

// GET /api/stack?projectRoot=<path> — detect the project's tech stack
export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const stack = await detectStack(projectRoot);
    return NextResponse.json({ stack });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
