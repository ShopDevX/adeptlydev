"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Leaf, Plus, Check, Loader2, Coins } from "lucide-react";
import { computeHygiene, type HygieneReport, type HygieneTactic } from "@/lib/token-hygiene";
import type { PlanRecipe } from "@/lib/plan-recipe";
import type { ClaudeCodeFeature } from "@/lib/types";

interface Props {
  projectRoot: string | null;
  planSlug: string | null;
  planContent: string;
  onPlanChanged?: () => void;
}

const BAND_LABEL: Record<HygieneReport["band"], string> = {
  lean: "Lean",
  ok: "Room to trim",
  wasteful: "Leaving savings on the table",
};

export function SavingsPanel({ projectRoot, planSlug, planContent, onPlanChanged }: Props) {
  const [recipe, setRecipe] = useState<PlanRecipe | null>(null);
  const [catalogue, setCatalogue] = useState<ClaudeCodeFeature[] | undefined>(undefined);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const q = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : "";

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

  useEffect(() => setAdded(new Set()), [planSlug]);

  const report: HygieneReport = useMemo(
    () => computeHygiene(planContent, recipe, catalogue),
    [planContent, recipe, catalogue]
  );

  const addToPlan = useCallback(
    async (t: HygieneTactic) => {
      if (!planSlug) return;
      setBusy(t.id);
      try {
        const res = await fetch(`/api/plans/${planSlug}/inject${q}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section_hint: t.sectionHint, content: t.addContent }),
        });
        const data = await res.json();
        if (data?.error) throw new Error(data.error);
        setAdded((prev) => new Set(prev).add(t.id));
        onPlanChanged?.();
      } catch {
        /* parent refetch surfaces errors */
      } finally {
        setBusy(null);
      }
    },
    [planSlug, q, onPlanChanged]
  );

  if (!planSlug) {
    return <div className="text-xs text-fg-secondary italic">Select a plan to see its token-hygiene score.</div>;
  }

  const { score, usingCount, total, band } = report;
  const color = band === "lean" ? "var(--status-approved)" : band === "ok" ? "var(--status-review)" : "var(--accent-1)";
  const missing = report.tactics.filter((t) => t.status === "missing");
  const using = report.tactics.filter((t) => t.status === "using");

  return (
    <div className="space-y-4">
      {/* efficiency meter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Leaf size={15} className="shrink-0" style={{ color }} strokeWidth={1.5} />
          <span className="text-sm font-medium text-fg">Token hygiene</span>
          <span className="text-[11px] text-fg-tertiary">
            {usingCount}/{total} habits
          </span>
          <span className="ml-auto text-sm font-semibold" style={{ color }}>
            {score}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-border-subtle overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(score, 2)}%`, backgroundColor: color }} />
        </div>
        <div className="text-[11px] text-fg-secondary">
          <strong className="text-fg">{BAND_LABEL[band]}.</strong>{" "}
          {missing.length > 0
            ? `${missing.length} cheap win${missing.length === 1 ? "" : "s"} below — each is one click to bake into the plan.`
            : "This plan already uses every money-saving habit Adeptly checks for."}
        </div>
        {recipe && (
          <div className="flex items-center gap-2 text-[11px] text-fg-secondary border border-border-subtle rounded px-2 py-1 bg-base/40 w-fit">
            <Coins size={12} className="text-accent-1" />
            Recipe estimate: <strong className="text-fg">≈ {recipe.expected_turns} turns</strong> ·{" "}
            <strong className="text-fg">≈ ${recipe.estimated_cost_usd.toFixed(2)}</strong>
          </div>
        )}
      </div>

      {/* missing habits — the savings */}
      {missing.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">Cheap wins — not in the plan yet</div>
          {missing.map((t) => {
            const isAdded = added.has(t.id);
            return (
              <div key={t.id} className="border border-border-subtle rounded-md bg-elevated p-2.5 flex items-start gap-2.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-sm font-medium text-fg">{t.title}</div>
                  <div className="text-[11px] text-fg-secondary leading-relaxed">{t.whySaves}</div>
                </div>
                <button
                  onClick={() => addToPlan(t)}
                  disabled={isAdded || busy === t.id}
                  className={`shrink-0 text-[11px] px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                    isAdded ? "text-status-approved bg-base cursor-default" : "bg-accent-gradient text-white hover:opacity-90"
                  } disabled:opacity-60`}
                >
                  {busy === t.id ? (
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

      {/* already-lean habits */}
      {using.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-fg-tertiary font-medium">Already lean</div>
          <div className="flex flex-wrap gap-1.5">
            {using.map((t) => (
              <span
                key={t.id}
                title={t.whySaves}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border-subtle bg-base text-fg-secondary"
              >
                <Check size={11} className="text-status-approved" strokeWidth={2} />
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-fg-tertiary leading-relaxed border-t border-border-subtle pt-2">
        Habits are detected from the plan text and its recipe. Adding one drops a line into the plan's Approach section —
        the crew and any Claude Code session then follow it.
      </div>
    </div>
  );
}
