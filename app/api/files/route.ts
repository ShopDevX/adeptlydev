import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveProjectRoot } from "@/lib/projects";

export const dynamic = "force-dynamic";

const MAX_PREVIEW_BYTES = 1 * 1024 * 1024; // 1 MB cap on file preview
// Directories that are noise in 99% of projects — hide by default. The user
// can still open a file by typing its path; we just don't enumerate them.
const HIDDEN_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "dist",
  "build",
  "out",
  ".idea",
  ".vscode",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".venv",
  "venv",
  "target",
  "vendor",
]);

interface DirEntry {
  name: string;
  kind: "dir" | "file";
  size?: number;
  ext?: string;
}

/**
 * Ensure the requested relative path doesn't escape projectRoot. Returns
 * the absolute path on success, null otherwise.
 */
function resolveSafe(projectRoot: string, rel: string): string | null {
  const abs = path.resolve(projectRoot, rel || "");
  const rootAbs = path.resolve(projectRoot);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) return null;
  return abs;
}

function detectMode(filename: string): { textual: boolean; lang: string } {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const textExts = new Set([
    "md", "mdx", "txt", "ts", "tsx", "js", "jsx", "mjs", "cjs",
    "json", "yml", "yaml", "toml", "ini", "env", "html", "htm",
    "css", "scss", "sass", "less", "go", "rs", "py", "rb", "php",
    "java", "kt", "swift", "c", "cc", "cpp", "h", "hpp", "cs",
    "sh", "bash", "zsh", "ps1", "fish", "sql", "graphql", "gql",
    "lua", "vim", "dockerfile", "gitignore", "gitattributes",
    "editorconfig", "prettierrc", "eslintrc", "lock", "log", "xml",
    "svg", "csv", "tsv",
  ]);
  return { textual: textExts.has(ext), lang: ext };
}

export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const rel = req.nextUrl.searchParams.get("path") ?? "";
    const wantFile = req.nextUrl.searchParams.get("file") === "1";

    const abs = resolveSafe(projectRoot, rel);
    if (!abs) {
      return NextResponse.json({ error: "path escapes projectRoot" }, { status: 400 });
    }
    let stat;
    try {
      stat = await fs.stat(abs);
    } catch {
      return NextResponse.json({ error: "not found", path: rel }, { status: 404 });
    }

    // --- File mode: return content + metadata --------------------------
    if (wantFile || stat.isFile()) {
      if (!stat.isFile()) {
        return NextResponse.json({ error: "not a file" }, { status: 400 });
      }
      const { textual, lang } = detectMode(path.basename(abs));
      const tooBig = stat.size > MAX_PREVIEW_BYTES;
      if (tooBig || !textual) {
        return NextResponse.json({
          kind: "file",
          path: rel,
          name: path.basename(abs),
          size: stat.size,
          textual,
          lang,
          content: null,
          truncated: false,
          reason: tooBig
            ? `file too large to preview (>${Math.round(MAX_PREVIEW_BYTES / 1024 / 1024)}MB)`
            : `binary file (.${lang || "unknown"})`,
        });
      }
      const buf = await fs.readFile(abs);
      return NextResponse.json({
        kind: "file",
        path: rel,
        name: path.basename(abs),
        size: stat.size,
        textual: true,
        lang,
        content: buf.toString("utf-8"),
        truncated: false,
      });
    }

    // --- Directory mode: list children ---------------------------------
    const raw = await fs.readdir(abs, { withFileTypes: true });
    const entries: DirEntry[] = [];
    for (const d of raw) {
      if (HIDDEN_DIRS.has(d.name)) continue;
      if (d.isDirectory()) {
        entries.push({ name: d.name, kind: "dir" });
      } else if (d.isFile()) {
        let size = 0;
        try {
          const s = await fs.stat(path.join(abs, d.name));
          size = s.size;
        } catch {}
        entries.push({
          name: d.name,
          kind: "file",
          size,
          ext: d.name.includes(".") ? d.name.split(".").pop() : "",
        });
      }
    }
    // Directories first, then files; both alphabetical (case-insensitive).
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    return NextResponse.json({
      kind: "dir",
      path: rel,
      entries,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
