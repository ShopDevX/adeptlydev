# Adeptly Research Log

Append-only log of competitive intelligence and user-feedback research.
Add a new dated section per research run. Newest entries at top.

---

## 2026-05-19 — Initial competitive scan + 2-month Claude Code feedback synthesis

**Goal:** Identify (a) what competitors in the Claude Code companion / orchestration space ship, (b) what Claude Code users have complained about over the last 60 days, (c) what gaps remain that Adeptly can fill.

**Sources consulted:**
- Direct competitor analysis: [siteboon/claudecodeui (now CloudCLI)](https://github.com/siteboon/claudecodeui), [ralph-tui.com](https://ralph-tui.com/), [subsy/ralph-tui](https://github.com/subsy/ralph-tui)
- Web search results (Reddit blocked by Anthropic crawler — used Hacker News / blogs as proxy):
  - [Anthropic Q1 2026 update roundup (MindStudio)](https://www.mindstudio.ai/blog/claude-code-q1-2026-update-roundup-2)
  - [Anthropic April-23 postmortem on Claude Code quality regression](https://www.anthropic.com/engineering/april-23-postmortem)
  - [InfoQ: Anthropic Traces Six Weeks of Claude Code Quality Complaints to Three Overlapping Product Changes](https://www.infoq.com/news/2026/05/anthropic-claude-code-postmortem/)
  - [InfoQ: Anthropic Introduces Agent-Based Code Review for Claude Code](https://www.infoq.com/news/2026/04/claude-code-review/)
  - [Simon Willison's notes on the quality regression](https://simonwillison.net/2026/Apr/24/recent-claude-code-quality-reports/)
  - HN threads: [Claude Code and the Great Productivity Panic of 2026](https://news.ycombinator.com/item?id=47467922), [Ask HN: Is it just me or is Claude Code getting worse?](https://news.ycombinator.com/item?id=47936579), [Code Review for Claude Code](https://news.ycombinator.com/item?id=47313787), [How I'm Productive with Claude Code](https://news.ycombinator.com/item?id=47494890)
  - [Anthropic Claude Code GitHub Action](https://github.com/anthropics/claude-code-action), [Claude Code Workflow framework](https://github.com/catlog22/Claude-Code-Workflow)

### Competitor positioning

| Product | Surface | Killer feature | Owns |
|---|---|---|---|
| **CloudCLI** (ex-claudecodeui) | Web + mobile GUI | "Use Claude Code from your phone" | Multi-device access, hosted tier ($7/mo), multi-agent (Claude, Cursor, Codex, Gemini), plugin/MCP marketplace |
| **Ralph TUI** | Terminal UI | "Autonomous agent backlog runner" — PRD generation, dependency graph, SELECT→PROMPT→EXECUTE→EVALUATE loop | Power-user CLI workflows, autonomous execution, custom Handlebars prompts, remote multi-instance management |
| **Anthropic AutoDream** (April 2026, built-in to Claude Code) | Inside Claude Code | "Describe the feature, get a plan" | First-party plan generation. **Critical limitation users complained about:** *doesn't analyze existing code*, so plans don't account for current architecture unless you describe it manually. |
| **Anthropic Code Review** (research preview, Team/Enterprise) | GitHub PR comments | "Agent reviews your PR" | POST-code review, multi-reviewer agent setup. Different layer than Adeptly (we're PRE-code plan review). |
| **Adeptly** (us) | Local web app | "Plan-review-as-governance + Claude Code feature recipe" | Plan-first enforcement, multi-reviewer plan approval, GitHub collaborators as reviewers, feature literacy/catalogue, plans-as-files-in-git |

### Themes from 2026 Q1–Q2 Claude Code user feedback

1. **Cost transparency is a real pain.** Multiple sources: *"Claude does not provide detailed per-prompt or per-token breakdowns, requiring developers to self-monitor."* Users had to estimate spend manually. **→ Adeptly's Plan-Recipe will include cost prediction up front, addressing exactly this.**
2. **Subagent delegation is opaque.** Users complained Claude Code silently routes work to Haiku without telling them — only visible in verbose logs. **→ Adeptly's Sessions sidebar should surface per-subagent routing info (v0.4).**
3. **AutoDream's plans don't read your code.** Big complaint. Users wanted AI planning that *grounds in the existing repo*. **→ Adeptly's codebase-diff detection already does this for create/modify/delete declarations; v0.4 could deepen this with Explore-subagent-driven pre-plan scans.**
4. **Quality regression March-April 2026** — three Anthropic-side product changes caused users to feel Claude Code "got worse." Anthropic was slow to acknowledge; users felt gaslit. Fixed in v2.1.116 on April 20. **→ Reinforces: anything Adeptly suggests should be transparent about what model variant is being used and why. Build trust by showing the work.**
5. **Channels feature (Q1 2026)** — Claude Code instances can now talk to each other or to a human operator via the API. **→ Could close Adeptly's cross-session-visibility goal natively; worth experimenting with in v0.4-v0.5.**
6. **Agent-based Code Review (research preview, April 2026)** — Anthropic's own multi-agent PR review for Team/Enterprise. **Does not compete with Adeptly's plan review** (that's pre-code; this is post-code). Adeptly should explicitly position around the *pre-code* governance gap.
7. **Usage limits (improved May 2026)** — doubled for Pro/Max/Team. Less of a pain than it was, but Adeptly could surface "you've used X of your Y daily turns" in the Sessions sidebar.
8. **GitHub workflow integration is now widely-used** — `@claude` mentions in PRs/issues via the GitHub Action. Junior devs ask for Claude review before senior review. PMs use it for non-technical PR summaries. **→ Adeptly's plan-review fits the same mental model — "request review before committing" — but at the *plan* layer.**

### What's missing in Adeptly's current scope (gaps to address)

Ordered by impact:

1. **Cost prediction per plan** — already in v0.3 design (Plan-Recipe). Confirmed by research as a real pain.
2. **Subagent routing visibility** — could augment the Sessions sidebar (v0.4). Parse `~/.claude/projects/<slug>/*.jsonl` to extract subagent calls and which model they used.
3. **Codebase-aware plan drafting** — currently Adeptly checks "create X / modify Y / delete Z" lines against existence. Could add an Explore-subagent pass that pre-populates a plan template with relevant files. (v0.5)
4. **Plan templates by task class** — e.g. "auth change", "refactor", "new feature", "bug fix" — each with sensible defaults for the feature recipe.
5. **Cost monitoring AFTER the fact** — read transcripts, sum tokens, attribute to plans. *"You spent $3.20 implementing v0-product-plan vs the $0.42 predicted."* Closes the cost-transparency loop.
6. **CLAUDE.md generation from approved plans** — when a plan ships, append its outcome to the repo's `CLAUDE.md` so future Claude Code sessions inherit the context. (v0.6)

### What Adeptly should explicitly NOT do (based on this research)

- **Mobile / remote access** — CloudCLI dominates this and their AGPL-3.0 licence makes the space expensive to enter (any SaaS fork must open-source).
- **Autonomous execution loops** — Ralph TUI owns this. Their TUI form factor is niche; competing on autonomy without a TUI is awkward.
- **Multi-agent support (Cursor, Gemini, Codex)** — both competitors do this; we'd dilute the brand without winning. Stay Claude-Code-only and own the depth of Claude Code feature literacy.
- **Generic AI chat / "Claude Code in browser"** — exactly CloudCLI's territory.
- **AGPL-3.0 licensing** — keep Adeptly MIT (per ADR-004) so commercial teams aren't scared off.

### Research action items (carried forward)

- [ ] **Monthly cadence:** repeat this scan around the 19th of each month. Look for: new competitor entrants, new Anthropic Claude Code features, user complaint themes from HN/blogs.
- [ ] **Reddit access workaround:** since Anthropic crawler is blocked, periodically check r/ClaudeAI manually (via browser, paste interesting threads into this log).
- [ ] **Track Anthropic release notes:** [Claude Code release notes](https://code.claude.com/docs/en/whats-new) — anything that overlaps or invalidates Adeptly's positioning needs to be logged here within a week.
- [ ] **Talk to actual Claude Code users.** This research is all secondhand. Once v0.3 ships, do 5 user interviews specifically asking *"what do you wish Claude Code did differently?"* — record the answers verbatim in this log.

### Updated recommendation — next 2 weeks

Order of work, based on this synthesis:

1. **v0.3: Plan-Recipe** (LLM-driven suggestions via `claude --print`, no API key). 1 day.
2. **v0.3.1: Cost prediction in recipe.** Use Anthropic's published per-model pricing × predicted token count. Half day.
3. **Hostinger deploy.** ½ day, do this once v0.3 is in.
4. **Public soft-launch:** Tweet + Hacker News post comparing Adeptly to CloudCLI / Ralph / AutoDream with the side-by-side from this doc. Aim for 20 stars in week 1 to validate positioning.

If the launch lands, v0.4 (subagent routing visibility, cost monitoring) becomes a clear next step driven by competitive pressure.
