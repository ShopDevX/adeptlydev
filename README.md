# Adeptly

[![npm version](https://img.shields.io/npm/v/adeptly.svg)](https://www.npmjs.com/package/adeptly)
[![npm downloads](https://img.shields.io/npm/dm/adeptly.svg)](https://www.npmjs.com/package/adeptly)
[![license: MIT](https://img.shields.io/npm/l/adeptly.svg)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> **Plan-first companion for Claude Code.** Describe what you want to build — Adeptly drafts the full plan and bakes the right Claude Code features (subagents, skills, hooks, /security-review, MCP, plan mode, auto-memory) into each section. Then **run the plan as a crew**. Runs locally on your machine, uses your existing Claude Code subscription, never sends your code anywhere else.

```bash
npx adeptly
```

That's it. Opens at `http://localhost:3000`, reads plans from `docs/plans/` in your current directory, and uses your local `claude` CLI for everything AI-powered.

<!-- TODO(jai): drop screenshot here -->
<!-- <img src="public/screenshots/dark.png" alt="Adeptly in dark mode" width="900"> -->

---

## 🔒 Your code never leaves your machine

| What | Where it runs | What it sends |
|---|---|---|
| Adeptly web UI | `localhost:3000` on your box | nothing |
| Adeptly Node server | your box (started by `npx adeptly`) | nothing |
| `claude --print` subprocess | your box | the prompt and your local Claude CLI sends that to Anthropic — same as if you ran `claude` in your terminal yourself |

No SaaS backend, no API key, no telemetry, no analytics, no account. Adeptly is a thin GUI on top of your `claude` CLI. If you trust Claude Code, Adeptly adds zero new trust surface.

---

## Why Adeptly exists

If you're using Claude Code today, you're probably using maybe 15% of it. **Plan mode, subagents, skills, hooks, MCP servers, auto-memory** — most users never discover them. And when 3–5 developers share a repo and all use Claude to commit, nobody knows what anyone else is planning until the PR lands.

Adeptly solves both:

- **Discover the features you're paying for.** Every plan gets a recipe: which subagents to spawn, which skills to invoke, which hooks to wire, expected turn count. Feature names are underlined inline in the rendered plan with hover explanations — you learn what to use by reading your own plans.
- **One plan-first workflow for your whole team.** Plans live as markdown in `docs/plans/`. Every dev on the team sees the same plans, the same approval state. Git is the sync layer. No backend to manage.

> **The core of Adeptly stays the same:** it's the only tool that surfaces *every* Claude Code feature — subagents, skills, hooks, MCP, plan mode, /security-review, auto-memory — and tells you **exactly where and why to use each one**, inline in your own plans. Nobody else explains Claude Code like this. The Crew below just lets you *watch those features run*.

## 🚀 New in v0.5 — Crew: run the plan, don't just write it

Adeptly used to stop at the recipe (the plan's list of *which Claude features to use*). Now it closes the loop: the Crew **executes that recipe**, so the subagents, skills, and hooks Adeptly taught you about actually run — as a pipeline of roles, each a headless `claude` turn in your own repo:

```
Architect → Approval Gate → Builder → Medic → Reviewer → Security → Pilot (PR)
```

- **Architect** maps the code and confirms the approach (read-only).
- **Approval Gate** blocks anything from running until the plan is approved.
- **Builder** branches and implements the plan with the smallest sensible diff.
- **Medic** runs your build/tests and self-heals once if they fail.
- **Reviewer + Security** review the diff for regressions and security issues.
- **Pilot** commits, pushes, and opens the PR.

**Safety first:**

- **Dry-run by default.** Simulates the whole pipeline — no git, no `claude`, no PR. Run it anytime to preview the crew.
- **Live runs are double-gated:** the plan must be **approved** *and* you must start Adeptly with `ADEPTLY_LIVE=1`. Without both, live is refused.
- Still 100% local. The crew drives *your* `claude` CLI in *your* repo. Nothing new leaves your machine.

```bash
# enable real git + PR actions (off by default)
ADEPTLY_LIVE=1 npx adeptly
```

Every run is written to `docs/plans/runs/<slug>/` as JSON + an append-only `audit.jsonl` — a full, reviewable trail of what the crew did.

## Install

**Requirements:** Node 18.17+ and a working **Claude Code CLI** on your PATH.

```bash
# install claude code if you don't have it
npm install -g @anthropic-ai/claude-code

# try once without installing
npx adeptly

# or install globally
npm install -g adeptly
adeptly
```

Run it from inside any project folder. Adeptly scans `docs/plans/` and creates it if missing. If Claude Code isn't installed it'll show a banner with the exact install command and link to the docs.

### CLI flags

```
adeptly [options]

  --host <ip>          bind address (default 127.0.0.1)
                       use 0.0.0.0 to expose on your LAN
  --port <n>           preferred starting port (default 3000)
  --no-open-browser    skip the auto-open (useful over SSH / inside Docker)
  -h, --help           show usage
```

Env vars: `PORT` (= `--port`), `ADEPTLY_NO_OPEN=1` (= `--no-open-browser`).

## The product loop

1. **Open chat.** No plan selected? Describe what you want to build:
   > *"I want to refactor auth in our Next.js app to support passkeys alongside passwords."*

2. **Claude drafts the plan.** Full markdown with `# Problem`, `## Approach`, `## Files to change`, a Mermaid flow diagram, `## Risks`, and `## Approval` — and **with specific Claude Code features named in the right sections** (*"Use Plan Mode before writing code"*, *"Run `/security-review` before merging the session middleware"*).

3. **Read it.** Feature names are underlined inline with hover tooltips. The bottom strip shows numbered suggestions ("line 19: skill-security-review matched on 'password'"). The right panel catalogues all 30+ Claude Code features.

4. **Refine via chat.** Ask Claude *"What about token cost?"* — and below the reply you get an **Add to plan** card with content + a section target. One click, the recommendation lands in `## Risks` or wherever it belongs.

5. **Voice-driven or hands-free.** Click the 🎙️ mic to dictate in the chat (push-to-talk, browser Web Speech API). Or paste a screenshot with Ctrl+V and ask Claude to read it.

6. **Generate a recipe.** The ✨ Claude recipe tab calls your local `claude --print` and returns a structured workflow: subagent allocation by purpose, skills with when-to-invoke, hooks worth setting up, expected turns, step-by-step execution order.

7. **Approve.** Status flips draft → in-review → approved. When all reviewers sign off, the editor pulses mint-green for 1.5s.

8. **Copy plan + recipe as a Claude Code prompt** and paste into a fresh Claude Code session. Or just hand off the markdown file to your teammate.

9. **Or run the crew.** Open the **Crew** tab and hit *Run* — Adeptly executes the whole plan (branch → build → test → review → PR) through the role pipeline. Start in **Dry-run** to preview; switch to **Live** once the plan's approved.

## Multi-developer workflow

Plans are markdown files in git. That's the entire sync model.

- **Awareness:** the plans list shows git author + dirty-state markers, so you see who last touched what at a glance.
- **Review:** approvals live in `docs/plans/approvals/<slug>.json` alongside the plan. PR reviewers can read the plan markdown directly in GitHub's UI without installing Adeptly.
- **No conflicts:** each plan is its own file. Three devs on three plans never collide. Two devs editing the same plan resolve through normal git merge.
- **No backend:** Adeptly is local-first. No accounts, no central server, no real-time sync layer to fail.

## Folder structure

```
your-project/
  docs/
    plans/
      <slug>.md                 # the plan (markdown + Mermaid)
      approvals/
        <slug>.json             # reviewer state
      recipes/                  # gitignored — generated recipes
        <slug>.json
  .adeptly/                     # gitignored — chat uploads & runtime data
    uploads/
```

`.adeptly/` and `docs/plans/recipes/` are local-only; add to your `.gitignore` if Adeptly hasn't already.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> | Command palette — search + open plans |
| <kbd>⌘I</kbd> / <kbd>Ctrl+I</kbd> | Toggle chat with Claude |
| <kbd>⌘⇧F</kbd> / <kbd>Ctrl+Shift+F</kbd> | Focus mode (hide side panels) |
| <kbd>Shift+?</kbd> | Shortcuts overlay |
| <kbd>Esc</kbd> | Close overlay / exit focus mode |

## FAQ

**Q: Do I need a paid Claude account?**
Yes — you need [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and signed in. Adeptly shells out to `claude --print`; it never holds an API key of its own. The whole point is "use what you're already paying for, better."

**Q: Does my code get sent to Anthropic?**
Only when *you* invoke chat or recipe generation. At that moment Adeptly sends the current plan + your message + the Claude Code feature catalogue to your local `claude` CLI, which sends that to Anthropic — exactly as if you'd typed it into a `claude` terminal yourself. Adeptly itself never opens an outbound connection to anything other than `claude`.

**Q: Why a web UI instead of a TUI?**
Mermaid diagrams. Inline keyword underlining. Markdown rendering with images and tables. Multi-pane drag-to-resize. A terminal can't carry the planning experience we wanted.

**Q: Does it work offline?**
The UI does. Chat doesn't — it needs `claude --print`, which needs the internet to reach Anthropic.

**Q: Cursor / Continue / Aider — why this and not those?**
Those tools generate code. Adeptly starts one step upstream: it generates and refines the *plan* that becomes a Claude Code prompt. With the **Crew** it can also drive the implementation end-to-end (branch → build → test → PR) by orchestrating your own `claude` CLI — but the plan, and your approval, always come first.

**Q: Can my team use it together?**
Yes. Everyone installs `adeptly` and points it at the same repo. Plans are in git; approvals are in git; conflicts resolve like any other markdown file. No central server, no accounts.

**Q: Can I run it on a remote server / through a tunnel?**
Not officially yet. Roadmap includes `--host` and Cloudflare Tunnel support. For now it's localhost-only.

**Q: Where can I report bugs / request features?**
[GitHub issues](https://github.com/ShopDevX/adeptlydev/issues). Or DM in r/ClaudeAI / r/programming when this lands.

## Contributing

Adeptly is open source (MIT) and contributions are welcome — the codebase is a single Next.js app with a small local Node server, no backend, no accounts.

```bash
git clone https://github.com/ShopDevX/adeptlydev.git
cd adeptlydev
npm install
npm run dev        # http://localhost:3000
```

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the dev workflow, how the plan/recipe/crew pieces fit together, and the PR checklist. Good first issues are labelled [`good first issue`](https://github.com/ShopDevX/adeptlydev/labels/good%20first%20issue). By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Roadmap

- [x] Plan creation from chat, inline feature highlighting, recipe generation, approval workflow
- [x] **Crew runner** — execute a plan as a role pipeline (dry-run + live)
- [x] **Stack auto-detection** — reads your manifests (package.json, go.mod, Cargo.toml, …) so the plan + recipe tailor to your actual stack
- [ ] Per-run history browser + re-run from a previous run
- [ ] Crew theming (swap role names/colors — "movie crew" packs)
- [ ] Remote/tunnel support (`--host`, Cloudflare Tunnel)
- [ ] Parallel crew stages where the plan allows

## Status

**v0.6.x — beta on npm.** Feature set: plan creation from chat, inline feature highlighting, multi-dev git awareness, recipe generation, **crew runner (dry-run + live)**, **stack auto-detection** (plan + recipe tailor to your detected stack), approval workflow, command palette, focus mode, drag-resize splitters, voice input (push-to-talk), file + image upload, dark + light themes.

- npm: https://www.npmjs.com/package/adeptly
- repo: https://github.com/ShopDevX/adeptlydev

## License

MIT.

## Built by

[ShopDevX](https://github.com/ShopDevX).
