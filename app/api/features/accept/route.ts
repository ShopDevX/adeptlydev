import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { addLocalFeatures } from "@/lib/feature-catalogue";
import type { ClaudeCodeFeature } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST /api/features/accept { features: ClaudeCodeFeature[] } — persist accepted features
export async function POST(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.features) ? (body.features as ClaudeCodeFeature[]) : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: "features array is required" }, { status: 400 });
    }
    const result = await addLocalFeatures(incoming, new Date().toISOString(), projectRoot);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
