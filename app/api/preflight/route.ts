import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const dynamic = "force-dynamic";

/**
 * Pre-flight: detect whether the local `claude` CLI is installed and on PATH.
 * Cheap & non-interactive — just runs `claude --version`. If the user has the
 * CLI but isn't logged in, the version still prints; auth issues surface on
 * the first real chat call.
 */
async function checkClaude(timeoutMs = 4000): Promise<{
  installed: boolean;
  version?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let done = false;
    const finish = (r: { installed: boolean; version?: string; error?: string }) => {
      if (done) return;
      done = true;
      resolve(r);
    };
    try {
      const child = spawn("claude", ["--version"], { shell: true });
      child.stdout?.on("data", (d) => (stdout += d.toString("utf-8")));
      child.stderr?.on("data", (d) => (stderr += d.toString("utf-8")));
      child.on("error", (e) => finish({ installed: false, error: e.message }));
      child.on("close", (code) => {
        if (code === 0) {
          const version = stdout.trim().split("\n")[0]?.trim();
          finish({ installed: true, version });
        } else {
          finish({ installed: false, error: stderr || `exit ${code}` });
        }
      });
      setTimeout(() => {
        try { child.kill("SIGTERM"); } catch {}
        finish({ installed: false, error: "claude --version timed out" });
      }, timeoutMs);
    } catch (e: any) {
      finish({ installed: false, error: e?.message ?? String(e) });
    }
  });
}

export async function GET() {
  const claude = await checkClaude();
  return NextResponse.json({
    claude,
    install: {
      command: "npm install -g @anthropic-ai/claude-code",
      docs: "https://docs.anthropic.com/en/docs/claude-code",
    },
    login: {
      command: "claude login",
      hint: "If `claude --version` works but the chat says 'authentication required', run this in your terminal once.",
    },
  });
}
