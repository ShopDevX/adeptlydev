import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { getEffectiveCatalogue, getCustomIds } from "@/lib/feature-catalogue";

export const dynamic = "force-dynamic";

// GET /api/features?projectRoot=<path> — effective catalogue (built-in + local)
export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const [features, customIds] = await Promise.all([
      getEffectiveCatalogue(projectRoot),
      getCustomIds(projectRoot),
    ]);
    return NextResponse.json({ features, customIds });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
