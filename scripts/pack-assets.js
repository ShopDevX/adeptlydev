#!/usr/bin/env node
/**
 * Post-`next build` step for the npm package.
 *
 * Next.js standalone output (`.next/standalone/`) is intentionally
 * minimal: it has server.js, a tiny package.json, and the trimmed
 * node_modules — but it does NOT include `.next/static` or `public/`.
 * Those need to be copied IN so the runtime can serve them.
 *
 * Run this AFTER `next build` and BEFORE shipping the package.
 */

const path = require("path");
const fs = require("fs");

const PKG_ROOT = path.resolve(__dirname, "..");
const STATIC_SRC = path.join(PKG_ROOT, ".next", "static");
const STATIC_DEST = path.join(PKG_ROOT, ".next", "standalone", ".next", "static");
const PUBLIC_SRC = path.join(PKG_ROOT, "public");
const PUBLIC_DEST = path.join(PKG_ROOT, ".next", "standalone", "public");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
  return true;
}

function main() {
  if (!fs.existsSync(path.join(PKG_ROOT, ".next", "standalone", "server.js"))) {
    process.stderr.write(
      "pack-assets: standalone build not found. Run `next build` first.\n"
    );
    process.exit(1);
  }

  const staticCopied = copyDir(STATIC_SRC, STATIC_DEST);
  const publicCopied = copyDir(PUBLIC_SRC, PUBLIC_DEST);

  process.stdout.write(
    [
      `pack-assets:`,
      `  .next/static  -> .next/standalone/.next/static  ${staticCopied ? "ok" : "(skipped)"}`,
      `  public        -> .next/standalone/public        ${publicCopied ? "ok" : "(skipped)"}`,
      "",
      "Standalone bundle is ready. Try:",
      "  node bin/adeptly.js",
      "",
    ].join("\n")
  );
}

main();
