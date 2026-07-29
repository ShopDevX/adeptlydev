# Security Policy

## Adeptly's threat model

Adeptly is **local-first**. It runs a Node server on your own machine and shells out to your local `claude` CLI. It has:

- no backend server we operate,
- no database,
- no API key of its own,
- no telemetry or analytics,
- no account system.

The only outbound network activity is your local `claude` CLI talking to Anthropic — exactly as if you ran `claude` in your terminal. This means Adeptly adds essentially no new trust surface beyond Claude Code itself.

The one privileged capability is the **Crew live runner** (`ADEPTLY_LIVE=1`), which lets Adeptly run `claude` with edit/write/bash tools and perform git/PR actions in the repo you opened. It is **off by default** and additionally gated behind an approved plan.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Instead, report privately via [GitHub Security Advisories](https://github.com/ShopDevX/adeptlydev/security/advisories/new) on this repository, or by opening a minimal private channel with the [ShopDevX](https://github.com/ShopDevX) organization.

Include:

- a description of the issue and its impact,
- steps to reproduce (a minimal repro is ideal),
- the version of Adeptly (`adeptly --help` / `package.json`) and your OS + Node version.

We aim to acknowledge reports within a few days and will keep you updated on the fix. Responsible disclosure is appreciated; we'll credit you in the release notes unless you prefer to remain anonymous.

## Supported versions

Adeptly is pre-1.0; security fixes land on the latest published `0.x` release.
