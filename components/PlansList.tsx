"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Plus, Search, X } from "lucide-react";
import { NewPlanModal } from "./NewPlanModal";
import { formatRelative } from "@/lib/format-time";
import type { Plan, PlanStatus } from "@/lib/types";

type PlanLite = Omit<Plan, "content">;

const STATUS_DOT: Record<PlanStatus, string> = {
  draft: "bg-status-draft",
  "in-review": "bg-status-review",
  approved: "bg-status-approved",
  "changes-requested": "bg-status-changes",
};

const STATUS_EDGE: Record<PlanStatus, string> = {
  draft: "status-edge-draft",
  "in-review": "status-edge-review",
  approved: "status-edge-approved",
  "changes-requested": "status-edge-changes",
};

export function PlansList({
  projectRoot,
  selected,
  onSelect,
  refreshKey,
  collapsed,
  onToggleCollapsed,
  onPlanCreated,
  width,
  embedded = false,
}: {
  projectRoot: string | null;
  selected: string | null;
  onSelect: (slug: string) => void;
  refreshKey: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onPlanCreated?: (slug: string, title: string) => void;
  /** Pixel width when not collapsed. Defaults to 288 (the previous w-72). */
  width?: number;
  /** When true, the parent renders the outer <aside> + tab switcher.
   *  PlansList only renders the title/new-button row + the list. */
  embedded?: boolean;
}) {
  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [filter, setFilter] = useState("");

  const filteredPlans = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.filename.toLowerCase().includes(q) ||
        (p.approval?.status ?? "draft").toLowerCase().includes(q)
    );
  }, [plans, filter]);

  useEffect(() => {
    if (!projectRoot) return;
    setLoading(true);
    setError(null);
    fetch(`/api/plans?projectRoot=${encodeURIComponent(projectRoot)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        const list: PlanLite[] = data.plans ?? [];
        setPlans(list);
        // Auto-select first plan when none is selected (eliminates the
        // "select a plan from the left" empty state for projects that
        // already have plans).
        if (!selected && list.length > 0) {
          onSelect(list[0].slug);
        }
      })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRoot, refreshKey, internalRefresh]);

  if (collapsed) {
    return (
      <aside className="w-10 border-r border-border-subtle bg-elevated flex flex-col items-center py-2 shrink-0">
        <button
          onClick={onToggleCollapsed}
          title="Expand plans list"
          className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
          aria-label="Expand plans"
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
        <div className="mt-2 text-[10px] text-fg-secondary [writing-mode:vertical-rl] rotate-180">
          Plans · {plans.length}
        </div>
      </aside>
    );
  }

  const inner = (
    <>
      <div className="border-b border-border-subtle">
        <div className="p-3 flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary flex-1">
            Plans {plans.length > 0 && (
              <span className="text-fg-tertiary">
                ({filter ? `${filteredPlans.length}/${plans.length}` : plans.length})
              </span>
            )}
          </div>
          <button
            onClick={() => setNewOpen(true)}
            title="New plan"
            aria-label="New plan"
            className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
          {!embedded && (
            <button
              onClick={onToggleCollapsed}
              title="Collapse plans list"
              className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
              aria-label="Collapse plans"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
        {plans.length >= 5 && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search
                size={11}
                strokeWidth={1.5}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-tertiary pointer-events-none"
              />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter plans…"
                aria-label="Filter plans"
                className="w-full bg-base border border-border-subtle rounded text-xs pl-7 pr-7 py-1 text-fg placeholder:text-fg-tertiary focus:outline-none focus:border-accent-1 transition-colors"
              />
              {filter && (
                <button
                  onClick={() => setFilter("")}
                  aria-label="Clear filter"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-border-subtle text-fg-tertiary hover:text-fg transition-colors"
                >
                  <X size={11} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {loading && (
          <ul className="p-3 space-y-2" aria-busy="true" aria-label="Loading plans">
            {[0, 1, 2].map((i) => (
              <li key={i} className="space-y-1.5">
                <div className="skeleton h-3.5 w-3/4" />
                <div className="skeleton h-2.5 w-1/2" />
              </li>
            ))}
          </ul>
        )}
        {error && (
          <div className="m-3 text-sm chip-changes p-2 rounded">
            {error}
          </div>
        )}
        {!loading && !error && plans.length === 0 && (
          <div className="p-6 text-center space-y-3">
            <FileText size={32} className="mx-auto text-fg-tertiary" strokeWidth={1.5} />
            <div className="text-sm text-fg-secondary">No plans yet.</div>
            <button
              onClick={() => setNewOpen(true)}
              className="text-xs px-3 py-1.5 rounded bg-accent-gradient text-white inline-flex items-center gap-1.5"
            >
              <Plus size={12} strokeWidth={1.5} />
              Create your first plan
            </button>
          </div>
        )}
        {!loading && !error && plans.length > 0 && filteredPlans.length === 0 && (
          <div className="p-6 text-center text-xs text-fg-secondary">
            No plans match <span className="text-fg font-mono">&quot;{filter}&quot;</span>.
          </div>
        )}
        <ul>
          {filteredPlans.map((p) => {
            const status: PlanStatus = p.approval?.status ?? "draft";
            const isSelected = selected === p.slug;
            return (
              <li key={p.slug}>
                <button
                  onClick={() => onSelect(p.slug)}
                  className={`w-full text-left px-3 py-2 transition-colors border-l-2 ${
                    isSelected
                      ? "bg-base border-accent-1"
                      : "border-transparent hover:bg-base/60"
                  } ${STATUS_EDGE[status]}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
                    <span className="text-sm font-medium truncate text-fg flex-1">{p.title}</span>
                  </div>
                  <div className="text-xs text-fg-tertiary font-mono truncate flex items-center gap-1.5">
                    <span className="truncate">{p.filename}</span>
                    {p.git?.lastDate && (
                      <>
                        <span aria-hidden>·</span>
                        <span
                          className="shrink-0"
                          title={
                            p.git.lastAuthor
                              ? `Last edited by ${p.git.lastAuthor} (${new Date(p.git.lastDate).toLocaleString()})`
                              : new Date(p.git.lastDate).toLocaleString()
                          }
                        >
                          {formatRelative(p.git.lastDate)}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <NewPlanModal
        open={newOpen}
        projectRoot={projectRoot}
        onClose={() => setNewOpen(false)}
        onCreated={(slug, title) => {
          setInternalRefresh((k) => k + 1);
          onSelect(slug);
          onPlanCreated?.(slug, title);
        }}
      />
    </>
  );

  // Embedded inside the LeftSidebar tab container — caller owns the aside.
  if (embedded) return inner;

  return (
    <aside
      className="border-r border-border-subtle bg-elevated flex flex-col shrink-0"
      style={{ width: width ?? 288 }}
    >
      {inner}
    </aside>
  );
}
