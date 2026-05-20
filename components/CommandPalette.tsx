"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileText, X } from "lucide-react";
import type { Plan, PlanStatus } from "@/lib/types";

type PlanLite = Omit<Plan, "content">;

const STATUS_DOT: Record<PlanStatus, string> = {
  draft: "bg-status-draft",
  "in-review": "bg-status-review",
  approved: "bg-status-approved",
  "changes-requested": "bg-status-changes",
};

export function CommandPalette({
  open,
  onClose,
  projectRoot,
  onSelectPlan,
}: {
  open: boolean;
  onClose: () => void;
  projectRoot: string | null;
  onSelectPlan: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !projectRoot) return;
    fetch(`/api/plans?projectRoot=${encodeURIComponent(projectRoot)}`)
      .then((r) => r.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]));
  }, [open, projectRoot]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.filename.toLowerCase().includes(q)
    );
  }, [query, plans]);

  function commit(idx: number) {
    const p = filtered[idx];
    if (!p) return;
    onSelectPlan(p.slug);
    onClose();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-base/70"
        style={{ backdropFilter: "blur(4px)" }}
      />
      <div
        className="relative w-[640px] max-w-[92vw] rounded-lg border border-border-strong shadow-2xl"
        style={{ background: "var(--bg-overlay)", backdropFilter: "blur(16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
          <Search size={16} className="text-fg-tertiary shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Search plans…"
            className="flex-1 bg-transparent text-fg placeholder:text-fg-tertiary text-sm focus:outline-none border-0"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-base text-fg-tertiary"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-fg-tertiary">
              No plans match <span className="font-mono">"{query}"</span>.
            </div>
          ) : (
            <ul>
              {filtered.map((p, i) => {
                const status: PlanStatus = p.approval?.status ?? "draft";
                return (
                  <li key={p.slug}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => commit(i)}
                      className={`w-full flex items-center gap-3 text-left px-3 py-2 transition-colors ${
                        active === i ? "bg-base" : "hover:bg-base/60"
                      }`}
                    >
                      <FileText size={16} className="text-fg-tertiary shrink-0" strokeWidth={1.5} />
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]} shrink-0`} aria-hidden />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-fg truncate">{p.title}</div>
                        <div className="text-[10px] text-fg-tertiary font-mono truncate">{p.filename}</div>
                      </div>
                      {active === i && (
                        <span className="text-[10px] text-fg-tertiary font-mono">↵</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-border-subtle text-[10px] text-fg-tertiary flex items-center gap-3">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> open
          </span>
          <span>
            <kbd className="font-mono">esc</kbd> close
          </span>
          <div className="flex-1" />
          <span className="text-fg-tertiary">{filtered.length} plan{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
