import type { FeatureSuggestion } from "./types";

interface SuggestionRule {
  pattern: RegExp;
  featureIds: string[];
  reason: string;
}

/**
 * Keyword-based suggestion engine. Scans plan content for patterns and
 * returns matched features with the reason they were suggested.
 *
 * This is deliberately simple. v1 may replace with LLM-based suggestion.
 */
const RULES: SuggestionRule[] = [
  // Security / sensitive code
  {
    pattern: /\b(auth|authentication|authorization|session|jwt|oauth|password|credential|secret|token|csrf|xss|sql\s*injection|owasp|security|vulnerab\w*)\b/i,
    featureIds: ["skill-security-review", "hook-pre-tool-use"],
    reason:
      "Plan mentions security-sensitive code — run /security-review before merging, and consider a PreToolUse hook to block edits to secrets files.",
  },

  // Tests
  {
    pattern: /\b(unit\s*test|integration\s*test|e2e|spec|jest|vitest|playwright|cypress|pytest|test\s+suite|regression)\b/i,
    featureIds: ["skill-review", "background-agent"],
    reason: "Test work — use /review on the diff and run long suites with background agents.",
  },

  // Multi-file refactor
  {
    pattern: /\b(refactor|migration|across\s+the\s+repo|many\s+files|multiple\s+files|codebase[-\s]wide|sweeping|repository[-\s]wide)\b/i,
    featureIds: ["subagent-plan", "plan-mode", "worktree-isolation"],
    reason:
      "Large-scope change — start with Plan Mode, spawn a Plan subagent for the design, and work in an isolated git worktree.",
  },

  // Exploration / search
  {
    pattern: /\b(find\s+all|search\s+for|locate|where\s+is|references\s+to|usages\s+of|grep|map\s+out)\b/i,
    featureIds: ["subagent-explore"],
    reason:
      "Plan requires codebase exploration — spawn the Explore subagent (cheap, fast, isolated context).",
  },

  // Long running / background
  {
    pattern: /\b(long[-\s]running|background|takes\s+\d+\s*(min|hour)|hours\s+to\s+complete|ci\s+run|deploy)\b/i,
    featureIds: ["background-agent", "skill-loop"],
    reason: "Long-running work — run as a background agent and watch with /loop.",
  },

  // Cron / scheduling
  {
    pattern: /\b(every\s+(day|week|month|monday|tuesday|wednesday|thursday|friday|hour|minute)|daily|weekly|nightly|cron|scheduled?|recurring)\b/i,
    featureIds: ["skill-schedule", "cron-create"],
    reason: "Recurring task — schedule with /schedule or CronCreate.",
  },

  // External systems
  {
    pattern: /\b(notion|linear|jira|slack|gmail|google\s+drive|google\s+calendar|webflow|salesforce|hubspot|external\s+api|third[-\s]party)\b/i,
    featureIds: ["mcp-remote"],
    reason:
      "External system mentioned — connect via an MCP server so Claude can read/write directly instead of you copy-pasting.",
  },

  // Database / internal API
  {
    pattern: /\b(database|postgres|mysql|sqlite|redis|mongodb|internal\s+api|company\s+api)\b/i,
    featureIds: ["mcp-local", "mcp-remote"],
    reason: "Database / internal API — an MCP server lets Claude query it natively.",
  },

  // Cross-session context
  {
    pattern: /\b(remember|persistent|across\s+sessions?|every\s+session|conventions?|team\s+rules?|onboarding\s+doc)\b/i,
    featureIds: ["auto-memory"],
    reason: "Recurring context — store it in auto-memory so you don't re-explain every session.",
  },

  // Permissions / blocking dangerous commands
  {
    pattern: /\b(rm\s+-rf|drop\s+table|truncate|destroy|force\s+push|never\s+allow|gate|approval\s+required)\b/i,
    featureIds: ["permissions", "hook-pre-tool-use"],
    reason: "Dangerous operations mentioned — codify a permission rule or PreToolUse hook so they require approval.",
  },

  // Formatting / quality
  {
    pattern: /\b(prettier|eslint|formatting|lint(ing)?|stylelint|black|ruff|gofmt)\b/i,
    featureIds: ["hook-post-tool-use"],
    reason: "Formatter/linter mentioned — wire it into a PostToolUse hook so it runs automatically after edits.",
  },

  // PR / review workflow
  {
    pattern: /\b(pull\s+request|pr\b|merge\s+request|code\s+review|approve|reviewer)\b/i,
    featureIds: ["skill-review", "skill-security-review"],
    reason: "PR review workflow — /review for general quality, /security-review for sensitive changes.",
  },

  // Onboarding
  {
    pattern: /\b(new\s+repo|onboard|first[-\s]time\s+setup|claude\.md|project\s+context\s+file)\b/i,
    featureIds: ["skill-init", "auto-memory"],
    reason: "Repo onboarding — run /init to seed CLAUDE.md and use auto-memory for ongoing context.",
  },

  // Status line / customisation
  {
    pattern: /\b(status\s*line|customise.+shortcuts?|keyboard\s+shortcuts|keybindings?)\b/i,
    featureIds: ["skill-keybindings-help", "subagent-statusline-setup"],
    reason: "Customisation work — use the statusline-setup subagent or keybindings-help skill.",
  },

  // Cost optimisation
  {
    pattern: /\b(cost|token\s+usage|optimis|optimize|cheaper|reduce\s+spend)\b/i,
    featureIds: ["skill-fewer-permission-prompts", "subagent-explore"],
    reason:
      "Cost work — fewer-permission-prompts reduces friction; Explore subagent runs on a cheaper model for read-only work.",
  },
];

export function suggestFeatures(content: string): FeatureSuggestion[] {
  const seen = new Map<string, FeatureSuggestion>();
  for (const rule of RULES) {
    const match = rule.pattern.exec(content);
    if (!match) continue;
    for (const featureId of rule.featureIds) {
      if (seen.has(featureId)) continue;
      seen.set(featureId, {
        featureId,
        reason: rule.reason,
        matchedText: match[0],
      });
    }
  }
  return Array.from(seen.values());
}
