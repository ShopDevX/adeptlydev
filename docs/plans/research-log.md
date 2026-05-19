# Adeptly Research Log

Append-only log of competitive intelligence and user-feedback research.
Add a new dated section per research run. Newest entries at top.

---

## 2026-05-19 (afternoon) — Adjacent market scan: "AI app builders for non-technical users"

**Goal:** Assess whether Adeptly should pivot to serve non-technical users ("vibe coding" market) or stay in the developer-team lane. Pulled in by direct user question 2026-05-19.

**Sources:**
- [Technically: 2026 vibe coding tool comparison](https://technically.dev/posts/vibe-coding-tool-comparison)
- [AI Coding Agents Benchmark 2026: Lovable vs Bolt vs Replit vs V0 vs Base44 vs Totalum](https://ai-agents-benchmark.com/)
- [Anna Arteeva on Medium: Choosing your AI prototyping stack](https://annaarteeva.medium.com/choosing-your-ai-prototyping-stack-lovable-v0-bolt-replit-cursor-magic-patterns-compared-9a5194f163e9)
- [Lovable's own Bolt/Replit/Lovable comparison](https://lovable.dev/guides/bolt-vs-replit-vs-lovable)
- [EPAM Insights: Vibe coding tools — real-design comparison](https://www.epam.com/insights/ai/blogs/best-vibe-coding-tools-v0-lovable-bolt-replit-and-figma-make)
- [Sketchflow: Best AI App Builders for Non-Technical Founders (zero-to-MVP in 2026)](https://www.sketchflow.ai/blog/product/best-ai-app-builders-non-technical-founders-zero-to-mvp-2026)
- [Lovable.dev pricing](https://lovable.dev/pricing)
- [Sacra: Lovable revenue, funding & growth rate](https://sacra.com/c/lovable/)
- [shipper.now: 40+ Lovable Statistics 2026](https://shipper.now/lovable-stats/)
- [Banani: I Tested Top AI App Builders of 2026](https://www.banani.co/blog/best-ai-app-builder)

### Market scale (numbers that matter)

- **Lovable**: 8M users, $200M ARR (Nov 2025), $6.6B valuation, $530M raised across 2025 (Series A $200M + Series B $330M). 100k new projects/day. 5M visits/day across Lovable-built apps. Scaled $1M → $100M ARR in 8 months — one of the fastest-growing software products on record.
- **Lovable pricing**: $25/mo for 100 credits; $20 Starter / $50 Launch / $100 Scale / custom Enterprise. Free tier 5 daily credits.
- **Bolt**: Lowest-barrier consumer adoption. Browser tab, type a prompt, see a result. No accounts.
- **Replit Agent**: Most feature-rich and full-stack. Slower builds, overwhelming UI for true non-coders.
- **Blink**: 500,000 apps built, 8-minute average idea-to-deployed time.
- **Gartner**: Named AI-native development platforms a top strategic tech trend for 2026.
- **89% of dev execs**: Building or planning citizen-developer strategy.
- **67% of non-technical founders**: Shipped first app within 1 week of adopting an AI builder in 2026.

### Pain points users actually report (with AI builders for non-tech users)

1. **Complex business logic still needs developers.** AI excels at standard patterns, slows on unusual custom logic.
2. **Code editor visibility scares non-tech users.** Bolt shows the code — powerful for devs, intimidating for non-coders.
3. **Legacy / production integration is brittle.** AI-generated prototypes break against real systems with technical debt.
4. **"Dory Problem"** — generative AI lacks persistent institutional understanding of the app's history and intent.
5. **Slow build speeds + overwhelming interface** (Replit).
6. **Once they have a real codebase, they can't participate in technical changes anymore.** They're locked out of their own product as soon as it grows past what the AI builder can do.

### Strategic read for Adeptly

**Direct competition with Lovable/Bolt/Replit is a non-starter.** Adeptly's architecture is fundamentally wrong for non-tech users — markdown plans, Mermaid diagrams, git, CLI integration, file paths, reviewer workflows. To compete head-on we'd be rebuilding from zero against an incumbent with 8M users and $6.6B valuation.

**However, an adjacent expansion makes sense — eventually.** Lovable's millions of users will (over the next 2–3 years) outgrow their AI builders and hire developers. Those developers will use Claude Code (or Cursor, etc.). The non-technical founder will still want oversight. **That's Adeptly's natural growth audience: "non-coders who oversee coders."** Same product architecture, different positioning:

> *"AI engineering oversight for product teams. Your developer codes with Claude. You approve the plan. Everyone stays informed without learning git."*

This is a positioning shift, not a rebuild. Adeptly's plan-review workflow translates almost directly — the only changes are:
- Tone of the docs / homepage (less Claude-Code-jargon, more "what's being built and is it on track")
- Maybe an LLM translation layer that renders the plan in plain English for non-tech reviewers
- A "tour mode" for first-time non-technical users explaining what a plan is

### What we should NOT do as a result of this research

- **Do not pivot to compete with Lovable/Bolt/Replit.** Different product, different distribution, different stack, much more crowded space.
- **Do not chase this expansion before validating v0.x with the Claude Code power-user audience.** Same trap Signalyn fell into — pivoting before validating audience #1.
- **Do not add no-code features (visual builder, app generation, hosted runtime) to Adeptly.** That dilutes the product and signals confused positioning.

### Trigger condition for revisiting

Re-open this question if **any** of these become true:
1. Adeptly has 100+ active users from the Claude Code power-user audience → expansion is a natural growth move.
2. Adeptly has <10 users 4 weeks after public launch → the original positioning is wrong, and "non-coder oversight" is the most promising pivot.
3. Lovable or a competitor announces they're entering the "post-MVP team handoff / oversight" space → defensive expansion needed.

### Action items added to backlog (not v0.3)

- [ ] **Plain-English plan summary mode** — LLM-generated 3-sentence summary of any plan, for non-tech reviewers. Triggered by a `[for-pm]` tag in the plan front-matter. (Candidate for v0.5)
- [ ] **"Approve without reading the code" UX** — when a non-tech reviewer approves a plan, they're approving the *outcome* described, not the *implementation*. Make this clear in the UI. (v0.5+)
- [ ] **Sample plans repo for product-manager-style reviewers** — show what a plan looks like from a PM's perspective, with annotations. Onboarding material for the eventual expansion. (v1.0)

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
