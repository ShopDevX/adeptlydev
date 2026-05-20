"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2, X, FileText } from "lucide-react";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = (slug: string | null) =>
  `adeptly:chat:${slug ?? "(no-plan)"}`;

export function ChatPanel({
  open,
  onClose,
  projectRoot,
  planSlug,
  planTitle,
}: {
  open: boolean;
  onClose: () => void;
  projectRoot: string | null;
  planSlug: string | null;
  planTitle: string | null;
}) {
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load + persist per-plan conversation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY(planSlug));
    setHistory(raw ? (JSON.parse(raw) as Turn[]) : []);
    setError(null);
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
      const res = await fetch(
        `/api/chat?projectRoot=${encodeURIComponent(projectRoot)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ history: next, planSlug }),
        }
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error + (data.hint ? `\n${data.hint}` : ""));
      setHistory([...next, { role: "assistant", content: data.assistant || "(empty response)" }]);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setHistory([]);
    setError(null);
  }

  if (!open) return null;

  return (
    <aside
      className="fixed top-0 right-0 bottom-0 z-40 w-[440px] max-w-[95vw] flex flex-col border-l border-border-strong shadow-2xl"
      style={{ background: "var(--bg-elevated)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Chat with Claude"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <MessageSquare size={16} className="text-accent-1" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-fg tracking-tight">Chat with Claude</div>
          {planTitle && (
            <div className="text-[10px] text-fg-tertiary truncate flex items-center gap-1">
              <FileText size={10} strokeWidth={1.5} />
              about: {planTitle}
            </div>
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
          title="Close"
          className="p-1 rounded hover:bg-base text-fg-tertiary hover:text-fg transition-colors"
          aria-label="Close"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3 bg-base">
        {history.length === 0 && !busy && (
          <div className="text-xs text-fg-tertiary italic">
            Ask Claude anything about {planTitle ? <strong>{planTitle}</strong> : "the current project"}. The conversation is sent through your local{" "}
            <span className="font-mono">claude --print</span> CLI — no API key, uses your existing Claude subscription. Conversation is saved per-plan in localStorage; <kbd>Trash</kbd> clears it.
          </div>
        )}

        {history.map((t, i) => (
          <div
            key={i}
            className={`text-sm whitespace-pre-wrap leading-relaxed ${
              t.role === "user"
                ? "ml-6 bg-elevated border border-border-subtle rounded-md px-3 py-2 text-fg"
                : "mr-6 text-fg"
            }`}
          >
            {t.role === "assistant" && (
              <div className="text-[10px] uppercase tracking-wider text-accent-1 mb-1 font-semibold">
                claude
              </div>
            )}
            {t.content}
          </div>
        ))}

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
            }}
            rows={2}
            placeholder={planSlug ? "Ask about this plan…" : "Ask anything…"}
            className="flex-1 bg-base text-fg border border-border-strong rounded px-2 py-1.5 text-sm resize-none focus:outline-none"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="p-2 rounded bg-accent-gradient text-white disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
            aria-label="Send"
          >
            <Send size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="text-[10px] text-fg-tertiary font-mono mt-1 flex items-center gap-2">
          <kbd>↵</kbd> send · <kbd>shift+↵</kbd> newline
        </div>
      </div>
    </aside>
  );
}
