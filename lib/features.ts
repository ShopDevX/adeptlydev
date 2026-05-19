import type { ClaudeCodeFeature } from "./types";

/**
 * Comprehensive catalogue of Claude Code features as of 2026-05.
 * Verified against the documented surface area: tools, skills, hooks, agents,
 * MCP, memory, scheduling, worktrees, permissions, background tasks.
 *
 * v0 surfaces these as a sidebar; the suggestion engine (lib/feature-suggestions.ts)
 * highlights subsets contextually based on plan content.
 */
export const CLAUDE_CODE_FEATURES: ClaudeCodeFeature[] = [
  // ─── Planning ───────────────────────────────────────────────────────────
  {
    id: "plan-mode",
    name: "Plan Mode",
    category: "Planning",
    description:
      "Force Claude into 'planning only' until you approve the plan. No file edits, no commands run.",
    whenToUse:
      "Anytime the change is larger than a single edit. Use it from the very start of a feature.",
    invocation: "Shift+Tab in a Claude Code session",
    docsHint: "Internally backed by the ExitPlanMode tool.",
  },
  {
    id: "exit-plan-mode",
    name: "ExitPlanMode",
    category: "Planning",
    description:
      "The tool Claude calls to surface its plan for approval. You see the plan; you accept or reject.",
    whenToUse: "Automatic in Plan Mode; you can also tell Claude 'show me a plan before doing X'.",
  },

  // ─── Agents (Task tool) ────────────────────────────────────────────────
  {
    id: "subagent-general",
    name: "general-purpose subagent",
    category: "Agents",
    description: "Catch-all subagent for tasks that don't fit a specialised type.",
    whenToUse: "When you want a fresh isolated context window but no specialist agent applies.",
    invocation: "Task tool with subagent_type: 'general-purpose'",
  },
  {
    id: "subagent-explore",
    name: "Explore subagent",
    category: "Agents",
    description:
      "Fast read-only search across the codebase. Cheap to spawn — uses a smaller model under the hood.",
    whenToUse:
      "'Where is X defined?', 'Which files reference Y?', 'Find files matching pattern Z'. Specify search breadth: quick / medium / very thorough.",
    invocation: "Task tool with subagent_type: 'Explore'",
  },
  {
    id: "subagent-plan",
    name: "Plan subagent",
    category: "Agents",
    description:
      "Designs implementation plans for non-trivial tasks. Returns step-by-step plans and flags critical files.",
    whenToUse: "Before any change touching 3+ files or requiring architectural decisions.",
    invocation: "Task tool with subagent_type: 'Plan'",
  },
  {
    id: "subagent-claude-code-guide",
    name: "claude-code-guide subagent",
    category: "Agents",
    description:
      "Specialist that answers questions about Claude Code, the Anthropic SDK, and the Claude API.",
    whenToUse: "When you're not sure which Claude Code feature applies, or how to set one up.",
    invocation: "Task tool with subagent_type: 'claude-code-guide'",
  },
  {
    id: "subagent-statusline-setup",
    name: "statusline-setup subagent",
    category: "Agents",
    description: "Configures the Claude Code status line.",
    whenToUse: "When you want to customise what shows in the bottom status bar of your session.",
  },
  {
    id: "background-agent",
    name: "Background agents",
    category: "Background",
    description:
      "Spawn an Agent or Bash command with run_in_background: true. You're notified when it completes; the main session keeps working.",
    whenToUse:
      "Long-running builds, test suites, deploys, CI watchers, or research jobs you don't need the result of immediately.",
  },

  // ─── Skills ────────────────────────────────────────────────────────────
  {
    id: "skill-init",
    name: "/init",
    category: "Skills",
    description:
      "Initialises a new CLAUDE.md in the repo with codebase documentation Claude can read on every session.",
    whenToUse: "Onboarding a new repo to Claude Code. Run once per project.",
    invocation: "/init",
  },
  {
    id: "skill-review",
    name: "/review",
    category: "Skills",
    description: "Reviews a pull request — diff awareness, calls out risks, suggests fixes.",
    whenToUse: "Before merging any non-trivial PR.",
    invocation: "/review",
  },
  {
    id: "skill-security-review",
    name: "/security-review",
    category: "Skills",
    description:
      "Security-specific review of the pending changes on the current branch. Looks for OWASP top-10, secrets, auth bypass, SSRF.",
    whenToUse:
      "Any change touching auth, sessions, credentials, file uploads, server-side fetches, or third-party APIs.",
    invocation: "/security-review",
  },
  {
    id: "skill-loop",
    name: "/loop",
    category: "Skills",
    description:
      "Run a prompt or slash command on a recurring interval (e.g. /loop 5m /check-deploy), or self-paced when no interval is given.",
    whenToUse: "Polling a CI run, watching a long-running deploy, or running periodic checks.",
    invocation: "/loop <interval> <prompt-or-skill>",
  },
  {
    id: "skill-schedule",
    name: "/schedule",
    category: "Skills",
    description:
      "Create, update, list, or run scheduled remote agents (routines) that execute on a cron schedule. Also supports one-time scheduled runs.",
    whenToUse: "Recurring chores (nightly deploy summary, weekly metrics, daily PR triage) or one-time reminders.",
    invocation: "/schedule",
  },
  {
    id: "skill-help",
    name: "/help",
    category: "Skills",
    description: "Get help with using Claude Code.",
    invocation: "/help",
  },
  {
    id: "skill-clear",
    name: "/clear",
    category: "Skills",
    description: "Clear the conversation context to start fresh in the same session.",
    whenToUse: "When the current session has accumulated context that's not relevant to the next task.",
    invocation: "/clear",
  },
  {
    id: "skill-config",
    name: "/config",
    category: "Skills",
    description: "Quick settings: theme, model selection, and other lightweight harness toggles.",
    invocation: "/config",
  },
  {
    id: "skill-update-config",
    name: "update-config skill",
    category: "Skills",
    description:
      "Configure the harness via settings.json — permissions, env vars, hooks. Automated behaviours ('whenever X happens, do Y') live here.",
    whenToUse:
      "'Every time I save, run prettier' — that's a hook. 'Allow npm commands without prompting' — that's a permission. Both go through this skill.",
  },
  {
    id: "skill-fewer-permission-prompts",
    name: "fewer-permission-prompts skill",
    category: "Skills",
    description:
      "Scans your transcripts for common read-only Bash and MCP tool calls, then adds a prioritised allowlist to .claude/settings.json.",
    whenToUse: "When you're repeatedly approving the same harmless commands.",
  },
  {
    id: "skill-simplify",
    name: "simplify skill",
    category: "Skills",
    description: "Review changed code for reuse, quality, and efficiency, then fix any issues found.",
    whenToUse: "After Claude finishes a feature but before you commit — a last quality pass.",
  },
  {
    id: "skill-keybindings-help",
    name: "keybindings-help skill",
    category: "Skills",
    description: "Customise keyboard shortcuts, rebind keys, add chord bindings.",
    invocation: "Edit ~/.claude/keybindings.json",
  },

  // ─── Hooks ─────────────────────────────────────────────────────────────
  {
    id: "hook-pre-tool-use",
    name: "PreToolUse hook",
    category: "Hooks",
    description: "Fires before any tool call. Can block (non-zero exit) or modify behaviour.",
    whenToUse:
      "Guard rails: prevent edits to files matching a pattern, block dangerous bash commands, gate writes.",
  },
  {
    id: "hook-post-tool-use",
    name: "PostToolUse hook",
    category: "Hooks",
    description: "Fires after any tool call. Cannot block but can run side-effects.",
    whenToUse: "Auto-format after edits, log to a file, send a Slack notification on a deploy command.",
  },
  {
    id: "hook-user-prompt-submit",
    name: "UserPromptSubmit hook",
    category: "Hooks",
    description: "Fires when you submit a message to Claude. Can inject extra context.",
    whenToUse: "Prepend the current git branch, time, or environment to every message.",
  },
  {
    id: "hook-session-start",
    name: "SessionStart / SessionEnd hooks",
    category: "Hooks",
    description: "Fire at the start and end of every Claude Code session.",
    whenToUse: "Log session metrics, snapshot file state, refresh credentials.",
  },
  {
    id: "hook-stop",
    name: "Stop / SubagentStop hooks",
    category: "Hooks",
    description: "Fire when Claude finishes a turn or a subagent completes.",
    whenToUse: "Notify yourself when long-running work is done; e.g., desktop notification or sound.",
  },

  // ─── MCP ───────────────────────────────────────────────────────────────
  {
    id: "mcp-local",
    name: "Local MCP server",
    category: "MCP",
    description:
      "Extend Claude Code with tools running on your machine — DBs, internal scripts, custom file readers.",
    whenToUse: "Data lives outside the filesystem and you want Claude to query it.",
    docsHint: "Add to mcpServers in your Claude Code config.",
  },
  {
    id: "mcp-remote",
    name: "Remote MCP server (HTTP/SSE)",
    category: "MCP",
    description: "Connect to hosted MCP servers — Gmail, Drive, Calendar, Webflow, Notion, Linear etc.",
    whenToUse:
      "You want Claude to read your email, files, calendar, or interact with SaaS APIs.",
  },

  // ─── Memory ────────────────────────────────────────────────────────────
  {
    id: "auto-memory",
    name: "Auto-memory",
    category: "Memory",
    description:
      "Persistent facts that survive across sessions. Four types: user, feedback, project, reference. Stored under ~/.claude/projects/<slug>/memory/.",
    whenToUse:
      "For user/project context you'd otherwise re-explain every session — roles, conventions, gotchas, external system pointers.",
    invocation: "'Remember X' or 'save to memory: X' in a session.",
  },

  // ─── Sessions ──────────────────────────────────────────────────────────
  {
    id: "resume",
    name: "/resume",
    category: "Sessions",
    description:
      "Continue any past session by picking from a list of recent sessions.",
    whenToUse: "When you closed a session before finishing, or want to fork a previous one.",
    invocation: "/resume",
  },

  // ─── Worktrees ─────────────────────────────────────────────────────────
  {
    id: "worktree-isolation",
    name: "Worktree isolation",
    category: "Worktrees",
    description:
      "Spawn an agent in a git worktree — isolated branch, isolated working copy. Changes don't touch your main checkout.",
    whenToUse:
      "Parallel experiments, risky refactors, code reviews where you want a clean diff without polluting your branch.",
    invocation: "Agent tool with isolation: 'worktree'",
  },

  // ─── Scheduling & Background ───────────────────────────────────────────
  {
    id: "task-create",
    name: "TaskCreate / TaskUpdate",
    category: "Background",
    description: "Track multi-step work as discrete tasks within a session.",
    whenToUse: "When the work has 3+ distinct steps and you want progress visibility.",
  },
  {
    id: "cron-create",
    name: "CronCreate / CronList / CronDelete",
    category: "Scheduling",
    description: "Schedule recurring remote agents that execute on a cron schedule (routines).",
    whenToUse:
      "'Every Monday 9am, summarise last week's PRs and email it to me.' 'Every 5 min, check if deploy succeeded.'",
  },
  {
    id: "schedule-wakeup",
    name: "ScheduleWakeup",
    category: "Scheduling",
    description:
      "Used inside /loop dynamic mode to self-pace iterations (under or over the 5-minute prompt-cache window).",
    whenToUse: "When polling external state that you can't be notified about (CI, deploy, remote queue).",
  },

  // ─── Permissions ───────────────────────────────────────────────────────
  {
    id: "permissions",
    name: "Permission allowlists",
    category: "Permissions",
    description:
      "Settings.json declares which tools and commands run without prompting, and which always require approval.",
    whenToUse: "When you trust certain commands (npm test, git status) but want to gate others (git push, rm).",
  },
];

export function getFeatureById(id: string): ClaudeCodeFeature | undefined {
  return CLAUDE_CODE_FEATURES.find((f) => f.id === id);
}
