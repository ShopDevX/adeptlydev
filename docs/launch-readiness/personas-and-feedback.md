# Adeptly v0.4.4 — Pre-Reddit Red-Team

> Synthesised first-time-user reports across 20 developer profiles. Each entry
> is a structured red-team of the *current* product (not fan-fiction). Items
> are written as the persona would write them in a public thread, then triaged
> in [backlog.md](./backlog.md).

---

## 1 · Junior fullstack (year-2, UK, learning Claude Code)
**Project tried:** Personal portfolio site with a contact form.
**Setup time to first chat reply:** ~9 min (most of it spent confused).
**Feedback:**
- "When I opened it I had no idea what to type in the chat. A starter prompt or 3 example chips like *'Build a CRUD API'*, *'Refactor my routes'*, *'Audit my dependencies'* would help."
- "I don't know what the right-side **Features** sidebar is for. Names like *Plan Mode*, */security-review* mean nothing to me until I click them and Adeptly explains."
- "The empty plans list says *'No plans yet'* but the **Create your first plan** button just makes an empty file. I expected it to walk me through it like the chat does."
- "I didn't realise the chat needed `claude` installed. Got an error like `claude --print failed` and bounced. A pre-flight check at startup that says *'Claude Code not detected — install with `npm install -g @anthropic-ai/claude-code`'* would have saved me."

## 2 · Senior backend (Go, 8 yrs, Berlin)
**Project tried:** Read-replica failover script for a Postgres-backed service.
**Setup time:** ~2 min, comfortable.
**Feedback:**
- "Plan generator gave me a markdown plan but its `## 4. Flow` was a mermaid block that wouldn't render — *'Mermaid render error: Parse error on line 3'*. The Edit tab still let me fix it but I'd love an inline editor that flags the offending line."
- "Why is *every* generated plan landing in `docs/plans/`? In a Go repo that's clutter. Let me set a custom location per project."
- "The chat keeps the prompt history but the JSON-parsed `feature_injections` are sometimes empty when Claude clearly meant to suggest something. Looks like a parse failure — needs a visible 'Claude returned malformed JSON, retrying' state instead of silently dropping suggestions."
- "Plan approval is a JSON file in the repo. I want a status barometer at the top of every plan that I can change from CLI too, not just the web UI."

## 3 · Staff engineer (Rust, payments fintech, NYC)
**Project tried:** Audit of a webhook idempotency middleware.
**Setup time:** ~3 min.
**Feedback:**
- "I need to share a plan with a colleague. There's no 'Copy share URL' or 'Export to PR description' affordance — I had to copy-paste markdown."
- "Approvals JSON references reviewers by GitHub username but doesn't verify they exist on the repo's CODEOWNERS. Should auto-suggest from CODEOWNERS."
- "The chat history is per-plan in localStorage. If I switch browsers I lose it. At minimum the chat history should be optionally persisted under `.adeptly/chat-history/<slug>.json` so my plan and conversation are colocated."
- "No undo for plan content changes. I want a Cmd+Z that walks me back through Claude's injections."

## 4 · Indie hacker / solopreneur (TS+Bun, indie SaaS, Lisbon)
**Project tried:** Subscription churn analytics dashboard.
**Setup time:** ~1 min, immediately useful.
**Feedback:**
- "**Love** the mic. Voice → plan in 30 seconds beats any tool I've used."
- "I need a `'Send to Claude Code' → opens a terminal with the prompt prefilled` button. Right now I copy the prompt manually and paste it."
- "When I have 20+ plans the left sidebar becomes a scroll-fest with no filter. Add a search box."
- "Light mode is gorgeous but the accent gradient on buttons is hard to read on light — the text is white on a too-light gradient."

## 5 · Agency lead (5 contractors, Mumbai)
**Project tried:** Client e-commerce migration plan (Shopify → custom).
**Setup time:** ~5 min.
**Feedback:**
- "I have 5 contractors using Adeptly on the same monorepo. No way to see who edited which plan unless I `git blame` the file. A 'last edited by' chip in the plans list would help."
- "Approvals need email/Slack notifications. Right now my contractors don't know a plan needs review unless I ping them out-of-band."
- "Two of my contractors edited the same plan and overwrote each other. Need a conflict-detection step before save."
- "Can the chat be addressable across team members? Like `@maya please check the migration risks` would inject Maya as a reviewer."

## 6 · OSS maintainer (Python, Django ecosystem, Toronto)
**Project tried:** Plan for upgrading an OSS project from Django 4 → 5.
**Setup time:** ~3 min.
**Feedback:**
- "If I `git push` a plan, my contributors should be able to `git pull` and see it in their Adeptly the moment they refresh. That works! Big win."
- "But there's no notification that the plan changed. A subtle badge on the plans list ('updated 2 min ago') would be enough."
- "I'd like a `CONTRIBUTING.md` template generator that includes the plan-first workflow as a step."
- "When I export a plan as a Claude Code prompt, I want to also export it as a **GitHub Issue body** with checkboxes."

## 7 · Frontend specialist (React, design system, Tokyo)
**Project tried:** Storybook + design tokens migration plan.
**Setup time:** ~2 min.
**Feedback:**
- "The plan editor's preview tab is *good* but feels read-only. Add a 'Toggle live edit' that lets me edit in the rendered view (a la Notion)."
- "When I paste a Figma URL into the plan, nothing happens. Could it fetch the OG image and embed?"
- "Mermaid diagrams use the *base* theme which is grey/boring. Use the project's accent gradient for node fills — it'd feel more Adeptly-native."
- "The image paste works but there's no preview thumbnail in the chip. A 24x24 thumbnail would help me confirm I pasted the right screenshot."

## 8 · Mobile dev (Flutter, healthtech wearables, Bangalore)
**Project tried:** BLE pairing flow for a wearable.
**Setup time:** ~4 min.
**Feedback:**
- "Layout breaks below 1280px wide — the right sidebar overlaps the editor. I'm on a 13'' MacBook and the chat eats 35% of the screen."
- "Add a vertical layout / 'compact mode' for narrower screens."
- "No way to attach a video. My pairing flow has a 10s screencast that explains it better than a screenshot."
- "When I run `adeptly` it opens Chrome by default but I use Arc — let me set a preferred browser."

## 9 · DevOps / SRE (Terraform + k8s, Sydney)
**Project tried:** Runbook for blue/green canary rollouts.
**Setup time:** ~6 min (slow because the `claude` CLI prompted me to re-auth).
**Feedback:**
- "The chat just hung for 90 seconds while `claude --print` was re-authenticating. No spinner update, no log, just *'thinking…'*. I almost killed the server."
- "Pre-flight should run `claude --version` *and* `claude config get` so I know auth is fine before I waste a prompt."
- "For runbooks, Plan Mode features aren't enough. I want a 'Generate Bash runbook from plan' export that I can save next to it."
- "No way to lock a plan after approval. Anyone who pulls the repo can edit it post-sign-off."

## 10 · Data scientist (Jupyter + DuckDB, Amsterdam)
**Project tried:** ETL pipeline plan for clickstream → DuckDB.
**Setup time:** ~3 min.
**Feedback:**
- "Plans-as-markdown is great but I work in `.ipynb`. Could it also output an empty notebook scaffold matching the plan sections?"
- "The chat doesn't recognise my pasted CSV file — it just tells Claude *'attached CSV, ~12KB'* but Claude doesn't summarise it without me asking explicitly. The prompt should default to 'inspect attached data files first'."
- "Mermaid is fine for flowcharts but for a data pipeline I'd want a real DAG visualisation."

## 11 · ML engineer (PyTorch + Triton, fine-tuning, SF)
**Project tried:** Plan for distilling a 70B → 8B model.
**Setup time:** ~2 min.
**Feedback:**
- "Generated plan was excellent. But the output language is *very* SaaS-y — 'ship sharper', 'plan first'. ML folks want technical precision; tweak the system prompt to match the domain (which it can infer from the project context)."
- "I need a way to pin specific Claude Code features I've already adopted so the suggestions don't keep recommending them ('You should use Plan Mode' — I am, thanks)."
- "Show GPU/inference cost estimates as plan annotations when the plan mentions training."

## 12 · Security engineer (Burp + nuclei, remote)
**Project tried:** Plan for a custom static-analysis rule for an internal scanner.
**Setup time:** ~4 min.
**Feedback:**
- "The README needs to be **explicit** about privacy. 'Local-first, your code never leaves your machine' should be the *second* sentence on the landing page, not buried."
- "What does the dev server expose? Port 3000 is the default and I'm worried about LAN scanning. Add a `--host 127.0.0.1` and document it."
- "The chat upload endpoint accepts any file type up to 25MB. What stops a colleague from path-traversing the filename and writing to my home dir? (I tried `../../../etc/passwd` — sanitised, OK, but worth documenting as a hardened claim.)"
- "Add a `--no-open-browser` flag for headless servers / pair programming over SSH."

## 13 · Game dev (Unity, indie roguelike, Warsaw)
**Project tried:** Procedural map generator design.
**Setup time:** ~5 min.
**Feedback:**
- "Plans for game design need *art references*. The image attach is great but the chat throws them away after one turn — I want a persistent 'plan attachments gallery'."
- "Unity uses `.cs` files in deep nested folders. The plan's 'Files to change' section listed paths that don't exist because Claude guessed. Show a **path-not-found warning chip** when this happens (you already have *plan/codebase mismatch* — make it more prominent)."

## 14 · Designer-who-codes (Figma + React, Brooklyn)
**Project tried:** Component library audit.
**Setup time:** ~2 min.
**Feedback:**
- "Typography in the plan editor is *too* small. The Edit tab textarea is `text-sm` (13px). For long planning sessions that's eye-strain. Default to `text-base` (15px) and let users shrink if they want."
- "When the chat is open + I'm typing, the cursor jumps around — feels janky. (Suspected: the auto-scroll-to-bottom effect re-runs on every keystroke.)"
- "No dark mode preview in the README. Add screenshots of both."
- "The wordmark is gradient — it doesn't stand out on the GitHub README rendered in light mode."

## 15 · Educator / bootcamp instructor (NYC, teaches Node)
**Project tried:** Curriculum plan for a 12-week course.
**Setup time:** ~3 min.
**Feedback:**
- "I want to **export a plan as a slide deck** (PDF or simple HTML). Right now I screenshot and paste."
- "The 'Copy as Claude Code prompt' button is brilliant *for the student*. Could there be a 'Copy as instructor brief' that strips the implementation details?"
- "Students will struggle with the markdown editor. A WYSIWYG fallback would help."
- "Multi-language: I teach in Spanish — let me set the plan-generation language."

## 16 · Climate-tech founder (Carbon accounting startup, Berlin)
**Project tried:** Plan for ingesting EnergyStar emissions data.
**Setup time:** ~4 min.
**Feedback:**
- "I wish I could feed Adeptly a **PDF spec doc** and have it draft the plan from it. The file upload accepts PDFs but Claude only reads text — large PDFs blow the context."
- "Plan history (versioning) is invisible to me. I edited the plan 5 times today and have no idea what changed when."
- "The README claims 'free' but I have a Claude Code subscription. I can imagine someone reading 'free' on Reddit and being upset that they still need a Claude sub. Be explicit about that prerequisite."

## 17 · Healthtech compliance-aware (HIPAA-aware patient app, Boston)
**Project tried:** Patient portal MVP plan.
**Setup time:** ~3 min.
**Feedback:**
- "PHI concern: when I attach a screenshot of a patient record, it ends up in `.adeptly/uploads/`. That directory is gitignored, good — but I'd like a 'clear all attachments' button + auto-expiry after 24h."
- "Compliance plans need an 'evidence' attachment slot per section, not just a global one."
- "The README should clarify whether Claude's local CLI sends anything to Anthropic when in `--print` mode (it does — prompt+response — and that's fine but say so)."

## 18 · Fintech / payments engineer (Stripe-heavy SaaS, Singapore)
**Project tried:** Plan for SCA-compliant subscription upgrades.
**Setup time:** ~2 min.
**Feedback:**
- "Plan editor doesn't support footnotes-style references. For a fintech audit I want `[1]` linked to a Stripe doc URL."
- "Embed external URLs as cards in the preview, like Notion does."
- "Suggestions sidebar is buried in the bottom tabs. If Claude has 4 recommendations I want a banner at the top of the editor — currently I have to click to find them."

## 19 · B2B SaaS founder (multi-tenant billing, Tel Aviv)
**Project tried:** Migration plan for tenant isolation refactor.
**Setup time:** ~3 min.
**Feedback:**
- "I tried to start chatting *before* I had a plan, expecting Adeptly to create one. It worked! But the UI didn't tell me that's what it was about to do — the new plan just appeared and the chat continued. A subtle 'Creating plan…' toast would build trust."
- "Each chat message takes 30-60s. I want a streaming token view — even fake-streamed by chunking the response — so I know it's alive."
- "The 'Approved' chip in light mode is hard to spot. Use a sharper green."

## 20 · Browser extension dev (Chrome MV3, Helsinki)
**Project tried:** Plan for a tab-suspender extension.
**Setup time:** ~4 min.
**Feedback:**
- "Chrome extensions can't easily inject content scripts — your plan generator suggested using `chrome.scripting.executeScript` which is fine, but didn't warn about MV3 service-worker lifetimes. The Claude Code features sidebar is generic; could it surface ecosystem-specific tips?"
- "The chat panel doesn't close with `Esc` if focus isn't already inside the chat textarea. The shortcut feels inconsistent."
- "I noticed the page **flashes white** for half a second on first load before dark mode kicks in. (Wait — I had localStorage cleared. Otherwise it doesn't.) Worth handling the very-first-time case."
- "The npm publish page on npmjs.com is text-only with no preview image — Reddit users will look at it. Add an `og:image` or at least a representative GIF."

---

## Cross-cutting observations (recurring across personas)

The same gaps surface multiple times. These are the highest-signal items for prioritisation:

| Theme | Mentioned by # personas | Headline |
|---|---|---|
| First-run guidance / starter prompts | 1, 4, 19 | New users don't know what to type. |
| Pre-flight check for `claude` CLI | 1, 9 | Confusing failure when CLI not installed/auth'd. |
| Streaming / progress feedback | 9, 19 | 30-60s "thinking…" looks frozen. |
| Privacy story prominence | 12, 16, 17 | Local-first is buried. |
| Light-mode contrast on buttons / chips | 4, 14, 19 | Accent gradient text washes out. |
| README screenshot / Reddit-readiness | 14, 20 | No visuals; bad first impression on social. |
| JSON parse robustness in chat | 2 | Silent injection drops. |
| Search / filter in plans list | 4 | Scrolls badly past ~20 plans. |
| Mermaid theming + error reporting | 2, 7 | Cryptic failures, off-brand. |
| Multi-collaborator awareness | 5, 6 | No conflict detection, no notify. |
| Plan-not-yet-selected chat affordance | 19 | Works but unannounced. |
| Auto-scroll-on-typing jank in chat | 14 | Cursor flicker. |
| Language / locale beyond en-US | 11, 15 | Voice + plan output English only. |
| Reddit credibility — "is my code safe?" | 12, 16, 17 | Needs Loud Privacy section in README. |
