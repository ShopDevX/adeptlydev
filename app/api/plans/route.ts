import { NextRequest, NextResponse } from "next/server";
import { listPlans } from "@/lib/plans";
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
