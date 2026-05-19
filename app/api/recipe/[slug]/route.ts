import { NextRequest, NextResponse } from "next/server";
import { readPlan } from "@/lib/plans";
import { resolveProjectRoot } from "@/lib/projects";
import { generateRecipe, readCachedRecipe, isStale } from "@/lib/plan-recipe";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // seconds — claude --print can take a while

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const plan = await readPlan(params.slug, projectRoot);
    const cached = await readCachedRecipe(params.slug, projectRoot);
    const stale = cached && plan ? isStale(cached, plan.content) : false;
    return NextResponse.json({ record: cached, stale });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const plan = await readPlan(params.slug, projectRoot);
    if (!plan) {
      return NextResponse.json({ error: "plan not found" }, { status: 404 });
    }
    const record = await generateRecipe(params.slug, plan.title, plan.content, projectRoot);
    return NextResponse.json({ record, stale: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
