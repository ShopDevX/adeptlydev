import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { readUsage, summarizeUsage } from "@/lib/usage-ledger";

export const dynamic = "force-dynamic";

// GET /api/usage?projectRoot=<path>&days=<n> — Adeptly's local claude-spend ledger
export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam ? Number(daysParam) : undefined;
    const sinceMs = days && days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : undefined;

    const entries = await readUsage(projectRoot, sinceMs);
    const summary = summarizeUsage(entries);
    // Return the most recent calls (already chronological in the file; newest last)
    const recent = entries.slice(-25).reverse();
    return NextResponse.json({ summary, recent });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
