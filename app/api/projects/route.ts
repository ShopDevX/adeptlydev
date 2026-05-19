import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { initProject, projectInfo, pathExists, resolveProjectRoot } from "@/lib/projects";

export async function GET(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    if (!(await pathExists(projectRoot))) {
      return NextResponse.json({ error: "path does not exist", projectRoot }, { status: 404 });
    }
    const info = await projectInfo(projectRoot);
    return NextResponse.json({ project: info });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || "init";

    if (action === "init") {
      // Init an existing or new folder as an Adeptly project
      const target = body?.path as string | undefined;
      if (!target) return NextResponse.json({ error: "path is required" }, { status: 400 });
      const info = await initProject(target);
      return NextResponse.json({ project: info });
    }

    if (action === "create") {
      // Create a new folder under `parent` with `name`, then init it
      const parent = body?.parent as string | undefined;
      const name = body?.name as string | undefined;
      if (!parent || !name) {
        return NextResponse.json({ error: "parent and name are required" }, { status: 400 });
      }
      const target = path.join(parent, name);
      const info = await initProject(target);
      return NextResponse.json({ project: info });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
