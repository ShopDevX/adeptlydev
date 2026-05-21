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

// --- Pre-flight checks ---------------------------------------------------

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

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => {
      srv.close(() => resolve(true));
    });
  });
}

async function pickPort(start = 3000, end = 3030) {
  for (let p = start; p <= end; p++) {
    if (await isPortFree(p)) return p;
  }
  return start;
}

// --- Browser open --------------------------------------------------------

function openBrowser(url) {
  if (process.env.ADEPTLY_NO_OPEN === "1") return;
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
  const desiredPort = parseInt(process.env.PORT || "", 10) || 3000;
  const port = await pickPort(desiredPort, desiredPort + 30);

  process.env.PORT = String(port);
  process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
  process.env.ADEPTLY_PROJECT_ROOT = USER_CWD;
  process.env.NODE_ENV = "production";

  // Standalone server expects to be run from its own directory.
  process.chdir(STANDALONE_DIR);

  const url = `http://localhost:${port}`;

  // Pretty banner
  const lines = [
    "",
    "  ╭─────────────────────────────────────────────────────╮",
    `  │  Adeptly  ·  ${url.padEnd(40)}│`,
    `  │  Plans:   ${path.join(USER_CWD, "docs", "plans").padEnd(43)}│`.slice(0, 60),
    "  ╰─────────────────────────────────────────────────────╯",
    "",
    "  Opening browser…  (press Ctrl+C to stop)",
    "",
  ];
  process.stdout.write(lines.join("\n"));

  setTimeout(() => openBrowser(url), 1200);

  // Hand off control to the standalone server
  require(SERVER_JS);
}

main().catch((err) => fail(err && err.message ? err.message : String(err)));
