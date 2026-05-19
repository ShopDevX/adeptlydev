"use client";

import { useEffect, useState } from "react";
import type { Plan, PlanStatus } from "@/lib/types";

type PlanLite = Omit<Plan, "content">;

const STATUS_DOT: Record<PlanStatus, string> = {
  draft: "bg-gray-400",
  "in-review": "bg-amber-500",
  approved: "bg-emerald-500",
  "changes-requested": "bg-rose-500",
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
      <aside className="w-10 border-r border-gray-200 bg-white flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapsed}
          title="Expand plans list"
          className="p-1 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Expand plans"
        >
          ▶
        </button>
        <div className="mt-2 text-[10px] text-gray-500 [writing-mode:vertical-rl] rotate-180">
          Plans · {plans.length}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex-1">
          Plans {plans.length > 0 && <span className="text-gray-400">({plans.length})</span>}
        </div>
        <button
          onClick={onToggleCollapsed}
          title="Collapse plans list"
          className="p-1 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Collapse plans"
        >
          ◀
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
        {error && (
          <div className="m-3 text-sm bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded">
            {error}
          </div>
        )}
        {!loading && !error && plans.length === 0 && (
          <div className="p-3 text-sm text-gray-500">
            No plans yet. Plans live in <span className="font-mono">docs/plans/</span>.
          </div>
        )}
        <ul>
          {plans.map((p) => {
            const status = p.approval?.status ?? "draft";
            return (
              <li key={p.slug}>
                <button
                  onClick={() => onSelect(p.slug)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-l-4 ${
                    selected === p.slug
                      ? "bg-adept-50 border-adept-500"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
                    <span className="text-sm font-medium truncate">{p.title}</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">{p.filename}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
