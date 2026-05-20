import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { readPlan } from "@/lib/plans";
import { resolveProjectRoot } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

function buildPrompt(planContext: string | null, history: Turn[]): string {
  const lines: string[] = [];
  lines.push(
    "You are an assistant inside Adeptly — a plan-first Claude Code companion."
  );
  lines.push(
    "The user is reviewing a plan and chatting with you about it. Be concise."
  );
  if (planContext) {
    lines.push("");
    lines.push("CURRENT PLAN (context):");
    lines.push("---");
    lines.push(planContext);
    lines.push("---");
  }
  lines.push("");
  lines.push("CONVERSATION SO FAR:");
  for (const t of history) {
    lines.push(`${t.role === "user" ? "User" : "Assistant"}: ${t.content}`);
  }
  lines.push("");
  lines.push("Reply to the last user message. No preamble.");
  return lines.join("\n");
}

async function callClaude(prompt: string, timeoutMs = 90_000): Promise<{ stdout: string; error?: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let resolved = false;
    const finish = (error?: string) => {
      if (resolved) return;
      resolved = true;
      resolve({ stdout, error: error || (stderr && !stdout ? stderr : undefined) });
    };

    const child = spawn("claude", ["--print"], {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    });

    child.on("error", (e) => finish(e.message));
    child.stdout?.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr?.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("close", () => finish());

    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
      finish(`claude --print timed out after ${timeoutMs}ms`);
    }, timeoutMs);
    child.on("close", () => clearTimeout(timer));

    try {
      child.stdin?.write(prompt);
      child.stdin?.end();
    } catch (e: any) {
      finish(e?.message ?? String(e));
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const projectRoot = resolveProjectRoot(req.nextUrl.searchParams.get("projectRoot"));
    const body = await req.json();
    const history = (body?.history as Turn[]) ?? [];
    const planSlug = body?.planSlug as string | undefined;

    if (history.length === 0) {
      return NextResponse.json({ error: "empty conversation" }, { status: 400 });
    }

    let planContext: string | null = null;
    if (planSlug) {
      const plan = await readPlan(planSlug, projectRoot);
      if (plan) planContext = plan.content;
    }

    const prompt = buildPrompt(planContext, history);
    const { stdout, error } = await callClaude(prompt);
    if (error && !stdout) {
      return NextResponse.json(
        { error, hint: "Make sure the `claude` CLI is installed and on PATH." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      assistant: stdout.trim(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
