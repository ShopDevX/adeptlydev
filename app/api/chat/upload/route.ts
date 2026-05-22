import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveProjectRoot } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file

/** Make a safe-on-disk filename: drop directory parts, strip control chars,
 *  cap length. Doesn't try to be exhaustive — the timestamp prefix gives
 *  collision safety. */
function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[\x00-\x1f]/g, "_").trim();
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 120) || "upload";
}

export async function POST(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));

    const form = await req.formData();
    const files = form.getAll("file");
    if (files.length === 0) {
      return NextResponse.json({ error: "no files provided" }, { status: 400 });
    }

    const dir = path.join(projectRoot, ".adeptly", "uploads");
    await fs.mkdir(dir, { recursive: true });

    const saved: Array<{ path: string; filename: string; size: number; type: string }> = [];
    for (const f of files) {
      if (!(f instanceof File)) continue;
      if (f.size === 0) continue;
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `${f.name} is ${Math.round(f.size / 1024 / 1024)}MB — limit is 25MB per file` },
          { status: 413 }
        );
      }
      const ts = Date.now().toString(36);
      // Tiny suffix so multiple files dropped at the same millisecond don't collide
      const suffix = Math.random().toString(36).slice(2, 6);
      const safe = sanitizeFilename(f.name);
      const finalName = `${ts}-${suffix}-${safe}`;
      const outPath = path.join(dir, finalName);
      const buf = Buffer.from(await f.arrayBuffer());
      await fs.writeFile(outPath, buf);
      saved.push({
        path: outPath,
        filename: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
      });
    }

    return NextResponse.json({ attachments: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
