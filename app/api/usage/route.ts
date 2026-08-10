import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { readUsage, summarizeUsage } from "@/lib/usage-ledger";
import { readAccountUsage } from "@/lib/account-usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // scanning many transcripts can take a moment

// GET /api/usage?projectRoot=<path>&days=<n>&scope=adeptly|account
//   scope=adeptly (default): Adeptly's own metered calls (exact cost)
//   scope=account: whole-machine Claude Code usage parsed from ~/.claude (est. cost)
export async function GET(req: NextRequest) {
  try {
    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam ? Number(daysParam) : undefined;
    const sinceMs = days && days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : undefined;
    const scope = req.nextUrl.searchParams.get("scope") === "account" ? "account" : "adeptly";

    if (scope === "account") {
      const account = await readAccountUsage(sinceMs);
      return NextResponse.json({ scope, account });
    }

    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const entries = await readUsage(projectRoot, sinceMs);
    const summary = summarizeUsage(entries);
    const recent = entries.slice(-25).reverse();
    return NextResponse.json({ scope, summary, recent });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
