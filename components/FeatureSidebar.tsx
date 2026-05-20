"use client";

import { useMemo, useState } from "react";
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
  highlightedIds = new Set<string>(),
  scrollToId,
}: {
  highlightedIds?: Set<string>;
  scrollToId?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // Open + scroll when a suggestion is clicked elsewhere
  useMemo(() => {
    if (scrollToId) {
      setOpenId(scrollToId);
      // defer scroll to next paint
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          const el = document.getElementById(`feature-${scrollToId}`);
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      }
    }
  }, [scrollToId]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return CLAUDE_CODE_FEATURES.filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [filter]);

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

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-3 py-2 border-b border-border-subtle sticky top-0 bg-elevated z-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary">
          Claude Code features
        </div>
        <div className="text-xs text-fg-tertiary mt-0.5">
          {CLAUDE_CODE_FEATURES.length} features · most users use 3
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="mt-2 w-full text-xs border border-border-strong bg-base text-fg rounded px-2 py-1"
        />
      </div>
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
                          <p className="text-xs text-fg-secondary">
                            <span className="font-semibold">When:</span> {f.whenToUse}
                          </p>
                          {f.invocation && (
                            <p className="text-xs text-fg-secondary">
                              <span className="font-semibold">How:</span>{" "}
                              <span className="font-mono text-accent-1 bg-base px-1 py-0.5 rounded">{f.invocation}</span>
                            </p>
                          )}
                          {f.docsHint && (
                            <p className="text-xs text-fg-tertiary italic leading-snug">
                              {f.docsHint}
                            </p>
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
