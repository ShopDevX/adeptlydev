import { CLAUDE_CODE_FEATURES } from "./features";
import { suggestFeatures } from "./feature-suggestions";
import type { PlanRecipe } from "./plan-recipe";
import type { ClaudeCodeFeature } from "./types";

/**
 * Feature Coverage — the measurable version of Adeptly's core pitch.
 *
 * Adeptly's whole reason to exist is "you're using ~15% of Claude Code and
 * don't know it." This turns that claim into a number: given a plan (and its
 * recipe, if generated), how many of the catalogue's features does the plan
 * actually put to work — and which high-value ones, relevant to THIS plan, is
 * it leaving on the table?
 *
 * Pure + isomorphic: no node imports, safe to run on client or server.
 */

export type CoverageSource = "mentioned" | "recipe";

export interface CoveredFeature {
  id: string;
  name: string;
  category: string;
  via: CoverageSource;
}

export interface CoverageGap {
  id: string;
  name: string;
  category: string;
  whenToUse: string;
  /** why the plan makes this feature relevant (from the suggestion engine) */
  reason: string;
  /** the phrase in the plan that triggered relevance */
  matchedText: string;
  line: number;
  /** section the "Add to plan" action should target */
  sectionHint: string;
}

export interface CoverageCategory {
  category: string;
  total: number;
  used: number;
}

export interface CoverageReport {
  total: number;
  usedCount: number;
  /** used / total, 0–100 (whole number) */
  coveragePct: number;
  /** features the plan text or recipe references, sorted by category */
  covered: CoveredFeature[];
  /** relevant-to-this-plan but not yet used — the actionable list */
  gaps: CoverageGap[];
  byCategory: CoverageCategory[];
  /** how many catalogue features are relevant to this plan at all */
  relevantTotal: number;
  /** of those, how many are already used */
  relevantCovered: number;
}

// Recipe vocabularies are constrained (see lib/plan-recipe.ts prompt), so we can
// map them to catalogue feature ids explicitly instead of fuzzy-matching.
const SUBAGENT_TO_FEATURE: Record<string, string> = {
  "general-purpose": "subagent-general",
  explore: "subagent-explore",
  plan: "subagent-plan",
  "claude-code-guide": "subagent-claude-code-guide",
  "statusline-setup": "subagent-statusline-setup",
  "code-reviewer": "skill-review",
  "security-reviewer": "skill-security-review",
};

const SKILL_TO_FEATURE: Record<string, string> = {
  "/init": "skill-init",
  "/review": "skill-review",
  "/security-review": "skill-security-review",
  "/loop": "skill-loop",
  "/schedule": "skill-schedule",
  "/help": "skill-help",
  "/clear": "skill-clear",
  "/config": "skill-config",
  "/memory": "auto-memory",
};

const HOOK_TO_FEATURE: Record<string, string> = {
  pretooluse: "hook-pre-tool-use",
  posttooluse: "hook-post-tool-use",
  userpromptsubmit: "hook-user-prompt-submit",
  sessionstart: "hook-session-start",
  sessionend: "hook-session-start",
  stop: "hook-stop",
};

/** Is this feature named literally in the plan text? */
function isMentioned(name: string, invocation: string | undefined, contentLower: string): boolean {
  // Slash-command invocations are precise and unambiguous.
  if (invocation && invocation.startsWith("/") && contentLower.includes(invocation.toLowerCase())) {
    return true;
  }
  // Otherwise require the full feature name (≥4 chars guards against noise).
  const n = name.toLowerCase();
  return n.length >= 4 && contentLower.includes(n);
}

/** Feature ids the recipe explicitly recommends. */
function recipeFeatureIds(recipe: PlanRecipe): Set<string> {
  const ids = new Set<string>();
  if (recipe.start_with_plan_mode) ids.add("plan-mode");
  for (const s of recipe.subagents ?? []) {
    const id = SUBAGENT_TO_FEATURE[(s.type ?? "").trim().toLowerCase()];
    if (id) ids.add(id);
  }
  for (const s of recipe.skills ?? []) {
    const id = SKILL_TO_FEATURE[(s.name ?? "").trim().toLowerCase()];
    if (id) ids.add(id);
  }
  for (const h of recipe.hooks_to_consider ?? []) {
    const id = HOOK_TO_FEATURE[(h.type ?? "").trim().toLowerCase()];
    if (id) ids.add(id);
  }
  return ids;
}

/** Where the "Add to plan" action should drop each gap. */
function sectionHintFor(category: string): string {
  const c = category.toLowerCase();
  if (c === "hooks" || c === "permissions") return "Risks";
  return "Approach";
}

export function computeCoverage(
  planContent: string,
  recipe?: PlanRecipe | null,
  catalogue: ClaudeCodeFeature[] = CLAUDE_CODE_FEATURES
): CoverageReport {
  const contentLower = (planContent || "").toLowerCase();
  const recipeIds = recipe ? recipeFeatureIds(recipe) : new Set<string>();

  const covered: CoveredFeature[] = [];
  const usedIds = new Set<string>();

  for (const f of catalogue) {
    const mentioned = isMentioned(f.name, f.invocation, contentLower);
    const inRecipe = recipeIds.has(f.id);
    if (mentioned || inRecipe) {
      covered.push({
        id: f.id,
        name: f.name,
        category: f.category,
        // text mention is the stronger signal; label it that way when both.
        via: mentioned ? "mentioned" : "recipe",
      });
      usedIds.add(f.id);
    }
  }

  // Relevant-to-this-plan features (suggestion engine) that aren't used yet.
  const suggestions = suggestFeatures(planContent || "");
  const relevantIds = new Set(suggestions.map((s) => s.featureId));
  const gaps: CoverageGap[] = [];
  for (const s of suggestions) {
    if (usedIds.has(s.featureId)) continue;
    const f = catalogue.find((x) => x.id === s.featureId);
    if (!f) continue;
    gaps.push({
      id: f.id,
      name: f.name,
      category: f.category,
      whenToUse: f.whenToUse,
      reason: s.reason,
      matchedText: s.matchedText ?? "",
      line: s.line ?? 0,
      sectionHint: sectionHintFor(f.category),
    });
  }

  // Per-category rollup across the whole catalogue.
  const catMap = new Map<string, CoverageCategory>();
  for (const f of catalogue) {
    const entry = catMap.get(f.category) ?? { category: f.category, total: 0, used: 0 };
    entry.total += 1;
    if (usedIds.has(f.id)) entry.used += 1;
    catMap.set(f.category, entry);
  }

  const total = catalogue.length;
  const usedCount = usedIds.size;
  const relevantCovered = [...relevantIds].filter((id) => usedIds.has(id)).length;

  return {
    total,
    usedCount,
    coveragePct: total > 0 ? Math.round((usedCount / total) * 100) : 0,
    covered: covered.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
    gaps,
    byCategory: [...catMap.values()].sort((a, b) => a.category.localeCompare(b.category)),
    relevantTotal: relevantIds.size,
    relevantCovered,
  };
}
