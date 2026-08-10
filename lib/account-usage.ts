import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Whole-account Claude Code usage — parsed from the local transcripts Claude
 * Code writes under ~/.claude/projects/<slug>/*.jsonl. Unlike the Adeptly
 * ledger (which meters only Adeptly's own calls and has exact cost from the
 * CLI), this covers EVERY Claude Code session on this machine — but the
 * transcripts record tokens, not cost, so the dollar figure here is an
 * ESTIMATE from a per-model price table. Tokens are exact; cost is approximate.
 *
 * 100% local: it only reads files already on disk. Nothing is sent anywhere.
 */

// Approx public per-MTok prices (USD). Cache read ~0.1x input, cache write ~1.25x.
// Kept intentionally simple and labelled as an estimate in the UI.
interface Price {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}
const PRICES: Record<string, Price> = {
  opus: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  sonnet: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  haiku: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1.0 },
  fable: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  default: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
};

function priceFor(model: string): Price {
  const m = (model || "").toLowerCase();
  if (m.includes("opus")) return PRICES.opus;
  if (m.includes("sonnet")) return PRICES.sonnet;
  if (m.includes("haiku")) return PRICES.haiku;
  if (m.includes("fable")) return PRICES.fable;
  return PRICES.default;
}

function estimateCost(model: string, u: TokenBucket): number {
  const p = priceFor(model);
  return (
    (u.input * p.input +
      u.output * p.output +
      u.cacheRead * p.cacheRead +
      u.cacheWrite * p.cacheWrite) /
    1_000_000
  );
}

interface TokenBucket {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

function emptyBucket(): TokenBucket {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
}

export interface AccountModelUsage {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  estCostUsd: number;
  messages: number;
}

export interface AccountUsageSummary {
  totalEstCostUsd: number;
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCacheWrite: number;
  cacheHitPct: number;
  messages: number;
  sessions: number;
  byModel: AccountModelUsage[];
  /** cost per UTC day, oldest→newest, for a sparkline */
  daily: Array<{ day: string; estCostUsd: number }>;
  scannedProjects: number;
  since?: string;
  note: string;
}

function claudeProjectsDir(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

/**
 * Walk every transcript, summing token usage by model. `sinceMs` bounds by the
 * assistant message timestamp. Best-effort: unreadable files/lines are skipped.
 */
export async function readAccountUsage(sinceMs?: number): Promise<AccountUsageSummary> {
  const root = claudeProjectsDir();
  let projects: string[] = [];
  try {
    projects = await fs.readdir(root);
  } catch {
    return emptySummary();
  }

  const perModel = new Map<string, AccountModelUsage>();
  const perDay = new Map<string, number>();
  let messages = 0;
  let sessions = 0;
  let scannedProjects = 0;

  for (const proj of projects) {
    const dir = path.join(root, proj);
    let files: string[];
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    scannedProjects += 1;
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      sessions += 1;
      let raw: string;
      try {
        raw = await fs.readFile(path.join(dir, f), "utf-8");
      } catch {
        continue;
      }
      for (const line of raw.split(/\r?\n/)) {
        if (!line.trim()) continue;
        let o: any;
        try {
          o = JSON.parse(line);
        } catch {
          continue;
        }
        const u = o?.message?.usage;
        if (!u || o.type !== "assistant") continue;
        const model = o.message.model || "unknown";
        // Skip synthetic/non-API messages — they carry no real spend.
        if (model === "<synthetic>" || model === "unknown") continue;
        const ts = o.timestamp ? Date.parse(o.timestamp) : NaN;
        if (sinceMs && !isNaN(ts) && ts < sinceMs) continue;
        const bucket: TokenBucket = {
          input: Number(u.input_tokens ?? 0),
          output: Number(u.output_tokens ?? 0),
          cacheRead: Number(u.cache_read_input_tokens ?? 0),
          cacheWrite: Number(u.cache_creation_input_tokens ?? 0),
        };
        const cost = estimateCost(model, bucket);

        const entry =
          perModel.get(model) ??
          ({ model, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, estCostUsd: 0, messages: 0 } as AccountModelUsage);
        entry.input += bucket.input;
        entry.output += bucket.output;
        entry.cacheRead += bucket.cacheRead;
        entry.cacheWrite += bucket.cacheWrite;
        entry.estCostUsd += cost;
        entry.messages += 1;
        perModel.set(model, entry);

        messages += 1;
        if (!isNaN(ts)) {
          const day = new Date(ts).toISOString().slice(0, 10);
          perDay.set(day, (perDay.get(day) ?? 0) + cost);
        }
      }
    }
  }

  const totals = emptyBucket();
  let totalEstCostUsd = 0;
  for (const m of perModel.values()) {
    totals.input += m.input;
    totals.output += m.output;
    totals.cacheRead += m.cacheRead;
    totals.cacheWrite += m.cacheWrite;
    totalEstCostUsd += m.estCostUsd;
  }
  const cacheDenom = totals.cacheRead + totals.input;
  const daily = [...perDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, estCostUsd]) => ({ day, estCostUsd }));

  return {
    totalEstCostUsd,
    totalInput: totals.input,
    totalOutput: totals.output,
    totalCacheRead: totals.cacheRead,
    totalCacheWrite: totals.cacheWrite,
    cacheHitPct: cacheDenom > 0 ? Math.round((totals.cacheRead / cacheDenom) * 100) : 0,
    messages,
    sessions,
    byModel: [...perModel.values()].sort((a, b) => b.estCostUsd - a.estCostUsd),
    daily: daily.slice(-30),
    scannedProjects,
    since: sinceMs ? new Date(sinceMs).toISOString() : undefined,
    note: "Estimated from local transcripts (~/.claude). Tokens are exact; cost is approximate from public per-model rates.",
  };
}

function emptySummary(): AccountUsageSummary {
  return {
    totalEstCostUsd: 0,
    totalInput: 0,
    totalOutput: 0,
    totalCacheRead: 0,
    totalCacheWrite: 0,
    cacheHitPct: 0,
    messages: 0,
    sessions: 0,
    byModel: [],
    daily: [],
    scannedProjects: 0,
    note: "No Claude Code transcripts found under ~/.claude/projects.",
  };
}
