#!/usr/bin/env node
/**
 * Adeptly CLI entry point.
 *
 * When a user runs `npx adeptly` (or `adeptly` after a global install)
 * in any project folder, this script:
 *   1. Captures the user's current working directory as the Adeptly
 *      project root (so plans, approvals, sessions, git info all read
 *      from THEIR repo, not from Adeptly's install location).
 *   2. Picks an available port starting at 3000.
 *   3. Boots the Next.js standalone server out of the package's own
 *      .next/standalone build.
 *   4. Opens the URL in the user's default browser after a short delay.
 */

const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

const USER_CWD = process.cwd();
const PKG_ROOT = path.resolve(__dirname, "..");
const STANDALONE_DIR = path.join(PKG_ROOT, ".next", "standalone");
const SERVER_JS = path.join(STANDALONE_DIR, "server.js");

function fail(msg, code = 1) {
  process.stderr.write(`adeptly: ${msg}\n`);
  process.exit(code);
}

// --- Args ---------------------------------------------------------------
// Parsed at the very top because --help / -h should work even when the
// build artifacts are missing.

function parseArgs(argv) {
  // Minimal flag parsing — no external deps for the bin entry point.
  //   --host=<ip>            bind address (default 127.0.0.1)
  //   --port=<n>             override desired starting port (also: PORT env)
  //   --no-open-browser      skip the auto-open
  //   --help / -h            print usage and exit
  const out = { host: "127.0.0.1", port: null, openBrowser: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else if (a === "--no-open-browser" || a === "--no-open") {
      out.openBrowser = false;
    } else if (a.startsWith("--host=")) {
      out.host = a.slice("--host=".length).trim() || "127.0.0.1";
    } else if (a === "--host") {
      out.host = (argv[++i] || "").trim() || "127.0.0.1";
    } else if (a.startsWith("--port=")) {
      const n = parseInt(a.slice("--port=".length), 10);
      if (!isNaN(n)) out.port = n;
    } else if (a === "--port") {
      const n = parseInt(argv[++i] || "", 10);
      if (!isNaN(n)) out.port = n;
    }
  }
  // Honour env var for backward compatibility
  if (process.env.ADEPTLY_NO_OPEN === "1") out.openBrowser = false;
  return out;
}

function printUsage() {
  process.stdout.write(
    [
      "",
      "Adeptly — plan-first companion for Claude Code",
      "",
      "Usage:",
      "  adeptly [options]",
      "",
      "Options:",
      "  --host <ip>          bind address (default 127.0.0.1; pass 0.0.0.0 to expose on LAN)",
      "  --port <n>           preferred starting port (default 3000)",
      "  --no-open-browser    don't auto-open the browser",
      "  -h, --help           show this message",
      "",
      "Env:",
      "  PORT                 same as --port",
      "  ADEPTLY_NO_OPEN=1    same as --no-open-browser",
      "",
    ].join("\n")
  );
}

// --- Pre-flight checks ---------------------------------------------------

// Parse --help / -h before the build-artifacts check so users on a broken
// install can still discover the flags.
const PRESERVED_OPTS = parseArgs(process.argv);

if (!fs.existsSync(SERVER_JS)) {
  fail(
    [
      "Build artifacts not found. The package is incomplete.",
      "If you are developing Adeptly itself, run:",
      "    npm run build && npm run pack:assets",
      "Then re-run `node bin/adeptly.js`.",
      `(Looked for: ${SERVER_JS})`,
    ].join("\n")
  );
}

// --- Port discovery ------------------------------------------------------

function isPortFree(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", () => resolve(false));
    srv.listen(port, host, () => {
      srv.close(() => resolve(true));
    });
  });
}

async function pickPort(start, end, host) {
  for (let p = start; p <= end; p++) {
    if (await isPortFree(p, host)) return p;
  }
  return start;
}

// --- Browser open --------------------------------------------------------

function openBrowser(url) {
  let cmd;
  let args;
  if (process.platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (process.platform === "win32") {
    cmd = "cmd.exe";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    // best-effort; user can copy the URL from the console
  }
}

// --- Main ----------------------------------------------------------------

async function main() {
  const opts = PRESERVED_OPTS;
  const host = opts.host;
  const desiredPort = opts.port || parseInt(process.env.PORT || "", 10) || 3000;
  const port = await pickPort(desiredPort, desiredPort + 30, host);

  process.env.PORT = String(port);
  process.env.HOSTNAME = host;
  process.env.ADEPTLY_PROJECT_ROOT = USER_CWD;
  process.env.NODE_ENV = "production";

  // Standalone server expects to be run from its own directory.
  process.chdir(STANDALONE_DIR);

  // For the browser URL: localhost is friendlier than 127.0.0.1 and works
  // identically; if the user bound to 0.0.0.0 we still open localhost.
  const browserHost = host === "0.0.0.0" || host === "127.0.0.1" ? "localhost" : host;
  const url = `http://${browserHost}:${port}`;

  // Pretty banner
  const lines = [
    "",
    "  ╭─────────────────────────────────────────────────────╮",
    `  │  Adeptly  ·  ${url.padEnd(40)}│`,
    `  │  Plans:   ${path.join(USER_CWD, "docs", "plans").padEnd(43)}│`.slice(0, 60),
    "  ╰─────────────────────────────────────────────────────╯",
    "",
    opts.openBrowser
      ? "  Opening browser…  (press Ctrl+C to stop)"
      : "  Browser auto-open disabled.  (press Ctrl+C to stop)",
    host !== "127.0.0.1"
      ? `  Bound to ${host}:${port} — visible on LAN. Make sure you trust this network.`
      : "",
    "",
  ];
  process.stdout.write(lines.filter(Boolean).join("\n") + "\n");

  if (opts.openBrowser) {
    setTimeout(() => openBrowser(url), 1200);
  }

  // Hand off control to the standalone server
  require(SERVER_JS);
}

main().catch((err) => fail(err && err.message ? err.message : String(err)));
