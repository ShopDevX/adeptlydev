# Contributing to Adeptly

Thanks for wanting to make Adeptly better. It's a small, local-first tool with no backend — easy to run, easy to reason about. This guide gets you productive fast.

## TL;DR

```bash
git clone https://github.com/ShopDevX/adeptlydev.git
cd adeptlydev
npm install
npm run dev          # http://localhost:3000
```

Then, before you open a PR:

```bash
npm run type-check   # must pass (CI gate)
npm run build        # must pass (CI gate)
npm run lint         # optional — ESLint isn't fully wired up yet; help welcome
```

## What Adeptly is (and isn't)

- **Is:** a Next.js app + a thin local Node server (`bin/adeptly.js`) that reads plans from `docs/plans/` in the user's current repo and shells out to the local `claude` CLI.
- **Isn't:** a SaaS. There is **no backend, no database, no API key, no telemetry, no account**. Everything is local files + `claude --print`. Please keep it that way — PRs that add outbound network calls, analytics, or accounts will be declined.

## Project layout

```
app/                 Next.js App Router (UI + /api routes)
  api/               route handlers (plans, recipe, runs, chat, github, …)
components/          React components (PlanEditor, CrewPanel, PlanRecipe, …)
lib/                 core logic (no React):
  plans.ts           read/write plans + approvals (docs/plans/*.md)
  plan-recipe.ts     generate the Claude Code "recipe" for a plan
  crew.ts            the Crew runner — execute a plan as a role pipeline
  claude-cli.ts      headless `claude --print` wrapper
  git.ts, github.ts  local git + GitHub metadata
bin/adeptly.js       the CLI entry (starts the standalone server)
docs/plans/          example/dogfood plans (we eat our own dog food)
```

### How the pieces fit together

1. **Plan** — markdown in `docs/plans/<slug>.md`, with an approval record in `approvals/<slug>.json`.
2. **Recipe** (`lib/plan-recipe.ts`) — asks `claude` which subagents/skills/hooks/order fit *this* plan. Advisory.
3. **Crew** (`lib/crew.ts`) — *executes* the plan as a pipeline: Architect → Approval Gate → Builder → Medic → Reviewer → Security → Pilot. Dry-run by default; live runs require `ADEPTLY_LIVE=1` **and** an approved plan.

If you're adding a feature, it almost always touches one `lib/*.ts` module + one `app/api/*` route + one `components/*.tsx`. Follow the existing trio (see how `recipe` or `runs` is wired end-to-end).

## Coding conventions

- **TypeScript, strict.** `npm run type-check` must be clean.
- **Tailwind with the existing tokens** (`bg-elevated`, `text-fg`, `text-accent-1`, `bg-accent-gradient`, `chip-*`). Don't hardcode hex colors in components — use the tokens so light/dark both work.
- **Lucide icons**, sized ~14–16px in panels.
- **API routes** return `NextResponse.json({...})`, use `resolveProjectRoot(...)`, and never throw raw — wrap in try/catch and return `{ error }`.
- **No new runtime dependencies** without discussion — keep the install light.
- Match the surrounding code's naming and comment density.

## Commit & PR

- Branch off `main`: `feat/…`, `fix/…`, `docs/…`.
- Keep PRs focused. One feature/fix per PR.
- Conventional-commit style messages are appreciated (`feat:`, `fix:`, `docs:`, `chore:`).
- In the PR description: what changed, why, and how you tested it. Screenshots for UI changes.
- Make sure `type-check`, `lint`, and `build` pass (CI runs all three).

## Good first issues

Look for the [`good first issue`](https://github.com/ShopDevX/adeptlydev/labels/good%20first%20issue) label. UI polish, new keyboard shortcuts, extra recipe heuristics, and crew-stage improvements are all approachable.

## Reporting bugs / requesting features

Open an [issue](https://github.com/ShopDevX/adeptlydev/issues) using the templates. For security issues, see [SECURITY.md](./SECURITY.md) — please don't file those publicly.

By contributing you agree your contributions are licensed under the project's [MIT License](./LICENSE) and that you follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
