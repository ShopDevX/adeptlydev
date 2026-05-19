import { NextRequest, NextResponse } from "next/server";
import {
  readApproval,
  setPlanStatus,
  setReviewerStatus,
  addReviewer,
  removeReviewer,
} from "@/lib/plans";
import { resolveProjectRoot } from "@/lib/projects";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const approval = await readApproval(params.slug, projectRoot);
    if (!approval) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ approval });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json();

    if (body?.status) {
      const approval = await setPlanStatus(params.slug, body.status, projectRoot);
      if (!approval) return NextResponse.json({ error: "approval not found" }, { status: 404 });
      return NextResponse.json({ approval });
    }

    if (body?.reviewer && body?.reviewerStatus) {
      const approval = await setReviewerStatus(
        params.slug,
        body.reviewer,
        body.reviewerStatus,
        projectRoot
      );
      if (!approval)
        return NextResponse.json({ error: "approval or reviewer not found" }, { status: 404 });
      return NextResponse.json({ approval });
    }

    if (body?.addReviewer) {
      const approval = await addReviewer(params.slug, body.addReviewer, projectRoot, {
        githubUrl: body.githubUrl,
        avatarUrl: body.avatarUrl,
      });
      return NextResponse.json({ approval });
    }

    if (body?.removeReviewer) {
      const approval = await removeReviewer(params.slug, body.removeReviewer, projectRoot);
      return NextResponse.json({ approval });
    }

    return NextResponse.json({ error: "no recognised action in body" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
