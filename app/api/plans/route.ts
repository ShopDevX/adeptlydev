import { NextRequest, NextResponse } from "next/server";
import { listPlans, createPlan } from "@/lib/plans";
import { resolveProjectRoot } from "@/lib/projects";

export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const plans = await listPlans(projectRoot);
    const lite = plans.map(({ content, ...rest }) => rest);
    return NextResponse.json({ projectRoot, plans: lite });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json();
    const title = (body?.title as string | undefined)?.trim();
    const slug = (body?.slug as string | undefined)?.trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const created = await createPlan(title, projectRoot, slug);
    return NextResponse.json({ created });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: err?.message?.includes("already exists") ? 409 : 500 }
    );
  }
}
