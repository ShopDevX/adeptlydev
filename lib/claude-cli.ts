import { spawn } from "node:child_process";

/**
 * Thin wrapper around the local `claude` CLI in `--print` (headless) mode.
 * This is the ONLY way Adeptly ever talks to Claude — same trust surface as
 * running `claude` in your own terminal. No API key, no SaaS backend.
 *
 * The Crew runner uses this to drive each role (architect, builder, medic, …)
 * as a headless Claude Code turn inside the user's own repo.
 */

export interface ClaudeResult {
  stdout: string;
  stderr: string;
  code: number | null;
  error?: string;
}

export interface RunClaudeOptions {
  /** Comma-separated allowlist, e.g. "Read,Grep,Glob,Edit,Write,Bash". */
  allowedTools?: string;
  /** Working directory the CLI runs in (the target repo). */
  cwd?: string;
  /** Kill the process after this many ms. */
  timeoutMs?: number;
}

export function runClaude(prompt: string, opts: RunClaudeOptions = {}): Promise<ClaudeResult> {
  const { allowedTools, cwd, timeoutMs = 300_000 } = opts;
  return new Promise((resolve) => {
    let resolved = false;
    let stdout = "";
    let stderr = "";

    const args = ["--print"];
    // allowedTools values never contain spaces (tool names only), so this is
    // shell-safe even with shell:true on Windows.
    if (allowedTools) args.push("--allowedTools", allowedTools);

    // Windows ships `claude.cmd`; shell:true lets us not care about the extension.
    const child = spawn("claude", args, {
      shell: true,
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    });

    const finish = (code: number | null, error?: string) => {
      if (resolved) return;
      resolved = true;
      resolve({ stdout, stderr, code, error });
    };

    child.on("error", (err) => finish(null, err.message));
    child.stdout?.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr?.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("close", (code) => finish(code));

    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
      finish(null, `claude --print timed out after ${timeoutMs}ms`);
    }, timeoutMs);
    child.on("close", () => clearTimeout(timer));

    try {
      child.stdin?.write(prompt);
      child.stdin?.end();
    } catch (err: any) {
      finish(null, err?.message ?? String(err));
    }
  });
}
