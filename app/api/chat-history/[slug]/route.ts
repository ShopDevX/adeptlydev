import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveProjectRoot } from "@/lib/projects";

export const dynamic = "force-dynamic";

function safeSlug(slug: string): string | null {
  if (!slug) return null;
  // Slug should never contain path separators or weird chars. The plans
  // library already enforces slug shape; this is a defense in depth.
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) return null;
  return slug;
}

function chatFilePath(projectRoot: string, slug: string): string {
  return path.join(projectRoot, ".adeptly", "chat-history", `${slug}.json`);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const slug = safeSlug(params.slug);
    if (!slug) return NextResponse.json({ error: "bad slug" }, { status: 400 });

    const file = chatFilePath(projectRoot, slug);
    try {
      const raw = await fs.readFile(file, "utf-8");
      const parsed = JSON.parse(raw);
      const turns = Array.isArray(parsed) ? parsed : parsed?.turns ?? [];
      return NextResponse.json({ turns });
    } catch (e: any) {
      if (e?.code === "ENOENT") return NextResponse.json({ turns: [] });
      throw e;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const slug = safeSlug(params.slug);
    if (!slug) return NextResponse.json({ error: "bad slug" }, { status: 400 });

    const body = await req.json();
    const turns = Array.isArray(body?.turns) ? body.turns : [];

    const file = chatFilePath(projectRoot, slug);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      JSON.stringify({ turns, savedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
