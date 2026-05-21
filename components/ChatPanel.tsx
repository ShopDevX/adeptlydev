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
} from "lucide-react";
import { getFeatureById } from "@/lib/features";

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
}: {
  open: boolean;
  onClose: () => void;
  projectRoot: string | null;
  planSlug: string | null;
  planTitle: string | null;
  onPlanUpdated?: () => void;
  /** Called when chat generates and creates a brand-new plan. Switches the editor to it. */
  onPlanCreated?: (slug: string, title: string) => void;
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

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy || !projectRoot) return;
    const next: Turn[] = [...history, { role: "user", content: text }];
    setHistory(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat?projectRoot=${encodeURIComponent(projectRoot)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: next, planSlug }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error + (data.hint ? `\n${data.hint}` : ""));
      const assistantTurn: Turn = {
        role: "assistant",
        content: data.reply || "(empty response)",
        injections: (data.feature_injections as FeatureInjection[]) ?? [],
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
      className="w-[420px] shrink-0 flex flex-col border-l border-border-strong"
      style={{ background: "var(--bg-elevated)" }}
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
          <div className="text-xs text-fg-secondary italic leading-relaxed space-y-2">
            {planSlug ? (
              <>
                <div>
                  Refining <strong className="text-fg">{planTitle}</strong>. Ask anything — when Claude recommends a Claude Code feature, you'll get a one-click <strong className="text-accent-1">Add to plan</strong> button that drops it in the right section.
                </div>
              </>
            ) : (
              <>
                <div className="text-fg not-italic">
                  Describe what you want to build. Claude will write the full plan for you and pick the right Claude Code features for each section automatically.
                </div>
                <div className="text-fg-tertiary">
                  Try: <em>"I want to build an API that tracks subscription renewals"</em> or <em>"I'm refactoring auth in this Next.js app"</em>.
                </div>
              </>
            )}
            <div className="text-fg-tertiary">
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

        {busy && (
          <div className="mr-6 text-sm text-fg-secondary">
            <div className="text-[10px] uppercase tracking-wider text-accent-1 mb-1 font-semibold">
              claude
            </div>
            <span className="inline-block w-2 h-2 rounded-full bg-accent-1 animate-pulse" />{" "}
            thinking…
          </div>
        )}

        {error && (
          <div className="text-xs chip-changes p-2 rounded whitespace-pre-wrap">{error}</div>
        )}
      </div>

      <div className="border-t border-border-subtle p-2 bg-elevated">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
            className="flex-1 bg-base text-fg border border-border-strong rounded px-2 py-1.5 text-sm resize-none focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim() || !projectRoot}
            className="p-2 rounded bg-accent-gradient text-white disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
            aria-label="Send"
            title="Send (Enter)"
          >
            <Send size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="text-[10px] text-fg-tertiary font-mono mt-1 flex items-center gap-2">
          <kbd>↵</kbd> send · <kbd>shift+↵</kbd> newline · <kbd>esc</kbd> close
        </div>
      </div>
    </aside>
  );
}
