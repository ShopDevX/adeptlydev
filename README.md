# Adeptly

> **Plan-first companion for Claude Code.** Describe what you want to build — Adeptly drafts the full plan and bakes the right Claude Code features (subagents, skills, hooks, /security-review, etc.) into each section. Free, open source, runs on your machine, uses your existing Claude Code subscription.

```bash
# From any project folder
npx adeptly
```

That's it. Adeptly opens at `http://localhost:3000`, reads plans from `docs/plans/` in your current directory, and uses your local `claude` CLI for chat + recipe generation. **No API key. No cloud sync. No tracking.**

---

## Why

If you're using Claude Code today, you're probably using maybe 15% of it. Plan mode, subagents, skills, hooks, MCP servers, auto-memory — most users never discover them. And when 3–5 developers share a repo and all use Claude to commit, nobody knows what anyone else is planning until the PR lands.

Adeptly fixes both:

- **Discover the features you're paying for.** Every plan gets a recipe: which subagents to spawn, which skills to invoke, which hooks to wire, expected turn count, estimated cost. Inline feature names underline themselves in the rendered plan with hover explanations.
- **One plan-first workflow for your whole team.** Plans live as markdown in `docs/plans/`. Every dev on the team sees the same plans, the same approval state, and git tracks "who last touched what" automatically.

## Install

Requirements: **Node 18.17+** and a working **`claude` CLI** on your PATH (install Claude Code if you haven't).

```bash
# Try once without installing
npx adeptly

# Or install globally
npm install -g adeptly
adeptly
```

Run it inside any project folder. Adeptly will scan `docs/plans/` and create it if it doesn't exist.

## The product loop

1. **Open chat.** No plan selected? Describe what you want to build:
   > *"I want to refactor auth in our Next.js app to support passkeys alongside passwords"*
2. **Claude drafts the plan.** Full markdown with `# Problem`, `## Approach`, `## Files to change`, a Mermaid flow diagram, `## Risks`, and `## Approval` — and **with specific Claude Code features named in the right sections**. *"Use the Plan subagent before writing code"*, *"Run `/security-review` before merging the session middleware"*, etc.
3. **Read it.** Feature names are underlined inline with hover tooltips. The bottom strip shows numbered suggestions ("line 19: skill-security-review matched on 'password'"). The right panel catalogues all 30 Claude Code features.
4. **Refine via chat.** Ask Claude *"What about token cost?"* — and below the reply you get an **Add to plan** card with content + a section target. One click, the recommendation lands in `## Risks` or wherever it belongs.
5. **Generate a recipe.** The ✨ Claude recipe tab calls your local `claude --print` and returns a structured workflow: subagent allocation by purpose, skills with when-to-invoke, hooks worth setting up, expected turns, cost estimate, step-by-step execution order.
6. **Approve.** Status flips draft → in-review → approved. When all reviewers sign off, the editor pulses mint-green for 1.5s — small reward.
7. **Copy plan + recipe as a Claude Code prompt** and paste into a fresh Claude Code session. Or just hand off the markdown file to your teammate.

## Multi-developer workflow

Plans are markdown files in git. That's the entire sync model.

- **Awareness:** open Adeptly in any shared repo and the plans list shows the git author + a small dot indicator if a plan is dirty / untracked / staged. You see who last touched what at a glance.
- **Review:** approvals live in `docs/plans/approvals/<slug>.json` alongside the plan. PR reviewers can read the plan markdown directly in GitHub's UI without installing Adeptly.
- **No conflicts:** each plan is its own file. Three devs working on three plans never collide. Two devs editing the same plan resolve through normal git merge.
- **No backend:** Adeptly is local-first. No accounts, no central server, no real-time sync layer to fail.

## Folder structure

When you open a project, Adeptly works with this layout (creating it if missing):

```
your-project/
  docs/
    plans/
      <slug>.md                 # the plan (markdown + optional Mermaid)
      approvals/
        <slug>.json             # reviewer state + comments
      recipes/                  # gitignored — auto-generated recipes
        <slug>.json
```

Add `docs/plans/recipes/` to your `.gitignore` (Adeptly does this in its own repo).

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> | Command palette — search + open plans |
| <kbd>⌘I</kbd> / <kbd>Ctrl+I</kbd> | Toggle chat with Claude |
| <kbd>⌘⇧F</kbd> / <kbd>Ctrl+Shift+F</kbd> | Focus mode (hide side panels) |
| <kbd>Shift+?</kbd> | Shortcuts overlay |
| <kbd>Esc</kbd> | Close overlay / exit focus mode |

## How the Claude features get into your plan

Adeptly uses your local `claude --print` CLI (no API key, no separate billing). The chat module sends:

- Your message
- The current plan markdown (if any)
- The full Adeptly feature catalogue (30 features, categorised)
- A structured-output prompt asking Claude to either generate a new plan or suggest section-targeted injections

Claude returns JSON; Adeptly parses it, writes the plan / injection to disk, and the editor refreshes. The plan content has feature names in plain English — the inline-mark engine (a small client-side keyword matcher) underlines them so they're visible without you knowing they were there. Hover any underline for the explanation.

## What Adeptly is NOT

- It is **not a Claude API wrapper.** It uses your existing Claude Code subscription via the CLI.
- It is **not a SaaS.** No accounts, no cloud, no telemetry, no upsell.
- It is **not a Cursor replacement.** It sits alongside Claude Code; it doesn't generate code itself.
- It is **not "AI for everyone."** It is for developers who already use Claude Code and want to use it better.

## License

MIT.

## Status

v0.4.0 — **published on npm** (2026-05-21). Beta. Full feature set: plan creation from chat, inline feature highlighting, multi-dev git awareness, recipe generation, approval workflow, command palette, focus mode, dark + light.

- npm: https://www.npmjs.com/package/adeptly
- Install: `npm install -g adeptly` or run once with `npx adeptly`

## Built by

[Thoughtlume](https://github.com/Thoughtlume).
