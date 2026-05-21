"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react";
import { NewPlanModal } from "./NewPlanModal";
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
}) {
  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [internalRefresh, setInternalRefresh] = useState(0);

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

  return (
    <aside
      className="border-r border-border-subtle bg-elevated flex flex-col shrink-0"
      style={{ width: width ?? 288 }}
    >
      <div className="p-3 border-b border-border-subtle flex items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary flex-1">
          Plans {plans.length > 0 && <span className="text-fg-tertiary">({plans.length})</span>}
        </div>
        <button
          onClick={() => setNewOpen(true)}
          title="New plan"
          aria-label="New plan"
          className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={onToggleCollapsed}
          title="Collapse plans list"
          className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
          aria-label="Collapse plans"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
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
        <ul>
          {plans.map((p) => {
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
                  <div className="text-xs text-fg-tertiary font-mono truncate">{p.filename}</div>
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
    </aside>
  );
}
