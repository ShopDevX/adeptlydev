import { NextRequest, NextResponse } from "next/server";
import { readPlan, writePlan, detectDeclaredChanges } from "@/lib/plans";
import { resolveProjectRoot } from "@/lib/projects";
import { suggestFeatures } from "@/lib/feature-suggestions";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const plan = await readPlan(params.slug, projectRoot);
    if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });
    const changes = await detectDeclaredChanges(plan.content, projectRoot);
    const suggestions = suggestFeatures(plan.content);
    return NextResponse.json({ plan, changes, suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json();
    const content = typeof body?.content === "string" ? body.content : "";
    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });
    await writePlan(params.slug, content, projectRoot);
    const plan = await readPlan(params.slug, projectRoot);
    const changes = plan ? await detectDeclaredChanges(plan.content, projectRoot) : [];
    const suggestions = plan ? suggestFeatures(plan.content) : [];
    return NextResponse.json({ plan, changes, suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
