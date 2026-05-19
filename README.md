# Adeptly

> Use Claude Code properly. Plan first, team review, every feature surfaced.

**Domain:** [adeptly.dev](https://adeptly.dev) (to be registered)
**Status:** v0.3 alpha — runs on localhost.

## What this is

A local web app that sits alongside Claude Code (not replacing it) and adds three things developers using Claude Code today don't have:

1. **Plan-first enforcement** — write a markdown plan and flow diagram before any code change.
2. **Team review of plans** — multiple developers approve a plan, PR-style, before code is touched. GitHub collaborators integrate as one click.
3. **Feature discoverability** — surfaces Claude Code's hidden capabilities (subagents, skills, hooks, MCP, memory, scheduling, worktrees, /resume, …) so you actually use them. Plus contextual suggestions based on what your plan says.

## Running locally

```bash
cd C:\xampp8\htdocs\adeptly
npm install   # only first time
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Pick a project

Click the **Project** dropdown in the top right:
- **Open folder** — paste any local path; if it has no `docs/plans/`, Adeptly creates it.
- **Create new** — type a parent path + name; Adeptly creates the folder, seeds a starter plan, and switches to it.
- **Recent** — your last 10 opened projects (stored in localStorage).

The current project is remembered across reloads.

### GitHub collaborators as reviewers

If the open project has a `.git/config` with a `github.com` remote, Adeptly auto-detects it and pulls the contributors list. Add any contributor as a reviewer with one click.

For private repos: set `GITHUB_TOKEN` in your environment before `npm run dev`:

```powershell
$env:GITHUB_TOKEN = 'ghp_xxxxxxxxxxxxx'
npm run dev
```

A token with `repo` scope lets you fetch the full collaborator list (not just public contributors).

## What's in v0.3

| Feature | Status |
|---|---|
| Project picker (open / create / recent) | ✓ |
| Plans list (reads `<project>/docs/plans/*.md`) | ✓ |
| Markdown editor with live preview | ✓ |
| Mermaid diagram rendering | ✓ |
| Approval workflow (draft → in-review → approved/changes-requested) | ✓ |
| Per-reviewer approve / request-changes / remove | ✓ |
| Codebase change hint (detects "create X / modify Y / delete Z" lines) | ✓ |
| "Copy as Claude Code prompt" button (enabled once plan is approved) | ✓ |
| Catalogue of 30+ Claude Code features (categorised, filterable) | ✓ |
| Keyword-based contextual feature suggestions | ✓ |
| **✨ Plan-Recipe (v0.3)** — `claude --print` analyses the plan and returns a workflow recipe: which subagents to spawn, which skills to invoke, which hooks to set up, expected turns, cost estimate, step-by-step execution order | ✓ |
| Plan-Recipe is cached, content-hashed, marked stale on plan change | ✓ |
| "Copy plan + recipe as Claude Code prompt" — both in one paste | ✓ |
| GitHub remote detection + collaborators integration | ✓ |
| Add GitHub collaborator as plan reviewer in one click | ✓ |
| Collapsible left panel (plans list) | ✓ |
| Collapsible right panel (features / sessions) with side-mounted toggle | ✓ |
| Right panel tabs: Features / Sessions | ✓ |
| Recent Claude Code sessions (reads `~/.claude/projects/<slug>/*.jsonl`) | ✓ |
| Electron desktop wrapper | not yet (Next.js dev server is enough for v0) |
| Inline comment threads on plans | not yet (v0.4) |
| Plain-English plan summary for non-technical reviewers | not yet (v0.5) |

### How Plan-Recipe works

When you click **✨ Claude recipe** → **Generate Claude Code recipe**:

1. Adeptly assembles a structured prompt with your plan content + the 30-feature catalogue.
2. Adeptly spawns `claude --print` as a subprocess with that prompt on stdin.
3. The `claude` CLI runs using **your existing Claude Code authentication and subscription** — no separate API key, no billing setup, nothing to configure in Adeptly.
4. Claude returns a structured JSON recipe; Adeptly validates and caches it.
5. The UI renders the recipe as a scrollable card view with a "Copy plan + recipe" button that combines both into a single paste-ready Claude Code prompt.

**Side-effect benefit:** because `claude --print` inherits the current working directory's codebase context, the recipe is grounded in your actual repository — not just the plan text. This is exactly the gap Anthropic's own AutoDream feature has (it doesn't read existing code; users complain about this on HN/blogs).

## Architecture

- **Next.js 14 App Router + TypeScript + Tailwind**
- Plans + approvals live as files in `<project>/docs/plans/`. **No database.**
- All API routes accept `?projectRoot=<path>` — Adeptly is stateless; the client tells the server which project to read.
- Session transcripts read directly from `~/.claude/projects/`.
- GitHub remote parsed from `.git/config`; collaborators fetched from the public GitHub API (`GITHUB_TOKEN` upgrades to authenticated calls).
- **No own LLM integration** — we sit alongside Claude Code, never replace it.

## Folder structure

```
adeptly/
├── app/
│   ├── api/
│   │   ├── plans/                 # list, read, write plans
│   │   ├── approvals/             # plan status + per-reviewer decisions
│   │   ├── projects/              # init / info
│   │   ├── github/                # remote detection + collaborators
│   │   └── sessions/              # Claude Code transcripts
│   ├── layout.tsx
│   ├── page.tsx                   # 3-panel UI with project state + collapse
│   └── globals.css
├── components/
│   ├── ProjectPicker.tsx          # header dropdown: open/create/recent
│   ├── PlansList.tsx              # left panel, collapsible
│   ├── PlanEditor.tsx             # center: edit/preview, approval, tabs
│   ├── MarkdownPreview.tsx        # react-markdown + Mermaid
│   ├── FeatureSidebar.tsx         # right panel: 30+ features by category
│   ├── SessionsSidebar.tsx        # right panel: recent Claude Code sessions
│   ├── SuggestedFeatures.tsx      # plan-aware feature recommendations
│   └── GitHubReviewers.tsx        # collaborators → reviewers
├── lib/
│   ├── types.ts
│   ├── plans.ts                   # plan + approval file I/O
│   ├── projects.ts                # path resolution, init starter plan
│   ├── github.ts                  # .git/config parser + GitHub API
│   ├── sessions.ts                # Claude Code transcript reader
│   ├── features.ts                # static catalogue
│   └── feature-suggestions.ts     # keyword rule engine
├── docs/plans/                    # Adeptly's own plans (dog food)
└── README.md
```

## Licence

MIT.
