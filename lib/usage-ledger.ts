import fs from "node:fs/promises";
import path from "node:path";
import { getProjectRoot } from "./plans";
import type { ClaudeUsage } from "./claude-cli";

/**
 * Local usage ledger — a plain append-only record of what Adeptly's OWN
 * `claude` calls cost. Written to `.adeptly/usage.jsonl` (gitignored, per repo).
 *
 * This is deliberately scoped and honest: it meters the calls Adeptly makes
 * (recipe, crew, feature-refresh), NOT your entire Claude bill. No telemetry —
 * the file never leaves your machine.
 */

export type UsageSource = "recipe" | "crew" | "refresh";

export interface UsageEntry {
  t: string; // ISO timestamp
  source: UsageSource;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  durationMs: number;
  /** optional context, e.g. the plan slug or crew stage id */
  ref?: string;
}

function ledgerPath(projectRoot: string): string {
  return path.join(projectRoot, ".adeptly", "usage.jsonl");
}

/** Record one call. Best-effort — metering must never break the actual work. */
export async function recordUsage(
  usage: ClaudeUsage | null,
  meta: { source: UsageSource; ref?: string; at: string },
  projectRoot = getProjectRoot()
): Promise<void> {
  if (!usage) return;
  const entry: UsageEntry = {
    t: meta.at,
    source: meta.source,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheCreationTokens: usage.cacheCreationTokens,
    costUsd: usage.costUsd,
    durationMs: usage.durationMs,
    ref: meta.ref,
  };
  try {
    const dir = path.join(projectRoot, ".adeptly");
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(ledgerPath(projectRoot), JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    /* best-effort */
  }
}

export async function readUsage(
  projectRoot = getProjectRoot(),
  sinceMs?: number
): Promise<UsageEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(ledgerPath(projectRoot), "utf-8");
  } catch {
    return [];
  }
  const entries: UsageEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as UsageEntry;
      if (sinceMs && Date.parse(e.t) < sinceMs) continue;
      entries.push(e);
    } catch {
      /* skip malformed line */
    }
  }
  return entries;
}

export interface UsageSummary {
  count: number;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  /** cache_read / (cache_read + fresh input), 0–100 */
  cacheHitPct: number;
  bySource: Array<{ source: string; count: number; costUsd: number }>;
  byModel: Array<{ model: string; count: number; costUsd: number }>;
  firstAt?: string;
  lastAt?: string;
}

export function summarizeUsage(entries: UsageEntry[]): UsageSummary {
  const bySource = new Map<string, { count: number; costUsd: number }>();
  const byModel = new Map<string, { count: number; costUsd: number }>();
  let totalCostUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;

  for (const e of entries) {
    totalCostUsd += e.costUsd || 0;
    inputTokens += e.inputTokens || 0;
    outputTokens += e.outputTokens || 0;
    cacheReadTokens += e.cacheReadTokens || 0;
    cacheCreationTokens += e.cacheCreationTokens || 0;

    const s = bySource.get(e.source) ?? { count: 0, costUsd: 0 };
    s.count += 1;
    s.costUsd += e.costUsd || 0;
    bySource.set(e.source, s);

    const m = byModel.get(e.model) ?? { count: 0, costUsd: 0 };
    m.count += 1;
    m.costUsd += e.costUsd || 0;
    byModel.set(e.model, m);
  }

  const cacheDenom = cacheReadTokens + inputTokens;
  const sorted = [...entries].sort((a, b) => a.t.localeCompare(b.t));

  return {
    count: entries.length,
    totalCostUsd,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    cacheHitPct: cacheDenom > 0 ? Math.round((cacheReadTokens / cacheDenom) * 100) : 0,
    bySource: [...bySource.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.costUsd - a.costUsd),
    byModel: [...byModel.entries()].map(([model, v]) => ({ model, ...v })).sort((a, b) => b.costUsd - a.costUsd),
    firstAt: sorted[0]?.t,
    lastAt: sorted[sorted.length - 1]?.t,
  };
}
