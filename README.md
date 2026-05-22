# Adeptly

> **Plan-first companion for Claude Code.** Describe what you want to build — Adeptly drafts the full plan and bakes the right Claude Code features (subagents, skills, hooks, /security-review, MCP, plan mode, auto-memory) into each section. Runs locally on your machine, uses your existing Claude Code subscription, never sends your code anywhere else.

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
Those tools generate code. Adeptly doesn't generate code; it generates and refines the *plan* that becomes a Claude Code prompt. Then you hand off to Claude Code (or any code-gen tool) for the implementation. Adeptly is the upstream step, not a replacement.

**Q: Can my team use it together?**
Yes. Everyone installs `adeptly` and points it at the same repo. Plans are in git; approvals are in git; conflicts resolve like any other markdown file. No central server, no accounts.

**Q: Can I run it on a remote server / through a tunnel?**
Not officially yet. Roadmap includes `--host` and Cloudflare Tunnel support. For now it's localhost-only.

**Q: Where can I report bugs / request features?**
[GitHub issues](https://github.com/ShopDevX/adeptlydev/issues). Or DM in r/ClaudeAI / r/programming when this lands.

## Status

**v0.4.x — beta on npm.** Feature set: plan creation from chat, inline feature highlighting, multi-dev git awareness, recipe generation, approval workflow, command palette, focus mode, drag-resize splitters, voice input (push-to-talk), file + image upload, dark + light themes.

- npm: https://www.npmjs.com/package/adeptly
- repo: https://github.com/ShopDevX/adeptlydev

## License

MIT.

## Built by

[ShopDevX](https://github.com/ShopDevX).
