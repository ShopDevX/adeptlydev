import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Server-side directory browser. The browser cannot read absolute paths
 * for security reasons (File System Access API only exposes handles, not
 * paths). So we expose a constrained `ls` endpoint that lists directories
 * the server has access to.
 *
 * Returns the parent dir, the current dir, and a list of child directories.
 * Hidden directories (starting with `.`) and a few system dirs are filtered
 * out by default unless ?showHidden=1 is passed.
 */

const SKIP_NAMES = new Set([
  "node_modules",
  "$RECYCLE.BIN",
  "System Volume Information",
  "DumpStack.log.tmp",
]);

interface Entry {
  name: string;
  path: string;
}

async function listDir(target: string, showHidden: boolean): Promise<Entry[]> {
  const items = await fs.readdir(target, { withFileTypes: true });
  const dirs: Entry[] = [];
  for (const e of items) {
    if (!e.isDirectory()) continue;
    if (SKIP_NAMES.has(e.name)) continue;
    if (!showHidden && e.name.startsWith(".")) continue;
    dirs.push({ name: e.name, path: path.join(target, e.name) });
  }
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  return dirs;
}

export async function GET(req: NextRequest) {
  try {
    const target = req.nextUrl.searchParams.get("path");
    const showHidden = req.nextUrl.searchParams.get("showHidden") === "1";

    if (!target || target === "" || target === "~") {
      // Home dir as the default start
      const home = os.homedir();
      const children = await listDir(home, showHidden);
      return NextResponse.json({
        cwd: home,
        parent: path.dirname(home),
        children,
        roots: getRoots(),
      });
    }

    const resolved = path.resolve(target);
    const stat = await fs.stat(resolved).catch((e: any) => ({ err: e }));
    if (!stat || (stat as any).err) {
      return NextResponse.json({ error: "path does not exist" }, { status: 404 });
    }
    if (!(stat as any).isDirectory?.()) {
      return NextResponse.json({ error: "not a directory" }, { status: 400 });
    }

    const parent = path.dirname(resolved);
    const children = await listDir(resolved, showHidden);
    return NextResponse.json({
      cwd: resolved,
      parent: parent === resolved ? null : parent,
      children,
      roots: getRoots(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

function getRoots(): { name: string; path: string }[] {
  if (process.platform === "win32") {
    // Best-effort: list common drive letters
    const candidates = ["C:\\", "D:\\", "E:\\", "F:\\"];
    return candidates
      .filter((p) => {
        try {
          require("node:fs").accessSync(p);
          return true;
        } catch {
          return false;
        }
      })
      .map((p) => ({ name: p, path: p }));
  }
  return [{ name: "/", path: "/" }];
}
