"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
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
}: {
  projectRoot: string | null;
  selected: string | null;
  onSelect: (slug: string) => void;
  refreshKey: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectRoot) return;
    setLoading(true);
    setError(null);
    fetch(`/api/plans?projectRoot=${encodeURIComponent(projectRoot)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setPlans(data.plans ?? []);
      })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [projectRoot, refreshKey]);

  if (collapsed) {
    return (
      <aside className="w-10 border-r border-border-subtle bg-elevated flex flex-col items-center py-2">
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
    <aside className="w-72 border-r border-border-subtle bg-elevated flex flex-col">
      <div className="p-3 border-b border-border-subtle flex items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary flex-1">
          Plans {plans.length > 0 && <span className="text-fg-tertiary">({plans.length})</span>}
        </div>
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
        {loading && <div className="p-3 text-sm text-fg-secondary">Loading…</div>}
        {error && (
          <div className="m-3 text-sm chip-changes p-2 rounded">
            {error}
          </div>
        )}
        {!loading && !error && plans.length === 0 && (
          <div className="p-6 text-center space-y-3">
            <FileText size={32} className="mx-auto text-fg-tertiary" strokeWidth={1.5} />
            <div className="text-sm text-fg-secondary">
              No plans yet.
            </div>
            <div className="text-xs text-fg-tertiary">
              Create one in <span className="font-mono">docs/plans/</span>.
            </div>
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
                    <span className="text-sm font-medium truncate text-fg">{p.title}</span>
                  </div>
                  <div className="text-xs text-fg-tertiary font-mono truncate">{p.filename}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
