# Adeptly — Pre-Reddit Backlog (prioritised)

Source: [personas-and-feedback.md](./personas-and-feedback.md). Each row is a
specific change with a rough effort estimate. **P0** = must-fix before going
public (broken first impression or trust-killer). **P1** = high-value quick win
that materially raises adoption. **P2** = real value, defer to v0.5+.

The goal is: a colleague who installs `adeptly@latest` cold, opens it for the
first time, types one prompt, gets a usable plan, and walks away thinking
*"this is polished — I'll try it again tomorrow."* Everything below is scored
against that bar.

---

## P0 — must-fix before Reddit (target: tonight)

| # | Item | Effort | Why P0 | Files |
|---|---|---|---|---|
| P0-1 | **Pre-flight `claude` CLI check** at app startup + visible banner if missing/unauthenticated. Banner copy includes the exact `npm install -g @anthropic-ai/claude-code` and `claude login` commands. | M (45min) | Persona 1 + 9. Silent "claude --print failed" kills first-time users. Reddit will roast this. | `app/api/projects/route.ts` (add `claudeStatus` field) + `components/WelcomeEmpty.tsx` + new `components/ClaudePreflight.tsx` |
| P0-2 | **Starter-prompt chips** on empty chat: 3 clickable examples like "Build a CRUD API", "Refactor my routes for testability", "Audit my dependencies". One click → fills the textarea. | S (20min) | Persona 1, 4, 19. The empty chat is currently a vacuum. | `components/ChatPanel.tsx` |
| P0-3 | **Streaming progress feedback** in chat — even fake-streamed (chunked dots / staged messages like "Reading plan… Drafting response… Almost done…"). | M (30min) | Persona 9, 19. 30-60s of "thinking…" looks frozen; people kill the server. | `components/ChatPanel.tsx` (visual only) — bonus if we can actually stream from `claude --print`. |
| P0-4 | **Privacy section LOUD** in README + dedicated card on the WelcomeEmpty screen. State plainly: "Your code never leaves your machine. Adeptly runs on localhost, talks only to your local `claude` CLI." | S (20min) | Persona 12, 16, 17. Reddit users with infosec brains will not install otherwise. | `README.md` + `components/WelcomeEmpty.tsx` |
| P0-5 | **Light-mode contrast fix** for `bg-accent-gradient text-white` buttons + status chips. White-on-light-gradient is the most visible defect. | S (15min) | Persona 4, 14, 19. Looks broken on first impression in light mode. | `app/globals.css` (chip + gradient button rules) |
| P0-6 | **README rewrite for Reddit** — opening hook, screenshot (dark + light), Claude Code prerequisite called out, install commands, 3 use cases, FAQ. | M (45min) | Persona 14, 16, 20. npmjs.com page + GitHub README are the front door. | `README.md` (+ `public/screenshots/`?) |
| P0-7 | **Mermaid render-error UX** — inline editor below the error with line numbers + a "Fix with Claude" button that sends the broken mermaid block back to the chat. | S (25min) | Persona 2, 7. Silent or cryptic mermaid failure looks unprofessional. | `components/MarkdownPreview.tsx` |
| P0-8 | **Plans-list search** — top-of-list input that filters by title / filename / status. | S (20min) | Persona 4. 20+ plans → unusable without search. | `components/PlansList.tsx` |
| P0-9 | **Chat JSON-parse robustness** — when Claude returns malformed JSON, retry once with a "respond ONLY with valid JSON" reminder. If still bad, surface a yellow banner: "Claude returned an unexpected response — here's the raw text." | M (30min) | Persona 2. Silent feature-injection drops erode trust. | `app/api/chat/route.ts` |
| P0-10 | **Chat auto-scroll jank fix** — only scroll-to-bottom when a *new turn* arrives, not on every input keystroke. | XS (10min) | Persona 14. Jittery cursor on long chats. | `components/ChatPanel.tsx` (effect deps) |

**P0 total estimate: ~4 hours.**

---

## P1 — high-value quick wins (target: tonight if P0 finishes)

| # | Item | Effort |
|---|---|---|
| P1-1 | "Creating new plan…" toast when chat-without-plan-selected creates one. Currently just appears silently. | XS (10min) |
| P1-2 | Esc closes chat globally (not just when textarea focused). | XS (5min) |
| P1-3 | `--host` flag (default `127.0.0.1`) and `--no-open-browser` flag on `bin/adeptly.js` + README docs. | S (15min) |
| P1-4 | Auto-add `.adeptly/` to the *user's project* `.gitignore` on first upload (skip if already present, skip if not a git repo). | S (20min) |
| P1-5 | Image-attachment chip shows a 24×24 thumbnail. | S (15min) |
| P1-6 | "Clear all attachments" button next to the chip row. | XS (5min) |
| P1-7 | Editor textarea base font size 13px → 15px. | XS (5min) |
| P1-8 | Top-of-editor "Suggestions (3)" callout when Claude has unviewed injections. | S (20min) |
| P1-9 | Plans-list shows "edited Xm ago" relative time (server already computes git info; just render it again — we hid it but the data is still computed). | XS (10min) |

**P1 total estimate: ~2 hours.**

---

## P2 — defer (worth doing, not pre-Reddit)

- Multi-collaborator conflict detection (Persona 5).
- Slack / email notifications on approval state change (5).
- Plan version history with diff viewer (3, 16).
- "Send to terminal" with prefilled prompt (4).
- Notebook (.ipynb) export (10).
- PDF / slide-deck export (15).
- Domain-aware system prompt tuning (ML vs. fintech tone) (11).
- "Pin features I already use" filter (11).
- Plan-attachment gallery (13).
- Custom plan location per project (`docs/plans/` → configurable) (2).
- Multi-language plan generation + voice (15, 11).
- WYSIWYG editor toggle (15).
- DAG visualisation for data pipelines (10).
- Notion-style URL embed cards (18).
- GitHub Issue / CONTRIBUTING.md export (6).
- Reviewers auto-suggested from CODEOWNERS (3).
- Lock plan after approval (9).
- "Generate Bash runbook from plan" export (9).
- Cursor / Arc / preferred-browser setting (8).
- Video attachments (8).
- Vertical / compact layout below 1280px (8).
- Persistent chat history file under `.adeptly/chat-history/` (3).
- Path-not-found warning chip elevation (13).

---

## Out of scope tonight

- Anything that needs a hosted backend.
- Anything that touches Claude API rate / quota (we're a CLI passthrough).
- A real-time multi-cursor collab layer.

---

## Suggested execution order for tonight

1. **P0-1, P0-9** — touches the chat + API, fixes the worst UX trust holes. *45min + 30min.*
2. **P0-2, P0-3, P0-10** — chat surface polish. *20 + 30 + 10min.*
3. **P0-5, P0-7, P0-8** — UI correctness pass. *15 + 25 + 20min.*
4. **P0-4, P0-6** — README + welcome screen, the public face. *20 + 45min.*
5. **P1 sweep** if any time left.

If we stop after P0 we're already in a much better place for Reddit than 0.4.4.
