import { spawn } from "node:child_process";

/**
 * Run a command and capture its output. One implementation for every child
 * process Adeptly spawns (git, npm, gh). `shell: true` so Windows `.cmd`
 * shims resolve without special-casing. Never rejects — a spawn error or
 * timeout resolves with `code: null` so callers branch on the result.
 */
export interface CaptureResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export function capture(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {}
): Promise<CaptureResult> {
  const { cwd, timeoutMs = 15_000 } = opts;
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let done = false;
    const finish = (code: number | null) => {
      if (done) return;
      done = true;
      resolve({ stdout, stderr, code });
    };
    const child = spawn(cmd, args, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    child.on("error", () => finish(null));
    child.stdout?.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr?.on("data", (d) => (stderr += d.toString("utf-8")));
    child.on("close", (code) => finish(code));
    setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
      finish(null);
    }, timeoutMs);
  });
}
