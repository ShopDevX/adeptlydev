import { runClaudeWithUsage } from "./claude-cli";
import { extractJsonArray } from "./llm-json";
import { getEffectiveCatalogue } from "./feature-catalogue";
import { recordUsage } from "./usage-ledger";
import type { ClaudeCodeFeature, FeatureCategory } from "./types";

/**
 * Feature discovery — ask the user's own `claude` CLI what Claude Code features
 * exist now, and diff the answer against the catalogue we already have.
 *
 * This is best-effort, not gospel: the CLI is self-updating and generally
 * fresher than our hardcoded snapshot, but the model behind it still has a
 * knowledge cutoff. So we NEVER auto-merge — every candidate is validated for
 * shape and de-duped, then handed to the user to accept. Human-in-the-loop.
 */

const CATEGORIES: FeatureCategory[] = [
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

export interface DiscoverResult {
  candidates: ClaudeCodeFeature[];
  knownCount: number;
  error?: string;
  /** trimmed raw output, only when parsing failed — helps debugging */
  raw?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Coerce an untrusted object into a valid ClaudeCodeFeature, or reject it. */
function validate(x: any): ClaudeCodeFeature | null {
  if (!x || typeof x !== "object") return null;
  const name = typeof x.name === "string" ? x.name.trim() : "";
  const description = typeof x.description === "string" ? x.description.trim() : "";
  if (name.length < 2 || description.length < 8) return null;

  const category: FeatureCategory = CATEGORIES.includes(x.category) ? x.category : "Skills";
  const id = (typeof x.id === "string" && x.id.trim() ? slugify(x.id) : slugify(name)) || slugify(name);
  if (!id) return null;

  const feature: ClaudeCodeFeature = {
    id,
    name,
    category,
    description,
    whenToUse: typeof x.whenToUse === "string" ? x.whenToUse.trim() : "",
  };
  if (typeof x.invocation === "string" && x.invocation.trim()) feature.invocation = x.invocation.trim();
  if (typeof x.docsHint === "string" && x.docsHint.trim()) feature.docsHint = x.docsHint.trim();
  return feature;
}

function buildPrompt(knownNames: string[]): string {
  return `You are a Claude Code expert with up-to-date knowledge of the Claude Code CLI you are running inside.

List Claude Code features (tools, slash-command skills, subagents, hooks, MCP capabilities, memory, scheduling, worktrees, permissions, background tasks) that are CURRENT but NOT already in the list below.

I ALREADY KNOW these — do NOT repeat any of them:
${knownNames.join(", ")}

Respond with a JSON array ONLY (no prose, no markdown fences). Each element:
{
  "id": "<short-kebab-case-id>",
  "name": "<feature name as a user would say it>",
  "category": "<one of: ${CATEGORIES.join(" | ")}>",
  "description": "<one sentence: what it is>",
  "whenToUse": "<one sentence: when to reach for it>",
  "invocation": "<how to invoke it, if applicable — else omit>",
  "docsHint": "<optional extra note — else omit>"
}

Only include features you are confident actually exist in Claude Code. If there are none beyond what I listed, return an empty array []. Answer immediately from your own knowledge — do not use any tools, do not explain. Return ONLY the JSON array.`;
}

export async function discoverFeatures(projectRoot: string): Promise<DiscoverResult> {
  const catalogue = await getEffectiveCatalogue(projectRoot);
  const knownNames = catalogue.map((f) => f.name);
  const prompt = buildPrompt(knownNames);

  // Fast model, no tools — this is a bounded knowledge listing, not repo work.
  const res = await runClaudeWithUsage(prompt, { model: "haiku", allowedTools: "", timeoutMs: 90_000 });
  await recordUsage(res.usage, { source: "refresh", at: new Date().toISOString() }, projectRoot);
  if (res.error || (res.code !== 0 && !res.text)) {
    return {
      candidates: [],
      knownCount: catalogue.length,
      error: res.error || `claude exited with code ${res.code}`,
    };
  }

  const parsed = extractJsonArray<any>(res.text);
  if (!parsed) {
    return {
      candidates: [],
      knownCount: catalogue.length,
      error: "Claude did not return a JSON array of features.",
      raw: (res.text || "").slice(0, 600),
    };
  }

  const knownIds = new Set(catalogue.map((f) => f.id));
  const knownNameSet = new Set(catalogue.map((f) => f.name.toLowerCase()));
  const seen = new Set<string>();
  const candidates: ClaudeCodeFeature[] = [];

  for (const item of parsed) {
    const f = validate(item);
    if (!f) continue;
    if (knownIds.has(f.id) || knownNameSet.has(f.name.toLowerCase())) continue;
    if (seen.has(f.id) || seen.has(f.name.toLowerCase())) continue;
    seen.add(f.id);
    seen.add(f.name.toLowerCase());
    candidates.push(f);
  }

  return { candidates, knownCount: catalogue.length };
}
