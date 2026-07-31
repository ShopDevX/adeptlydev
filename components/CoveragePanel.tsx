"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Plus, Check, Loader2, Sparkles } from "lucide-react";
import { computeCoverage, type CoverageReport, type CoverageGap } from "@/lib/feature-coverage";
import type { PlanRecipe } from "@/lib/plan-recipe";
import type { ClaudeCodeFeature } from "@/lib/types";

interface Props {
  projectRoot: string | null;
  planSlug: string | null;
  planContent: string;
  /** bump to refetch the plan in the parent after an "Add to plan" */
  onPlanChanged?: () => void;
}

export function CoveragePanel({ projectRoot, planSlug, planContent, onPlanChanged }: Props) {
  const [recipe, setRecipe] = useState<PlanRecipe | null>(null);
  const [catalogue, setCatalogue] = useState<ClaudeCodeFeature[] | undefined>(undefined);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const q = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : "";

  // Effective catalogue (built-in + features accepted from the local CLI).
  useEffect(() => {
    if (!projectRoot) return;
    let alive = true;
    fetch(`/api/features${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (alive && Array.isArray(data?.features)) setCatalogue(data.features as ClaudeCodeFeature[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [projectRoot, q]);

  // Fold the cached recipe (if any) into coverage — recipe-recommended features
  // count as "used" even if the plan text doesn't name them.
  useEffect(() => {
    setRecipe(null);
    if (!planSlug) return;
    let alive = true;
    fetch(`/api/recipe/${planSlug}${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (alive && data?.record?.recipe) setRecipe(data.record.recipe as PlanRecipe);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [planSlug, q]);

  // reset "added" markers when switching plans
  useEffect(() => setAdded(new Set()), [planSlug]);

  const report: CoverageReport = useMemo(
    () => computeCoverage(planContent, recipe, catalogue),
    [planContent, recipe, catalogue]
  );

  const addToPlan = useCallback(
    async (gap: CoverageGap) => {
      if (!planSlug) return;
      setBusy(gap.id);
      try {
        const res = await fetch(`/api/plans/${planSlug}/inject${q}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section_hint: gap.sectionHint,
            content: `- **${gap.name}** — ${gap.reason}`,
          }),
        });
        const data = await res.json();
        if (data?.error) throw new Error(data.error);
        setAdded((prev) => new Set(prev).add(gap.id));
        onPlanChanged?.();
      } catch {
        /* surfaced by the parent's error channel on refetch; keep panel quiet */
      } finally {
        setBusy(null);
      }
    },
    [planSlug, q, onPlanChanged]
  );

  if (!planSlug) {
    return <div className="text-xs text-fg-secondary italic">Select a plan to see its Claude Code coverage.</div>;
  }

  const pct = report.coveragePct;
  const barColor = pct >= 50 ? "var(--status-approved)" : pct >= 25 ? "var(--status-review)" : "var(--accent-1)";

  return (
    <div className="space-y-4">
      {/* headline meter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge size={15} className="text-accent-1 shrink-0" strokeWidth={1.5} />
          <span className="text-sm font-medium text-fg">
            Using {report.usedCount} of {report.total} Claude Code features
          </span>
          <span className="ml-auto text-sm font-semibold" style={{ color: barColor }}>
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="text-[11px] text-fg-secondary leading-relaxed">
          {report.relevantTotal > 0 ? (
            <>
              For <strong className="text-fg">this</strong> plan, {report.relevantCovered} of{" "}
              {report.relevantTotal} relevant features are in play.{" "}
              {report.gaps.length > 0 && (
                <span>
                  {report.gaps.length} high-value {report.gaps.length === 1 ? "feature is" : "features are"} still on the
                  table below.
                </span>
              )}
            </>
          ) : (
            <>No feature-specific signals detected in the plan yet — flesh out the plan to get tailored recommendations.</>
          )}
        </div>
      </div>

      {/* gaps — the actionable part */}
      {report.gaps.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium flex items-center gap-1.5">
            <Sparkles size={12} className="text-accent-1" /> Recommended for this plan — not used yet
          </div>
          {report.gaps.map((gap) => {
            const isAdded = added.has(gap.id);
            return (
              <div
                key={gap.id}
                className="border border-border-subtle rounded-md bg-elevated p-2.5 flex items-start gap-2.5"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-fg">{gap.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-base text-fg-tertiary">{gap.category}</span>
                    <span className="text-[10px] text-fg-tertiary font-mono">
                      matched “{gap.matchedText}” · line {gap.line}
                    </span>
                  </div>
                  <div className="text-[11px] text-fg-secondary leading-relaxed">{gap.reason}</div>
                </div>
                <button
                  onClick={() => addToPlan(gap)}
                  disabled={isAdded || busy === gap.id}
                  className={`shrink-0 text-[11px] px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                    isAdded
                      ? "text-status-approved bg-base cursor-default"
                      : "bg-accent-gradient text-white hover:opacity-90"
                  } disabled:opacity-60`}
                >
                  {busy === gap.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isAdded ? (
                    <Check size={12} strokeWidth={2} />
                  ) : (
                    <Plus size={12} strokeWidth={2} />
                  )}
                  {isAdded ? "Added" : "Add to plan"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* what's already covered */}
      {report.covered.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">In play in this plan</div>
          <div className="flex flex-wrap gap-1.5">
            {report.covered.map((c) => (
              <span
                key={c.id}
                title={`${c.category} · detected via ${c.via === "mentioned" ? "plan text" : "recipe"}`}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border-subtle bg-base text-fg-secondary"
              >
                <Check size={11} className="text-status-approved" strokeWidth={2} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* per-category rollup */}
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">By category</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {report.byCategory.map((cat) => (
            <div key={cat.category} className="flex items-center gap-2 text-[11px]">
              <span className="text-fg-secondary flex-1 truncate">{cat.category}</span>
              <span className="font-mono text-fg-tertiary">
                {cat.used}/{cat.total}
              </span>
              <div className="w-12 h-1 rounded-full bg-border-subtle overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-accent-1"
                  style={{ width: `${cat.total ? (cat.used / cat.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-fg-tertiary leading-relaxed border-t border-border-subtle pt-2">
        Coverage counts a feature as in play when the plan text names it or the Claude recipe recommends it. Generate a
        recipe (Claude recipe tab) to sharpen this.
      </div>
    </div>
  );
}
