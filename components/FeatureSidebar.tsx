"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Sparkles, Check, X, Loader2 } from "lucide-react";
import { CLAUDE_CODE_FEATURES } from "@/lib/features";
import type { ClaudeCodeFeature, FeatureCategory } from "@/lib/types";

const CATEGORY_ORDER: FeatureCategory[] = [
  "Planning",
  "Agents",
  "Skills",
  "Hooks",
  "MCP",
  "Memory",
  "Sessions",
  "Worktrees",
  "Scheduling",
  "Background",
  "Permissions",
];

export function FeatureSidebar({
  projectRoot,
  highlightedIds = new Set<string>(),
  scrollToId,
}: {
  projectRoot?: string | null;
  highlightedIds?: Set<string>;
  scrollToId?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // Effective catalogue (built-in + locally-accepted). Falls back to the static
  // snapshot before the fetch resolves or if there's no project.
  const [features, setFeatures] = useState<ClaudeCodeFeature[]>(CLAUDE_CODE_FEATURES);
  const [customIds, setCustomIds] = useState<Set<string>>(new Set());

  // Refresh flow state
  const [refreshing, setRefreshing] = useState(false);
  const [candidates, setCandidates] = useState<ClaudeCodeFeature[] | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const q = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : "";

  const loadCatalogue = useCallback(async () => {
    if (!projectRoot) return;
    try {
      const res = await fetch(`/api/features${q}`);
      const data = await res.json();
      if (Array.isArray(data?.features)) {
        setFeatures(data.features);
        setCustomIds(new Set<string>(data.customIds ?? []));
      }
    } catch {
      /* keep the static fallback */
    }
  }, [projectRoot, q]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  // Open + scroll when a suggestion is clicked elsewhere
  useMemo(() => {
    if (scrollToId) {
      setOpenId(scrollToId);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          const el = document.getElementById(`feature-${scrollToId}`);
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      }
    }
  }, [scrollToId]);

  async function refresh() {
    if (!projectRoot || refreshing) return;
    setRefreshing(true);
    setRefreshMsg(null);
    setCandidates(null);
    try {
      const res = await fetch(`/api/features/refresh${q}`, { method: "POST" });
      const data = await res.json();
      if (data?.error) {
        setRefreshMsg(data.error);
      } else if (!data.candidates || data.candidates.length === 0) {
        setRefreshMsg(`Your catalogue is up to date — Claude found nothing beyond the ${data.knownCount} features you already have.`);
      } else {
        setCandidates(data.candidates as ClaudeCodeFeature[]);
      }
    } catch (e: any) {
      setRefreshMsg(e?.message ?? String(e));
    } finally {
      setRefreshing(false);
    }
  }

  async function accept(toAdd: ClaudeCodeFeature[]) {
    if (!projectRoot || toAdd.length === 0) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/features/accept${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: toAdd }),
      });
      const data = await res.json();
      if (data?.error) {
        setRefreshMsg(data.error);
      } else {
        setRefreshMsg(`Added ${data.added} feature${data.added === 1 ? "" : "s"} to your catalogue.`);
        setCandidates(null);
        await loadCatalogue();
      }
    } catch (e: any) {
      setRefreshMsg(e?.message ?? String(e));
    } finally {
      setAccepting(false);
    }
  }

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return features.filter(
      (f) =>
        !query ||
        f.name.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query)
    );
  }, [filter, features]);

  const grouped = useMemo(() => {
    const map = new Map<FeatureCategory, ClaudeCodeFeature[]>();
    for (const f of filtered) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }, [filtered]);

  const customCount = customIds.size;

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-3 py-2 border-b border-border-subtle sticky top-0 bg-elevated z-10">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary flex-1">
            Claude Code features
          </div>
          <button
            onClick={refresh}
            disabled={refreshing || !projectRoot}
            title={
              projectRoot
                ? "Ask your local claude CLI for features newer than this catalogue"
                : "Open a project to refresh from your claude CLI"
            }
            className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded text-accent-1 hover:bg-base disabled:opacity-50 transition-colors"
          >
            {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={1.5} />}
            Refresh
          </button>
        </div>
        <div className="text-xs text-fg-tertiary mt-0.5">
          {features.length} features · most users use 3
          {customCount > 0 && <span className="text-accent-1"> · {customCount} from your CLI</span>}
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="mt-2 w-full text-xs border border-border-strong bg-base text-fg rounded px-2 py-1"
        />
      </div>

      {/* refresh result / review */}
      {(refreshMsg || candidates) && (
        <div className="border-b border-border-subtle bg-base/60 px-3 py-2 space-y-2">
          {refreshMsg && (
            <div className="text-[11px] text-fg-secondary leading-relaxed flex items-start gap-1.5">
              <Sparkles size={12} className="text-accent-1 shrink-0 mt-0.5" />
              <span className="flex-1">{refreshMsg}</span>
              <button onClick={() => setRefreshMsg(null)} className="text-fg-tertiary hover:text-fg shrink-0">
                <X size={12} />
              </button>
            </div>
          )}
          {candidates && candidates.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-fg">
                  {candidates.length} feature{candidates.length === 1 ? "" : "s"} Claude says are newer than your catalogue
                </span>
                <button
                  onClick={() => accept(candidates)}
                  disabled={accepting}
                  className="ml-auto text-[11px] px-2 py-0.5 rounded bg-accent-gradient text-white flex items-center gap-1 disabled:opacity-60"
                >
                  {accepting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2} />}
                  Accept all
                </button>
              </div>
              <ul className="space-y-1">
                {candidates.map((c) => (
                  <li key={c.id} className="border border-border-subtle rounded bg-elevated p-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-fg">{c.name}</span>
                      <span className="text-[9px] px-1 rounded bg-base text-fg-tertiary uppercase tracking-wide">
                        {c.category}
                      </span>
                      <button
                        onClick={() => accept([c])}
                        disabled={accepting}
                        title="Add just this one"
                        className="ml-auto text-accent-1 hover:underline disabled:opacity-60"
                      >
                        add
                      </button>
                    </div>
                    <p className="text-fg-secondary mt-0.5 leading-snug">{c.description}</p>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-fg-tertiary italic leading-snug">
                Claude's best knowledge, not a live feed — review before accepting. Accepted features are saved to{" "}
                <span className="font-mono">.adeptly/features.json</span> in this project.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {grouped.map((g) => (
          <div key={g.category}>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-tertiary bg-base border-b border-border-subtle sticky top-0">
              {g.category}
            </div>
            <ul className="divide-y divide-border-subtle">
              {g.items.map((f) => {
                const open = openId === f.id;
                const highlighted = highlightedIds.has(f.id);
                const isCustom = customIds.has(f.id);
                return (
                  <li key={f.id} id={`feature-${f.id}`}>
                    <button
                      onClick={() => setOpenId(open ? null : f.id)}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        highlighted ? "suggested-row" : "hover:bg-base"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium flex-1 text-fg">{f.name}</span>
                        {isCustom && (
                          <span
                            title="Discovered from your claude CLI"
                            className="text-[9px] font-semibold text-accent-1 px-1 rounded uppercase tracking-wider border border-accent-1/40"
                          >
                            new
                          </span>
                        )}
                        {highlighted && (
                          <span
                            title="Suggested for the current plan"
                            className="text-[10px] font-semibold text-accent-1 px-1 rounded uppercase tracking-wider"
                          >
                            suggested
                          </span>
                        )}
                      </div>
                      {open && (
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-fg leading-snug">{f.description}</p>
                          {f.whenToUse && (
                            <p className="text-xs text-fg-secondary">
                              <span className="font-semibold">When:</span> {f.whenToUse}
                            </p>
                          )}
                          {f.invocation && (
                            <p className="text-xs text-fg-secondary">
                              <span className="font-semibold">How:</span>{" "}
                              <span className="font-mono text-accent-1 bg-base px-1 py-0.5 rounded">{f.invocation}</span>
                            </p>
                          )}
                          {f.docsHint && (
                            <p className="text-xs text-fg-tertiary italic leading-snug">{f.docsHint}</p>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
