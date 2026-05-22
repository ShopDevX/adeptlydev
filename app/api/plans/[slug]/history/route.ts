import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { resolveProjectRoot } from "@/lib/projects";
import { getPlansDir } from "@/lib/plans";
import { getPlanHistory } from "@/lib/git";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const slug = params.slug;
    const dir = getPlansDir(projectRoot);
    const filename = `${slug}.md`;
    const rel = path.relative(projectRoot, path.join(dir, filename)).replace(/\\/g, "/");
    const history = await getPlanHistory(projectRoot, rel, 30);
    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
