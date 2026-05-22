"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  Trash2,
  X,
  FileText,
  Sparkles,
  PlusCircle,
  Check,
  Mic,
  MicOff,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";
import { getFeatureById } from "@/lib/features";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

interface FeatureInjection {
  section_hint: string;
  content: string;
  feature_ids?: string[];
  label?: string;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  injections?: FeatureInjection[];
  /** Set when Claude returned a non-JSON response and the server couldn't
   *  extract feature injections. The chat shows the prose anyway with a
   *  small yellow banner explaining suggestions are unavailable this turn. */
  parseWarning?: string | null;
}

interface QueuedAttachment {
  id: string;          // local id for state tracking
  filename: string;
  size: number;
  type: string;
  file: File;          // raw file, uploaded on send()
}

interface UploadedAttachment {
  path: string;
  filename: string;
  size: number;
  type: string;
}

const STORAGE_KEY = (slug: string | null) => `adeptly:chat:${slug ?? "(no-plan)"}`;

export function ChatPanel({
  open,
  onClose,
  projectRoot,
  planSlug,
  planTitle,
  onPlanUpdated,
  onPlanCreated,
  width,
}: {
  open: boolean;
  onClose: () => void;
  projectRoot: string | null;
  planSlug: string | null;
  planTitle: string | null;
  onPlanUpdated?: () => void;
  /** Called when chat generates and creates a brand-new plan. Switches the editor to it. */
  onPlanCreated?: (slug: string, title: string) => void;
  /** Pixel width. Defaults to 420 (previous fixed value). */
  width?: number;
}) {
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** key: `${turnIndex}-${injectionIndex}` → "applied" | "applying" */
  const [injectStatus, setInjectStatus] = useState<Record<string, "applying" | "applied" | "error">>({});
  const [injectError, setInjectError] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Files queued for the next user message. Uploaded server-side on send().
  const [attachments, setAttachments] = useState<QueuedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  function addFiles(files: FileList | File[]) {
    const incoming: QueuedAttachment[] = [];
    const list = Array.from(files);
    for (const f of list) {
      if (!f || f.size === 0) continue;
      incoming.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        filename: f.name || (f.type.startsWith("image/") ? `pasted-${Date.now()}.png` : "upload"),
        size: f.size,
        type: f.type || "application/octet-stream",
        file: f,
      });
    }
    if (incoming.length > 0) setAttachments((a) => [...a, ...incoming]);
  }

  function removeAttachment(id: string) {
    setAttachments((a) => a.filter((x) => x.id !== id));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (speech.listening) return; // mic owns the input while listening
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file") {
        const blob = it.getAsFile();
        if (blob) {
          // Give image blobs (which usually arrive as nameless "image/png") a
          // sensible default filename — useful for the chip + when Claude
          // refers back to it.
          const ext = blob.type === "image/png" ? "png" : blob.type.split("/")[1] || "bin";
          const filename = blob.name && blob.name !== "image.png"
            ? blob.name
            : `pasted-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
          const renamed = new File([blob], filename, { type: blob.type });
          pasted.push(renamed);
        }
      }
    }
    if (pasted.length > 0) {
      e.preventDefault();          // don't also dump base64 text into the textarea
      addFiles(pasted);
    }
  }

  // Voice input (push-to-talk). The mic button is hidden if the browser
  // doesn't support the Web Speech API. While listening, the textarea is
  // mic-controlled: input = inputBase + " " + finalTranscript + " " + interim.
  const speech = useSpeechRecognition();
  const inputBaseRef = useRef<string>("");
  useEffect(() => {
    if (!speech.listening) return;
    const base = inputBaseRef.current;
    const finalised = speech.transcript;
    const interim = speech.interim;
    const join = (a: string, b: string) =>
      a && b ? `${a.replace(/\s+$/, "")} ${b.replace(/^\s+/, "")}` : a + b;
    setInput(join(join(base, finalised), interim));
  }, [speech.transcript, speech.interim, speech.listening]);

  function toggleMic() {
    if (speech.listening) {
      speech.stop();
    } else {
      inputBaseRef.current = input;
      speech.start();
    }
  }

  // Load + persist per-plan conversation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY(planSlug));
    setHistory(raw ? (JSON.parse(raw) as Turn[]) : []);
    setError(null);
    setInjectStatus({});
    setInjectError({});
  }, [planSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY(planSlug), JSON.stringify(history));
  }, [history, planSlug]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    }
  }, [open]);

  // Only scroll when a new turn arrives (history length grows) or busy
  // transitions — not on injection-apply, not on input keystrokes. This
  // avoids the cursor-flicker some users reported during long sessions.
  const lastTurnCountRef = useRef(0);
  const lastBusyRef = useRef(busy);
  useEffect(() => {
    const newTurn = history.length !== lastTurnCountRef.current;
    const busyChanged = busy !== lastBusyRef.current;
    lastTurnCountRef.current = history.length;
    lastBusyRef.current = busy;
    if (!newTurn && !busyChanged) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: newTurn ? "smooth" : "auto",
    });
  }, [history.length, busy]);

  async function uploadQueuedAttachments(): Promise<UploadedAttachment[]> {
    if (attachments.length === 0 || !projectRoot) return [];
    const form = new FormData();
    for (const a of attachments) form.append("file", a.file, a.filename);
    setUploading(true);
    try {
      const res = await fetch(
        `/api/chat/upload?projectRoot=${encodeURIComponent(projectRoot)}`,
        { method: "POST", body: form }
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      return (data.attachments ?? []) as UploadedAttachment[];
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || busy || !projectRoot) return;
    // Compose the user-visible message: original text + a footer listing
    // any attached files. We keep this short so the chat history stays readable.
    const attLines = attachments.length
      ? "\n\n_attached: " + attachments.map((a) => a.filename).join(", ") + "_"
      : "";
    const userContent = text || "(see attached)";
    const next: Turn[] = [
      ...history,
      { role: "user", content: userContent + attLines },
    ];
    setHistory(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadQueuedAttachments();
      // Clear the queue once we've handed the bytes to the server
      setAttachments([]);
      const res = await fetch(`/api/chat?projectRoot=${encodeURIComponent(projectRoot)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: next, planSlug, attachments: uploaded }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error + (data.hint ? `\n${data.hint}` : ""));
      const assistantTurn: Turn = {
        role: "assistant",
        content: data.reply || "(empty response)",
        injections: (data.feature_injections as FeatureInjection[]) ?? [],
        parseWarning: data.parse_warning ?? null,
      };
      setHistory([...next, assistantTurn]);
      if (data?.created_plan?.slug) {
        onPlanCreated?.(data.created_plan.slug, data.created_plan.title || data.created_plan.slug);
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function applyInjection(turnIndex: number, injIndex: number, inj: FeatureInjection) {
    if (!planSlug || !projectRoot) return;
    const key = `${turnIndex}-${injIndex}`;
    setInjectStatus((s) => ({ ...s, [key]: "applying" }));
    setInjectError((s) => {
      const c = { ...s };
      delete c[key];
      return c;
    });
    try {
      const res = await fetch(
        `/api/plans/${planSlug}/inject?projectRoot=${encodeURIComponent(projectRoot)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            section_hint: inj.section_hint,
            content: inj.content,
          }),
        }
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setInjectStatus((s) => ({ ...s, [key]: "applied" }));
      onPlanUpdated?.();
    } catch (e: any) {
      setInjectStatus((s) => ({ ...s, [key]: "error" }));
      setInjectError((s) => ({ ...s, [key]: e.message ?? String(e) }));
    }
  }

  function clearChat() {
    setHistory([]);
    setError(null);
    setInjectStatus({});
    setInjectError({});
  }

  if (!open) return null;

  return (
    <aside
      className="shrink-0 flex flex-col border-l border-border-strong"
      style={{ background: "var(--bg-elevated)", width: width ?? 420 }}
      role="complementary"
      aria-label="Chat with Claude"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <MessageSquare size={16} className="text-accent-1" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-fg tracking-tight">Chat with Claude</div>
          {planTitle ? (
            <div className="text-[10px] text-fg-tertiary truncate flex items-center gap-1">
              <FileText size={10} strokeWidth={1.5} />
              about: {planTitle}
            </div>
          ) : (
            <div className="text-[10px] text-fg-tertiary">no plan selected</div>
          )}
        </div>
        <button
          onClick={clearChat}
          title="Clear conversation"
          className="p-1 rounded hover:bg-base text-fg-tertiary hover:text-fg transition-colors"
          aria-label="Clear"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={onClose}
          title="Close (Esc)"
          className="p-1 rounded hover:bg-base text-fg-tertiary hover:text-fg transition-colors"
          aria-label="Close"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3 bg-base">
        {history.length === 0 && !busy && (
          <div className="text-xs text-fg-secondary leading-relaxed space-y-3">
            {planSlug ? (
              <>
                <div className="text-fg text-sm">
                  Refining <strong className="text-fg">{planTitle}</strong>.
                  Ask anything — when Claude recommends a Claude Code feature, you&apos;ll see a{" "}
                  <strong className="text-accent-1">Add to plan</strong> button that drops it in the right section.
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-semibold">
                    Try one of these
                  </div>
                  {[
                    "What's missing from this plan?",
                    "Suggest Claude Code features that would help here",
                    "Identify risks I haven't covered",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setInput(p);
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left text-xs px-2 py-1.5 rounded border border-border-subtle hover:border-accent-1 hover:bg-base text-fg-secondary hover:text-fg transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-fg text-sm">
                  Describe what you want to build. Claude will write the full plan and pick the right Claude Code features automatically.
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-semibold">
                    Try one of these
                  </div>
                  {[
                    "I want to build a CLI that summarises recent git commits",
                    "I'm refactoring auth in an existing Next.js app",
                    "I want to add Stripe subscription billing to my SaaS",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setInput(p);
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left text-xs px-2 py-1.5 rounded border border-border-subtle hover:border-accent-1 hover:bg-base text-fg-secondary hover:text-fg transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="text-fg-tertiary text-[10px]">
              Runs on your local <span className="font-mono">claude --print</span>. No API key. Uses your Claude Code subscription.
            </div>
          </div>
        )}

        {history.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ml-6">
              <div className="text-sm whitespace-pre-wrap leading-relaxed bg-elevated border border-border-subtle rounded-md px-3 py-2 text-fg">
                {t.content}
              </div>
            </div>
          ) : (
            <div key={i} className="mr-6 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-accent-1 font-semibold">
                claude
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-fg">
                {t.content}
              </div>
              {t.parseWarning && (
                <div
                  className="text-[11px] rounded px-2 py-1.5 border"
                  style={{
                    background: "color-mix(in srgb, var(--status-review) 12%, var(--bg-elevated))",
                    borderColor: "color-mix(in srgb, var(--status-review) 35%, var(--border-subtle))",
                    color: "var(--status-review)",
                  }}
                >
                  {t.parseWarning}
                </div>
              )}
              {t.injections && t.injections.length > 0 && (
                <div className="space-y-2 mt-2">
                  {t.injections.map((inj, j) => {
                    const key = `${i}-${j}`;
                    const status = injectStatus[key];
                    const errMsg = injectError[key];
                    return (
                      <div
                        key={j}
                        className="border border-border-subtle rounded-md p-2.5 bg-base/40 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-accent-1">
                          <Sparkles size={11} strokeWidth={1.5} />
                          inject into §{inj.section_hint}
                        </div>
                        <pre className="text-xs text-fg whitespace-pre-wrap font-mono leading-snug">
                          {inj.content}
                        </pre>
                        {inj.feature_ids && inj.feature_ids.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {inj.feature_ids.map((id) => {
                              const f = getFeatureById(id);
                              if (!f) return null;
                              return (
                                <span
                                  key={id}
                                  title={f.whenToUse}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-elevated border border-border-subtle text-fg-secondary"
                                >
                                  {f.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            disabled={status === "applying" || status === "applied" || !planSlug}
                            onClick={() => applyInjection(i, j, inj)}
                            className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 transition-colors ${
                              status === "applied"
                                ? "chip-approved cursor-default"
                                : status === "applying"
                                ? "bg-base text-fg-tertiary cursor-wait"
                                : "bg-accent-gradient text-white"
                            } disabled:opacity-60`}
                          >
                            {status === "applied" ? (
                              <>
                                <Check size={11} strokeWidth={2} />
                                Added to plan
                              </>
                            ) : status === "applying" ? (
                              "Adding…"
                            ) : (
                              <>
                                <PlusCircle size={11} strokeWidth={1.5} />
                                {inj.label || "Add to plan"}
                              </>
                            )}
                          </button>
                          {!planSlug && (
                            <span className="text-[10px] text-fg-tertiary italic">
                              select a plan first
                            </span>
                          )}
                          {errMsg && (
                            <span className="text-[10px] text-status-changes">{errMsg}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {busy && <ThinkingIndicator />}

        {error && (
          <div className="text-xs chip-changes p-2 rounded whitespace-pre-wrap">{error}</div>
        )}
      </div>

      <div className="border-t border-border-subtle p-2 bg-elevated">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {attachments.map((a) => {
              const isImage = a.type.startsWith("image/");
              const sizeKb = Math.max(1, Math.round(a.size / 1024));
              const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)}MB` : `${sizeKb}KB`;
              return (
                <div
                  key={a.id}
                  className="inline-flex items-center gap-1.5 text-xs bg-base border border-border-subtle rounded px-1.5 py-1 max-w-[200px]"
                  title={`${a.filename} (${a.type}, ${sizeLabel})`}
                >
                  {isImage ? (
                    <ImageIcon size={11} strokeWidth={1.5} className="text-accent-1 shrink-0" />
                  ) : (
                    <FileText size={11} strokeWidth={1.5} className="text-fg-secondary shrink-0" />
                  )}
                  <span className="truncate text-fg">{a.filename}</span>
                  <span className="text-fg-tertiary font-mono text-[10px]">{sizeLabel}</span>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    aria-label={`Remove ${a.filename}`}
                    title="Remove attachment"
                    className="p-0.5 rounded hover:bg-border-subtle text-fg-tertiary hover:text-status-changes transition-colors shrink-0"
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            // Reset so re-selecting the same file fires onChange again
            e.target.value = "";
          }}
        />
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
              if (e.key === "Escape") onClose();
            }}
            rows={2}
            placeholder={
              planSlug
                ? "Ask about this plan…"
                : "Describe what you want to build — Claude will write the plan…"
            }
            disabled={busy || !projectRoot}
            readOnly={speech.listening}
            className="flex-1 bg-base text-fg border border-border-strong rounded px-2 py-1.5 text-sm resize-none focus:outline-none disabled:opacity-50 read-only:cursor-default"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || !projectRoot || speech.listening}
            className="p-2 rounded border border-border-strong text-fg-secondary hover:text-fg transition-colors disabled:opacity-40"
            aria-label="Attach files"
            title="Attach files (or paste an image with Ctrl+V into the chat input)"
          >
            <Paperclip size={14} strokeWidth={1.5} />
          </button>
          {speech.supported && (
            <button
              onClick={toggleMic}
              disabled={busy || !projectRoot}
              className={`p-2 rounded border transition-colors disabled:opacity-40 ${
                speech.listening
                  ? "border-status-changes text-status-changes bg-status-changes/10 animate-pulse"
                  : "border-border-strong text-fg-secondary hover:text-fg hover:border-border-strong"
              }`}
              aria-label={speech.listening ? "Stop listening" : "Start voice input"}
              title={
                speech.listening
                  ? "Click to stop · transcribing live into the input"
                  : "Click to start voice input"
              }
            >
              {speech.listening ? (
                <MicOff size={14} strokeWidth={1.5} />
              ) : (
                <Mic size={14} strokeWidth={1.5} />
              )}
            </button>
          )}
          <button
            onClick={send}
            disabled={
              busy ||
              uploading ||
              !projectRoot ||
              speech.listening ||
              (!input.trim() && attachments.length === 0)
            }
            className="p-2 rounded bg-accent-gradient text-white disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
            aria-label="Send"
            title="Send (Enter)"
          >
            <Send size={14} strokeWidth={1.5} />
          </button>
        </div>
        {speech.error && (
          <div className="text-[10px] text-status-changes mt-1">{speech.error}</div>
        )}
        <div className="text-[10px] text-fg-tertiary font-mono mt-1 flex items-center gap-2">
          {speech.listening ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-status-changes animate-pulse" />
              <span>listening · click mic to stop</span>
            </>
          ) : uploading ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-accent-1 animate-pulse" />
              <span>uploading attachments…</span>
            </>
          ) : (
            <>
              <kbd>↵</kbd> send · <kbd>shift+↵</kbd> newline · <kbd>esc</kbd> close · <kbd>ctrl+v</kbd> paste image
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/**
 * Stage-based "Claude is thinking" indicator. The real `claude --print` call
 * is non-streaming and often runs 30-60s, so a static "thinking…" looks
 * frozen. We cycle through plausible stages on a timer so the user sees
 * the request is alive. Stages are deliberately vague — we don't know what
 * Claude is actually doing, just that time is passing.
 */
function ThinkingIndicator() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  let stage = "thinking";
  if (elapsed >= 60) stage = "still working — long context can take a moment";
  else if (elapsed >= 25) stage = "almost done";
  else if (elapsed >= 10) stage = "drafting response";
  else if (elapsed >= 3) stage = "reading context";

  return (
    <div className="mr-6 text-sm text-fg-secondary">
      <div className="text-[10px] uppercase tracking-wider text-accent-1 mb-1 font-semibold">
        claude
      </div>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-accent-1 animate-pulse" />
        <span>
          {stage}
          <span className="inline-block w-6 text-fg-tertiary font-mono text-[10px] ml-1">
            {elapsed >= 3 ? `${elapsed}s` : ""}
          </span>
        </span>
      </span>
    </div>
  );
}
