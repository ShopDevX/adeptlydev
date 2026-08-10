"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Copy, Check, Trash2, Loader2, ArrowRightLeft, X } from "lucide-react";

interface HandoffNote {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  planSlug?: string;
  branch?: string;
  body: string;
}

interface Props {
  projectRoot: string | null;
  planSlug: string | null;
}

export function HandoffPanel({ projectRoot, planSlug }: Props) {
  const [notes, setNotes] = useState<HandoffNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const q = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : "";

  const load = useCallback(async () => {
    if (!projectRoot) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/handoff${q}`);
      const data = await res.json();
      setNotes(data.notes ?? []);
    } catch {
      /* keep */
    } finally {
      setLoading(false);
    }
  }, [projectRoot, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!projectRoot || !title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/handoff${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body, planSlug: planSlug || undefined }),
      });
      const data = await res.json();
      if (!data?.error) {
        setTitle("");
        setBody("");
        setComposing(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function copyResume(id: string) {
    try {
      const res = await fetch(`/api/handoff/${id}${q}`);
      const data = await res.json();
      if (data?.resumePrompt) {
        await navigator.clipboard.writeText(data.resumePrompt);
        setCopiedId(id);
        setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
      }
    } catch {
      /* ignore */
    }
  }

  async function remove(id: string) {
    if (!projectRoot) return;
    await fetch(`/api/handoff/${id}${q}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-3 py-2 border-b border-border-subtle sticky top-0 bg-elevated z-10">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary flex-1">
            Session handoff
          </div>
          <button
            onClick={() => setComposing((c) => !c)}
            disabled={!projectRoot}
            className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded text-accent-1 hover:bg-base disabled:opacity-50 transition-colors"
          >
            <Plus size={12} strokeWidth={1.5} /> New
          </button>
        </div>
        <div className="text-[11px] text-fg-tertiary mt-0.5">
          Leave a note the next Claude session can resume from. Files both sessions read — the bridge sessions can't make
          live.
        </div>
      </div>

      {composing && (
        <div className="border-b border-border-subtle bg-base/60 p-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this handoff? e.g. 'Passkeys — auth wired, tests next'"
            className="w-full text-xs border border-border-strong bg-base text-fg rounded px-2 py-1.5"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"What's done, what's next, any gotchas…\n\nStable context first helps the next session cache-hit."}
            rows={5}
            className="w-full text-xs border border-border-strong bg-base text-fg rounded px-2 py-1.5 resize-y font-mono leading-relaxed"
          />
          {planSlug && (
            <div className="text-[10px] text-fg-tertiary">
              Will link plan <span className="font-mono text-fg-secondary">{planSlug}</span>.
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="text-[11px] px-2.5 py-1 rounded bg-accent-gradient text-white flex items-center gap-1 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2} />}
              Save handoff
            </button>
            <button
              onClick={() => {
                setComposing(false);
                setTitle("");
                setBody("");
              }}
              className="text-[11px] px-2 py-1 rounded text-fg-secondary hover:text-fg flex items-center gap-1"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {loading && notes.length === 0 ? (
          <div className="text-xs text-fg-tertiary italic">loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-xs text-fg-secondary leading-relaxed border border-dashed border-border-strong rounded-md p-4 text-center">
            <ArrowRightLeft size={18} className="mx-auto mb-2 text-accent-1" strokeWidth={1.5} />
            No handoffs yet. Before you close a session mid-task, jot what's done and what's next — then{" "}
            <strong className="text-fg">Copy resume prompt</strong> into a fresh <span className="font-mono">claude</span>{" "}
            session to continue without rebuilding context.
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="border border-border-subtle rounded-md bg-base/40 p-2.5 space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg leading-snug">{n.title}</div>
                  <div className="text-[10px] text-fg-tertiary flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span>{new Date(n.updatedAt).toLocaleString()}</span>
                    {n.planSlug && <span className="font-mono text-accent-1">plan:{n.planSlug}</span>}
                    {n.branch && <span className="font-mono">{n.branch}</span>}
                  </div>
                </div>
                <button
                  onClick={() => remove(n.id)}
                  title="Delete"
                  className="text-fg-tertiary hover:text-status-changes shrink-0 p-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {n.body.trim() && (
                <pre className="text-[11px] font-mono text-fg-secondary whitespace-pre-wrap bg-base rounded p-2 max-h-40 overflow-auto">
                  {n.body.trim()}
                </pre>
              )}
              <button
                onClick={() => copyResume(n.id)}
                className="text-[11px] px-2 py-1 rounded border border-border-strong text-accent-1 hover:bg-base flex items-center gap-1"
              >
                {copiedId === n.id ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
                {copiedId === n.id ? "Copied resume prompt" : "Copy resume prompt"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
