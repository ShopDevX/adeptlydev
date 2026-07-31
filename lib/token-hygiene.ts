import { computeCoverage } from "./feature-coverage";
import type { PlanRecipe } from "./plan-recipe";
import type { ClaudeCodeFeature } from "./types";

/**
 * Token Hygiene — Adeptly's opinionated "are you spending your Claude limit
 * wisely?" lens for a plan. Plan-first work is inherently cheaper (you don't
 * pay to build the wrong thing twice); this makes the specific money-saving
 * Claude Code habits explicit, checks which ones the plan already uses, and
 * lets you add the missing ones in one click.
 *
 * Detection reuses the Coverage engine (plan text + recipe), so a tactic backed
 * by a catalogue feature counts as "using" the same way Coverage sees it.
 */

export interface HygieneTactic {
  id: string;
  title: string;
  /** one line on how it reduces token/limit usage */
  whySaves: string;
  status: "using" | "missing";
  /** catalogue feature backing detection, if any */
  featureId?: string;
  sectionHint: string;
  /** markdown to inject when the user clicks "Add to plan" */
  addContent: string;
}

export interface HygieneReport {
  score: number; // 0–100
  usingCount: number;
  total: number;
  band: "lean" | "ok" | "wasteful";
  tactics: HygieneTactic[];
}

export function computeHygiene(
  planContent: string,
  recipe?: PlanRecipe | null,
  catalogue?: ClaudeCodeFeature[]
): HygieneReport {
  const cov = computeCoverage(planContent, recipe, catalogue);
  const usedIds = new Set(cov.covered.map((c) => c.id));
  const anySubagent = [...usedIds].some((id) => id.startsWith("subagent-"));
  const lower = (planContent || "").toLowerCase();
  const has = (re: RegExp) => re.test(lower);

  const defs: Array<Omit<HygieneTactic, "status"> & { using: boolean }> = [
    {
      id: "plan-mode-first",
      title: "Start in Plan Mode",
      whySaves: "Approving the approach before any edit avoids the biggest sink — building the wrong thing and redoing it.",
      featureId: "plan-mode",
      using: usedIds.has("plan-mode"),
      sectionHint: "Approach",
      addContent: "- **Start in Plan Mode** — approve the approach before writing code; avoids costly wrong-path rework.",
    },
    {
      id: "explore-search",
      title: "Explore subagent for search",
      whySaves: "Explore runs on a cheaper model in an isolated context, so grepping the repo doesn't burn main-window tokens.",
      featureId: "subagent-explore",
      using: usedIds.has("subagent-explore"),
      sectionHint: "Approach",
      addContent: "- **Explore subagent for search** — offload code-finding to the cheap, isolated Explore agent, not the main session.",
    },
    {
      id: "clear-context",
      title: "/clear between unrelated steps",
      whySaves: "Stale context is re-sent and re-billed every turn; clearing between tasks keeps each turn's input small.",
      featureId: "skill-clear",
      using: usedIds.has("skill-clear") || has(/\/clear|clear\s+context/),
      sectionHint: "Approach",
      addContent: "- **/clear between unrelated steps** — drop stale context so you don't pay to re-read it every turn.",
    },
    {
      id: "subagent-isolate",
      title: "Isolate heavy reads in subagents",
      whySaves: "Subagents keep large reads out of the main window, so the main context stays small and cache-friendly.",
      using: anySubagent,
      sectionHint: "Approach",
      addContent: "- **Isolate heavy reads in a subagent** — keep the main context small so every turn is cheaper.",
    },
    {
      id: "cache-order",
      title: "Order for prompt caching",
      whySaves: "Stable context first lets Claude reuse cached tokens — often far cheaper than fresh input.",
      using: has(/cache|caching|prompt\s*cache/),
      sectionHint: "Approach",
      addContent: "- **Cache-friendly ordering** — keep stable context (plan, conventions) first so it's served from cache, not re-billed.",
    },
    {
      id: "cheap-model",
      title: "Cheaper model for mechanical work",
      whySaves: "Read-only, formatting, and bulk edits rarely need the top model — Haiku does them at a fraction of the cost.",
      using: has(/haiku|cheaper\s+model|smaller\s+model/),
      sectionHint: "Approach",
      addContent: "- **Cheaper model for mechanical work** — run read-only/formatting/bulk steps on Haiku; save the top model for hard reasoning.",
    },
    {
      id: "background",
      title: "Background agents for long jobs",
      whySaves: "Long builds/tests as background agents don't hold the main context open and idling (which keeps getting re-billed).",
      featureId: "background-agent",
      using: usedIds.has("background-agent") || has(/background\s+agent|run_in_background/),
      sectionHint: "Approach",
      addContent: "- **Background agents for long jobs** — don't idle the main session on long builds/tests.",
    },
    {
      id: "fewer-prompts",
      title: "Trim permission round-trips",
      whySaves: "Each approval prompt is another round-trip; allowlisting safe commands cuts wasted turns.",
      featureId: "skill-fewer-permission-prompts",
      using: usedIds.has("skill-fewer-permission-prompts") || has(/allowlist|permission\s+prompt|allowedtools/),
      sectionHint: "Approach",
      addContent: "- **Allowlist safe commands** — fewer permission prompts means fewer wasted round-trips.",
    },
  ];

  const tactics: HygieneTactic[] = defs.map((d) => ({
    id: d.id,
    title: d.title,
    whySaves: d.whySaves,
    status: d.using ? "using" : "missing",
    featureId: d.featureId,
    sectionHint: d.sectionHint,
    addContent: d.addContent,
  }));

  const usingCount = tactics.filter((t) => t.status === "using").length;
  const total = tactics.length;
  const score = total > 0 ? Math.round((usingCount / total) * 100) : 0;
  const band: HygieneReport["band"] = score >= 66 ? "lean" : score >= 33 ? "ok" : "wasteful";

  return { score, usingCount, total, band, tactics };
}
