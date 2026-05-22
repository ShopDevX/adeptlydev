import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { readPlan, createPlan } from "@/lib/plans";
import { resolveProjectRoot } from "@/lib/projects";
import { CLAUDE_CODE_FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface AttachmentRef {
  path: string;
  filename: string;
  size: number;
  type: string;
}

function attachmentSection(atts: AttachmentRef[]): string {
  if (!atts || atts.length === 0) return "";
  const lines: string[] = [
    "",
    "USER-ATTACHED FILES — use the Read tool on each path to inspect them.",
    "Images returned by Read can be analysed visually (screenshots, mockups, diagrams).",
    "Refer to attachments by their original filename in your reply.",
    "",
  ];
  for (const a of atts) {
    const sizeKb = Math.max(1, Math.round(a.size / 1024));
    lines.push(`- ${a.filename}  (${a.type || "unknown"}, ~${sizeKb}KB)  →  ${a.path}`);
  }
  lines.push("");
  return lines.join("\n");
}

export interface FeatureInjection {
  /** Heading text in the plan (case-insensitive substring match), e.g. "Approach", "2. Approach", "Risks". */
  section_hint: string;
  /** Markdown content to insert under that heading. Should be a bullet or short block. */
  content: string;
  /** Optional list of Claude Code feature IDs this injection corresponds to (for downstream highlighting). */
  feature_ids?: string[];
  /** Short label for the UI button. */
  label?: string;
}

function buildGeneratePlanPrompt(description: string, atts: AttachmentRef[] = []): string {
  const cat = CLAUDE_CODE_FEATURES.map(
    (f) => `- ${f.name} (${f.category}): ${f.whenToUse}`
  ).join("\n");

  return [
    "You are an expert at Claude Code, working inside Adeptly.",
    "The user wants to start a new project or feature and is asking for a plan.",
    "",
    "Generate a complete development plan in markdown for them. Pick the right",
    "Claude Code features for each section and mention them by name inline so",
    "the user learns what to use. Keep features in plain English, not jargon.",
    "",
    "USER'S DESCRIPTION:",
    description,
    attachmentSection(atts),
    "AVAILABLE CLAUDE CODE FEATURES — pick the ones that fit this project:",
    cat,
    "",
    "Return a single JSON object — no markdown fences, no prose, just the JSON:",
    "",
    "{",
    '  "title": "<short title for the plan, 3-7 words>",',
    '  "content": "<full markdown plan, ~250-500 words, with sections # Title, ## 1. Problem, ## 2. Approach, ## 3. Files to change, ## 4. Flow (with a ```mermaid flowchart block), ## 5. Risks, ## 6. Approval. In Approach + Risks especially, mention specific Claude Code features (Plan Mode, /security-review, Explore subagent, etc.) so the keyword highlighter will underline them when the plan is rendered.>",',
    '  "reply": "<1-2 sentence conversational response to the user, telling them you created the plan and what you focused on>"',
    "}",
    "",
    "Rules:",
    "- Make the content production-ready markdown the user can edit immediately.",
    "- Mention 3-6 specific Claude Code features by name inside the plan content.",
    "- Use a real Mermaid flowchart, not a placeholder.",
    "- Keep tone confident and concise. No filler.",
  ].join("\n");
}

function buildPrompt(
  planContext: string | null,
  history: Turn[],
  atts: AttachmentRef[] = []
): string {
  const lines: string[] = [];

  lines.push(
    "You are an assistant inside Adeptly — a plan-first companion for developers using Claude Code."
  );
  lines.push(
    "The user is designing a development plan and talking with you about how to execute it well."
  );
  lines.push(
    "Your job: when the conversation suggests Claude Code features (subagents, skills, hooks, etc.) that would help, offer to inject concrete recommendations into the appropriate section of their plan."
  );
  lines.push("");

  // Compact feature catalogue so Claude knows what's available
  const cat = CLAUDE_CODE_FEATURES.map(
    (f) => `- ${f.name} (${f.category}): ${f.whenToUse}`
  ).join("\n");
  lines.push("AVAILABLE CLAUDE CODE FEATURES:");
  lines.push(cat);
  lines.push("");

  if (planContext) {
    lines.push("CURRENT PLAN the user is designing:");
    lines.push("---");
    lines.push(planContext);
    lines.push("---");
    lines.push("");
  }

  lines.push("CONVERSATION SO FAR:");
  for (const t of history) {
    lines.push(`${t.role === "user" ? "User" : "Assistant"}: ${t.content}`);
  }
  lines.push("");

  const attBlock = attachmentSection(atts);
  if (attBlock) lines.push(attBlock);

  lines.push("RESPONSE FORMAT — IMPORTANT:");
  lines.push(
    "Return a single JSON object with this exact shape. No prose, no markdown fences, just the JSON:"
  );
  lines.push("");
  lines.push("{");
  lines.push('  "reply": "Your conversational reply to the user, 1-4 sentences, plain text. Be concise.",');
  lines.push('  "feature_injections": [');
  lines.push("    {");
  lines.push('      "section_hint": "<exact substring from a heading in the user\'s plan, e.g. \\"Approach\\" or \\"2. Approach\\" — pick the section this advice fits>",');
  lines.push('      "content": "<markdown bullet(s) or short block to insert under that heading>",');
  lines.push('      "feature_ids": ["<id from the feature catalogue>", "..."],');
  lines.push('      "label": "<2-5 word label for the Add-to-plan button>"');
  lines.push("    }");
  lines.push("  ]");
  lines.push("}");
  lines.push("");
  lines.push("Rules:");
  lines.push("- If you are not recommending features (e.g. a clarifying question, a yes/no answer), return an empty feature_injections array.");
  lines.push("- Only suggest injections that genuinely add Claude Code features the user isn't already using.");
  lines.push("- section_hint must match an actual heading in the user's plan (case-insensitive substring).");
  lines.push("- content should be markdown bullets, ready to insert as-is.");
  lines.push("- Do NOT wrap the JSON in markdown fences. Do NOT explain it. Just the JSON.");
  return lines.join("\n");
}

interface ParsedReply {
  reply: string;
  feature_injections: FeatureInjection[];
}

interface ParsedGenerated {
  title: string;
  content: string;
  reply: string;
}

function safeParseGenerated(raw: string): ParsedGenerated | null {
  const trimmed = (raw || "").trim();
  let text = trimmed;
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return null;
  try {
    const obj = JSON.parse(text.slice(first, last + 1));
    if (
      typeof obj?.title !== "string" ||
      typeof obj?.content !== "string" ||
      obj.content.length < 50
    ) {
      return null;
    }
    return {
      title: obj.title,
      content: obj.content,
      reply: typeof obj?.reply === "string" ? obj.reply : "Plan created.",
    };
  } catch {
    return null;
  }
}

/** Distinguish "JSON parsed" from "fell back to raw text" so we can decide
 *  whether to retry with a stricter prompt. */
function safeParse(raw: string): ParsedReply & { _parsed: boolean } {
  const trimmed = (raw || "").trim();
  let text = trimmed;
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    return { reply: trimmed, feature_injections: [], _parsed: false };
  }
  try {
    const obj = JSON.parse(text.slice(first, last + 1));
    const reply = typeof obj?.reply === "string" ? obj.reply : trimmed;
    const inj = Array.isArray(obj?.feature_injections) ? obj.feature_injections : [];
    const cleaned: FeatureInjection[] = inj
      .map((x: any) => ({
        section_hint: typeof x?.section_hint === "string" ? x.section_hint : "",
        content: typeof x?.content === "string" ? x.content : "",
        feature_ids: Array.isArray(x?.feature_ids) ? x.feature_ids.filter((s: any) => typeof s === "string") : [],
        label: typeof x?.label === "string" ? x.label : "Add to plan",
      }))
      .filter((x: FeatureInjection) => x.section_hint && x.content);
    return { reply, feature_injections: cleaned, _parsed: true };
  } catch {
    return { reply: trimmed, feature_injections: [], _parsed: false };
  }
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
    const attachments: AttachmentRef[] = Array.isArray(body?.attachments)
      ? body.attachments.filter(
          (a: any) =>
            a &&
            typeof a.path === "string" &&
            typeof a.filename === "string" &&
            typeof a.size === "number"
        )
      : [];

    if (history.length === 0) {
      return NextResponse.json({ error: "empty conversation" }, { status: 400 });
    }

    // === Plan-generation mode: no plan selected, first turn ===
    if (!planSlug && history.length === 1 && history[0].role === "user") {
      const description = history[0].content;
      const prompt = buildGeneratePlanPrompt(description, attachments);
      const { stdout, error } = await callClaude(prompt);
      if (error && !stdout) {
        return NextResponse.json(
          { error, hint: "Make sure the `claude` CLI is installed and on PATH." },
          { status: 500 }
        );
      }
      const parsed = safeParseGenerated(stdout);
      if (!parsed) {
        // Fallback: treat as refine without a plan
        return NextResponse.json({
          reply:
            "I couldn't generate a structured plan from that. Could you describe the project in 1-2 sentences? E.g. 'I want to build an API that tracks subscription renewals for my SaaS.'",
          feature_injections: [],
        });
      }

      const created = await createPlan(parsed.title, projectRoot, undefined, parsed.content);

      return NextResponse.json({
        reply: parsed.reply,
        feature_injections: [],
        created_plan: {
          slug: created.slug,
          filename: created.filename,
          title: parsed.title,
        },
      });
    }

    // === Refine mode: existing plan, conversation with injections ===
    let planContext: string | null = null;
    if (planSlug) {
      const plan = await readPlan(planSlug, projectRoot);
      if (plan) planContext = plan.content;
    }

    const prompt = buildPrompt(planContext, history, attachments);
    let { stdout, error } = await callClaude(prompt);
    if (error && !stdout) {
      return NextResponse.json(
        { error, hint: "Make sure the `claude` CLI is installed and on PATH." },
        { status: 500 }
      );
    }

    let parsed = safeParse(stdout);
    let parseWarning: string | null = null;

    // Retry once if JSON parsing failed — Claude occasionally returns prose
    // or a half-finished JSON block. Reinforce the format expectation on
    // retry. If it still fails, surface the raw text with a banner so the
    // user doesn't see a silent "no recommendations" response.
    if (!parsed._parsed) {
      const stricterPrompt =
        prompt +
        "\n\n--- RETRY ---\n" +
        "Your previous response was not valid JSON. Respond ONLY with a single JSON object matching the schema above. No prose, no markdown fences, no leading or trailing text. If you have nothing to add, return { \"reply\": \"<your message>\", \"feature_injections\": [] }.";
      const retry = await callClaude(stricterPrompt, 60_000);
      if (retry.stdout) {
        const reparsed = safeParse(retry.stdout);
        if (reparsed._parsed) {
          parsed = reparsed;
        } else {
          // Both attempts failed. Keep the first response as the reply (it's
          // probably still useful prose) and flag it.
          parseWarning =
            "Claude returned an unexpected response format. Showing the raw text — feature suggestions are unavailable for this turn.";
        }
      } else {
        parseWarning =
          "Claude returned an unexpected response format. Showing the raw text — feature suggestions are unavailable for this turn.";
      }
    }

    return NextResponse.json({
      reply: parsed.reply,
      feature_injections: parsed.feature_injections,
      parse_warning: parseWarning,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
