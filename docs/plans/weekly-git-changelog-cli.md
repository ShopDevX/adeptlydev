# Weekly Git Changelog CLI

## 1. Problem

Manually skimming `git log` to write a weekly update is repetitive and easy to skip. We want a single Node script that reads the last seven days of commits from any Git repo and emits a clean, grouped changelog (features / fixes / chores) in Markdown — ready to paste into Slack, a release note, or an email.

## 2. Approach

Start in Plan Mode so the shape of the CLI is settled before any code lands. The deliverable is one file (`bin/changelog.mjs`) with no build step, parsing `git log --since='7 days ago' --pretty=format:...` via `child_process.execFileSync`, then grouping commits by Conventional Commit prefix.

Before writing, use the Explore subagent (quick breadth) to confirm there isn't already a script in `scripts/` or `bin/` we'd clash with. Wire up a Permission allowlist for `git log`, `git rev-parse`, and `node bin/changelog.mjs` so iteration doesn't stall on approval prompts.

After the first working version, run the simplify skill for a quality pass — this CLI should stay under ~150 lines, and simplify is good at catching premature abstraction in small scripts. Skip `/security-review`: no auth, no network, no user input beyond CLI flags.

Once shipped, register a CronCreate job — `every Monday 9am, run the script against this repo and post the output` — so the changelog actually gets generated without being asked.

## 3. Files to change

- `bin/changelog.mjs` — the CLI itself (new).
- `package.json` — add `"bin": { "changelog": "./bin/changelog.mjs" }` and a `type: module` field if missing.
- `README.md` — usage example, flags (`--since`, `--format`, `--repo`).

## 4. Flow

```mermaid
flowchart TD
    A[User runs `changelog`] --> B[Parse CLI flags]
    B --> C[Spawn `git log --since=7d`]
    C --> D{Commits found?}
    D -- No --> E[Print "No activity"]
    D -- Yes --> F[Parse Conventional Commit prefix]
    F --> G[Group: feat / fix / chore / other]
    G --> H[Render Markdown sections]
    H --> I[Write to stdout or --out file]
```

## 5. Risks

- **Non-conventional commit messages** dominate many repos — fallback bucket must be obvious, not hidden. Worth a Plan Mode check before coding.
- **Merge commits and squashes** can double-count or hide work; filter with `--no-merges` and verify against a real repo.
- **Shell escaping** on Windows vs POSIX — prefer `execFileSync` with an args array over a shell string. A PreToolUse hook blocking `exec` with shell strings would catch regressions.
- **Cron drift**: if you schedule it via CronCreate, confirm the working directory is the target repo, not the home dir.

## 6. Approval

Ready to enter Plan Mode and draft `bin/changelog.mjs`? Reply `go` and I'll start with the flag parser and `git log` invocation.
