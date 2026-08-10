"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Loader2, Coins, Database } from "lucide-react";

interface UsageSummary {
  count: number;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheHitPct: number;
  bySource: Array<{ source: string; count: number; costUsd: number }>;
  byModel: Array<{ model: string; count: number; costUsd: number }>;
  firstAt?: string;
  lastAt?: string;
}

interface UsageEntry {
  t: string;
  source: string;
  model: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

interface AccountModelUsage {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  estCostUsd: number;
  messages: number;
}

interface AccountSummary {
  totalEstCostUsd: number;
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCacheWrite: number;
  cacheHitPct: number;
  messages: number;
  sessions: number;
  byModel: AccountModelUsage[];
  daily: Array<{ day: string; estCostUsd: number }>;
  scannedProjects: number;
  note: string;
}

type Scope = "adeptly" | "account";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "All", days: 0 },
];

function usd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(n < 1 ? 3 : 2);
}

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export function UsagePanel({ projectRoot }: { projectRoot: string | null }) {
  const [days, setDays] = useState(7);
  const [scope, setScope] = useState<Scope>("adeptly");
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [recent, setRecent] = useState<UsageEntry[]>([]);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectRoot) return;
    setLoading(true);
    try {
      const base = `?projectRoot=${encodeURIComponent(projectRoot)}${days ? `&days=${days}` : ""}`;
      const res = await fetch(`/api/usage${base}&scope=${scope}`);
      const data = await res.json();
      if (scope === "account") {
        setAccount(data.account ?? null);
      } else {
        setSummary(data.summary ?? null);
        setRecent(data.recent ?? []);
      }
    } catch {
      /* leave last state */
    } finally {
      setLoading(false);
    }
  }, [projectRoot, days, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const empty = scope === "adeptly" && summary && summary.count === 0;

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-3 py-2 border-b border-border-subtle sticky top-0 bg-elevated z-10">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary flex-1">
            Claude usage
          </div>
          <div className="inline-flex rounded overflow-hidden border border-border-subtle text-[10px]">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setDays(r.days)}
                className={`px-1.5 py-0.5 transition-colors ${
                  days === r.days ? "bg-accent-gradient text-white" : "text-fg-secondary hover:text-fg"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            title="Reload"
            className="p-1 rounded text-fg-tertiary hover:text-accent-1 hover:bg-base transition-colors"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={1.5} />}
          </button>
        </div>
        <div className="inline-flex rounded overflow-hidden border border-border-subtle text-[10px] mt-1.5 w-full">
          {(["adeptly", "account"] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`flex-1 px-1.5 py-1 transition-colors ${
                scope === s ? "bg-accent-gradient text-white" : "text-fg-secondary hover:text-fg"
              }`}
            >
              {s === "adeptly" ? "Adeptly's calls" : "Whole account"}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-fg-tertiary mt-1">
          {scope === "adeptly" ? (
            <>
              What Adeptly's own <span className="font-mono">claude</span> calls cost — exact, from the CLI receipt.
            </>
          ) : (
            <>
              All Claude Code on this machine, parsed from <span className="font-mono">~/.claude</span>. Tokens exact, cost
              estimated.
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {scope === "account" ? (
          <AccountView account={account} loading={loading} />
        ) : empty ? (
          <div className="text-xs text-fg-secondary leading-relaxed border border-dashed border-border-strong rounded-md p-4 text-center">
            No metered calls yet in this window. Generate a recipe, run the crew, or refresh features — each records its
            real token cost here.
          </div>
        ) : !summary ? (
          <div className="text-xs text-fg-tertiary italic">loading…</div>
        ) : (
          <>
            {/* headline stats */}
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={<Coins size={13} />} label="Spend" value={usd(summary.totalCostUsd)} sub={`${summary.count} call${summary.count === 1 ? "" : "s"}`} />
              <Stat
                icon={<Database size={13} />}
                label="Cache hit"
                value={`${summary.cacheHitPct}%`}
                sub={`${compact(summary.cacheReadTokens)} cached`}
                accent={summary.cacheHitPct >= 50}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Input tok" value={compact(summary.inputTokens)} />
              <Stat label="Output tok" value={compact(summary.outputTokens)} />
            </div>

            {/* by source */}
            {summary.bySource.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">By source</div>
                {summary.bySource.map((s) => (
                  <Bar key={s.source} label={s.source} value={s.costUsd} total={summary.totalCostUsd} suffix={`${usd(s.costUsd)} · ${s.count}`} />
                ))}
              </div>
            )}

            {/* by model */}
            {summary.byModel.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">By model</div>
                {summary.byModel.map((m) => (
                  <Bar key={m.model} label={m.model} value={m.costUsd} total={summary.totalCostUsd} suffix={`${usd(m.costUsd)} · ${m.count}`} />
                ))}
              </div>
            )}

            {/* recent */}
            {recent.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">Recent calls</div>
                <ul className="space-y-1">
                  {recent.map((e, i) => (
                    <li
                      key={`${e.t}-${i}`}
                      className="text-[11px] flex items-center gap-2 border border-border-subtle rounded bg-base/40 px-2 py-1"
                    >
                      <span className="text-accent-1 font-medium w-14 shrink-0">{e.source}</span>
                      <span className="text-fg-tertiary font-mono truncate flex-1" title={e.model}>
                        {e.model.replace(/^claude-/, "")}
                      </span>
                      <span className="text-fg-secondary shrink-0">{usd(e.costUsd)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AccountView({ account, loading }: { account: AccountSummary | null; loading: boolean }) {
  if (!account) {
    return <div className="text-xs text-fg-tertiary italic">{loading ? "scanning ~/.claude…" : "no data"}</div>;
  }
  if (account.messages === 0) {
    return (
      <div className="text-xs text-fg-secondary leading-relaxed border border-dashed border-border-strong rounded-md p-4 text-center">
        {account.note}
      </div>
    );
  }
  const maxDay = Math.max(...account.daily.map((d) => d.estCostUsd), 0.0001);
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Coins size={13} />} label="Est. spend" value={"~" + usd(account.totalEstCostUsd)} sub={`${account.messages} msgs · ${account.sessions} sessions`} />
        <Stat
          icon={<Database size={13} />}
          label="Cache hit"
          value={`${account.cacheHitPct}%`}
          sub={`${compact(account.totalCacheRead)} cached`}
          accent={account.cacheHitPct >= 50}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Input tok" value={compact(account.totalInput)} />
        <Stat label="Output tok" value={compact(account.totalOutput)} />
      </div>

      {account.byModel.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">By model (est. cost)</div>
          {account.byModel.map((m) => (
            <Bar
              key={m.model}
              label={m.model}
              value={m.estCostUsd}
              total={account.totalEstCostUsd}
              suffix={`~${usd(m.estCostUsd)} · ${compact(m.input + m.output)}`}
            />
          ))}
        </div>
      )}

      {account.daily.length > 1 && (
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">Daily est. cost</div>
          <div className="flex items-end gap-0.5 h-16">
            {account.daily.map((d) => (
              <div
                key={d.day}
                title={`${d.day}: ~${usd(d.estCostUsd)}`}
                className="flex-1 bg-accent-1/70 rounded-t hover:bg-accent-1 transition-colors"
                style={{ height: `${Math.max((d.estCostUsd / maxDay) * 100, 3)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-fg-tertiary">
            <span>{account.daily[0]?.day.slice(5)}</span>
            <span>{account.daily[account.daily.length - 1]?.day.slice(5)}</span>
          </div>
        </div>
      )}

      <div className="text-[10px] text-fg-tertiary leading-relaxed border-t border-border-subtle pt-2">
        {account.note} Scanned {account.scannedProjects} project folder{account.scannedProjects === 1 ? "" : "s"}.
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-border-subtle rounded-md bg-base/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-fg-tertiary">
        {icon}
        {label}
      </div>
      <div className={`text-lg font-semibold ${accent ? "text-status-approved" : "text-fg"}`}>{value}</div>
      {sub && <div className="text-[10px] text-fg-tertiary">{sub}</div>}
    </div>
  );
}

function Bar({ label, value, total, suffix }: { label: string; value: number; total: number; suffix: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-fg-secondary w-16 shrink-0 truncate" title={label}>
        {label.replace(/^claude-/, "")}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-border-subtle overflow-hidden">
        <div className="h-full rounded-full bg-accent-1" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-fg-tertiary shrink-0 tabular-nums">{suffix}</span>
    </div>
  );
}
