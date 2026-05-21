"use client";

import { useEffect, useRef, useState } from "react";
import { FilePlus2, X } from "lucide-react";

export function NewPlanModal({
  open,
  projectRoot,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectRoot: string | null;
  onClose: () => void;
  onCreated: (slug: string, title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  async function submit() {
    if (!title.trim() || !projectRoot) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plans?projectRoot=${encodeURIComponent(projectRoot)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: title.trim() }),
        }
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      onCreated(data.created.slug, title.trim());
      onClose();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create new plan"
    >
      <div
        className="absolute inset-0 bg-base/70"
        style={{ backdropFilter: "blur(4px)" }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[480px] max-w-[92vw] rounded-md p-4 space-y-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          boxShadow:
            "0 10px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2">
          <FilePlus2 size={16} className="text-accent-1" strokeWidth={1.5} />
          <div className="text-sm font-semibold text-fg tracking-tight flex-1">
            New plan
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-base text-fg-tertiary"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-fg-secondary">
            Plan title
          </label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onClose();
            }}
            placeholder="e.g. Add password reset flow"
            className="w-full bg-base border border-border-strong rounded px-2 py-1.5 text-sm text-fg focus:outline-none"
          />
          <div className="text-[10px] text-fg-tertiary font-mono">
            File:{" "}
            <span>
              docs/plans/{(title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") || "untitled-plan")}.md
            </span>
          </div>
        </div>

        {error && (
          <div className="text-xs chip-changes p-2 rounded">{error}</div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={submit}
            disabled={busy || !title.trim()}
            className="text-xs px-3 py-1.5 rounded bg-accent-gradient text-white disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
          >
            {busy ? "Creating…" : "Create plan"}
          </button>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded text-fg-secondary hover:text-fg"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-fg-tertiary font-mono">
            <kbd>↵</kbd> create · <kbd>esc</kbd> cancel
          </span>
        </div>
      </div>
    </div>
  );
}
