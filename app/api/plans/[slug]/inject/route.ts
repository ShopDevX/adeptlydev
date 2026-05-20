import { NextRequest, NextResponse } from "next/server";
import { injectIntoSection, readPlan, detectDeclaredChanges } from "@/lib/plans";
import { resolveProjectRoot } from "@/lib/projects";
import { suggestFeatures } from "@/lib/feature-suggestions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json();
    const sectionHint = (body?.section_hint as string | undefined)?.trim();
    const content = (body?.content as string | undefined)?.trim();
    if (!sectionHint || !content) {
      return NextResponse.json(
        { error: "section_hint and content are required" },
        { status: 400 }
      );
    }

    const { sectionMatched } = await injectIntoSection(
      params.slug,
      sectionHint,
      content,
      projectRoot
    );

    // Return the updated plan so the client can refresh in one round-trip
    const plan = await readPlan(params.slug, projectRoot);
    const changes = plan ? await detectDeclaredChanges(plan.content, projectRoot) : [];
    const suggestions = plan ? suggestFeatures(plan.content) : [];

    return NextResponse.json({
      plan,
      changes,
      suggestions,
      sectionMatched,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
