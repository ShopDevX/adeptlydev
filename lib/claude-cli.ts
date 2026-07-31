import { spawn } from "node:child_process";

/**
 * Thin wrapper around the local `claude` CLI in `--print` (headless) mode.
 * This is the ONLY way Adeptly ever talks to Claude — same trust surface as
 * running `claude` in your own terminal. No API key, no SaaS backend.
 *
 * The Crew runner uses this to drive each role (architect, builder, medic, …)
 * as a headless Claude Code turn in the user's own repo.
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
  /** Model alias/id, e.g. "haiku" — for fast, bounded calls. Defaults to the user's model. */
  model?: string;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
  error?: string;
}

function spawnClaude(
  args: string[],
  prompt: string,
  opts: { cwd?: string; timeoutMs: number }
): Promise<SpawnResult> {
  const { cwd, timeoutMs } = opts;
  return new Promise((resolve) => {
    let resolved = false;
    let stdout = "";
    let stderr = "";

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

function buildArgs(opts: RunClaudeOptions): string[] {
  const args = ["--print"];
  // allowedTools values never contain spaces (tool names only), so this is
  // shell-safe even with shell:true on Windows.
  if (opts.allowedTools) args.push("--allowedTools", opts.allowedTools);
  if (opts.model) args.push("--model", opts.model);
  return args;
}

export function runClaude(prompt: string, opts: RunClaudeOptions = {}): Promise<ClaudeResult> {
  const { cwd, timeoutMs = 300_000 } = opts;
  return spawnClaude(buildArgs(opts), prompt, { cwd, timeoutMs });
}

// ---- usage-capturing variant ----------------------------------------------

/** Normalised usage for one `claude --print` call. All token counts, plus cost. */
export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  numTurns: number;
  durationMs: number;
  model: string;
}

export interface ClaudeUsageResult {
  /** the assistant's actual text output (the `result` field of the envelope) */
  text: string;
  usage: ClaudeUsage | null;
  code: number | null;
  error?: string;
}

function parseUsageEnvelope(raw: string, requestedModel?: string): { text: string; usage: ClaudeUsage | null } {
  try {
    const env = JSON.parse(raw);
    const u = env?.usage ?? {};
    // Prefer the model name the CLI reports; fall back to what we asked for.
    const model =
      (env?.modelUsage && Object.keys(env.modelUsage)[0]) || requestedModel || "unknown";
    const usage: ClaudeUsage = {
      inputTokens: Number(u.input_tokens ?? 0),
      outputTokens: Number(u.output_tokens ?? 0),
      cacheReadTokens: Number(u.cache_read_input_tokens ?? 0),
      cacheCreationTokens: Number(u.cache_creation_input_tokens ?? 0),
      costUsd: Number(env?.total_cost_usd ?? 0),
      numTurns: Number(env?.num_turns ?? 0),
      durationMs: Number(env?.duration_ms ?? 0),
      model,
    };
    const text = typeof env?.result === "string" ? env.result : "";
    return { text, usage };
  } catch {
    // Not JSON (older CLI, or an error) — treat the whole thing as text.
    return { text: raw, usage: null };
  }
}

/**
 * Like {@link runClaude}, but asks the CLI for `--output-format json` so we can
 * read the real token/cost receipt for the call. Returns the assistant text
 * (unwrapped from the envelope) plus normalised usage. Used everywhere Adeptly
 * wants to meter its own Claude spend.
 */
export async function runClaudeWithUsage(
  prompt: string,
  opts: RunClaudeOptions = {}
): Promise<ClaudeUsageResult> {
  const { cwd, timeoutMs = 300_000, model } = opts;
  const args = [...buildArgs(opts), "--output-format", "json"];
  const res = await spawnClaude(args, prompt, { cwd, timeoutMs });
  if (res.error || (res.code !== 0 && !res.stdout)) {
    return { text: res.stdout || "", usage: null, code: res.code, error: res.error };
  }
  const { text, usage } = parseUsageEnvelope(res.stdout, model);
  return { text, usage, code: res.code };
}
