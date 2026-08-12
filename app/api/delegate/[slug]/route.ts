import { NextRequest, NextResponse } from "next/server";
import { resolveProjectRoot } from "@/lib/projects";
import { readBoard, splitPlan, setStatus, buildBrief, findCollisions, type SubtaskStatus } from "@/lib/delegate";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // claude split can take a while

// GET /api/delegate/[slug] — current board (+ collisions), or ?brief=<id> for one brief
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const briefId = req.nextUrl.searchParams.get("brief");
    if (briefId) {
      const brief = await buildBrief(params.slug, briefId, projectRoot);
      if (!brief) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ brief });
    }
    const board = await readBoard(params.slug, projectRoot);
    const collisions = board ? findCollisions(board.subtasks) : [];
    return NextResponse.json({ board, collisions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

// POST /api/delegate/[slug] { n } — split the plan into n subtasks
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json().catch(() => ({}));
    const n = Number(body?.n) || 2;
    const { board, error } = await splitPlan(params.slug, n, projectRoot);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const collisions = board ? findCollisions(board.subtasks) : [];
    return NextResponse.json({ board, collisions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

// PATCH /api/delegate/[slug] { id, status } — update one subtask's status
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "");
    const status = body?.status as SubtaskStatus;
    if (!id || !["todo", "in-progress", "done"].includes(status)) {
      return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
    }
    const board = await setStatus(params.slug, id, status, projectRoot);
    if (!board) return NextResponse.json({ error: "board not found" }, { status: 404 });
    const collisions = findCollisions(board.subtasks);
    return NextResponse.json({ board, collisions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
