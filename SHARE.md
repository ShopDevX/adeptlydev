# Adeptly — quick install (from tarball)

Hey — this is `adeptly`, a plan-first companion for Claude Code. Free,
runs locally, no API key — it uses **your own** Claude Code subscription
via the local `claude` CLI.

## Install (one of these)

**Global install — recommended.** Adds an `adeptly` command anywhere.

```bash
npm install -g ./adeptly-0.4.0.tgz
```

**Or run once without installing:**

```bash
npx ./adeptly-0.4.0.tgz
```

**Or local-to-a-project install:**

```bash
npm install ./adeptly-0.4.0.tgz
npx adeptly
```

## Run

In any project folder where you want to plan work:

```bash
cd /path/to/your/repo
adeptly
```

You should see:

```
  ╭─────────────────────────────────────────────────────╮
  │  Adeptly  ·  http://localhost:3000                  │
  │  Plans:   /path/to/your/repo/docs/plans             │
  ╰─────────────────────────────────────────────────────╯

  Opening browser…  (press Ctrl+C to stop)
```

Your default browser opens to **http://localhost:3000**. Adeptly scans
`docs/plans/` in the current directory (creates it if missing).

## What you do once it's up

1. **Open the Chat panel** (Ctrl+I) and describe what you want to build:
   > *"I want to add Stripe subscription billing to my SaaS"*
2. Claude drafts the full plan in ~25-35s — Problem, Approach, Files to
   change, a Mermaid flow diagram, Risks, Approval.
3. Inside the plan you'll see Claude Code feature names
   (Plan Mode, Explore subagent, /security-review, …) underlined inline.
   Hover any underline for an explanation.
4. Keep chatting to refine — Claude offers **Add to plan** cards that
   inject new content into the right section of the plan.
5. **Generate Claude Code recipe** (✨ tab) — Claude tells you which
   subagents to spawn, which skills to invoke, expected turn count, cost
   estimate.

## Requirements

- Node 18.17+
- `claude` CLI on PATH (install Claude Code if you haven't)

## Multi-developer note

Plans live as markdown in `docs/plans/`. Commit them to git like any
other source file. The whole team can run Adeptly in the same repo;
git is the sync layer. Adeptly shows the last commit author + a small
git-status dot on each plan.

## Shortcuts

| | |
|---|---|
| `Ctrl+I` | Chat with Claude |
| `Ctrl+K` | Command palette (search plans) |
| `Ctrl+Shift+F` | Focus mode (hide side panels) |
| `Shift+?` | All shortcuts overlay |

## Anything broken?

Ping Jai. It's pre-release; this tarball is to get a small group
trying it before I publish to npm publicly.
