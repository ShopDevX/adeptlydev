"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users2,
  Split,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  ChevronRight,
  ShieldCheck,
  Circle,
  CircleDot,
  CheckCircle2,
} from "lucide-react";

interface Subtask {
  id: string;
  title: string;
  scope: string;
  files: string[];
  dependsOn: string[];
  status: "todo" | "in-progress" | "done";
}
interface Board {
  slug: string;
  planTitle: string;
  subtasks: Subtask[];
}
interface Collision {
  file: string;
  subtaskIds: string[];
}

interface Props {
  projectRoot: string | null;
  planSlug: string | null;
  approvalStatus?: string | null;
}

const NEXT: Record<Subtask["status"], Subtask["status"]> = {
  todo: "in-progress",
  "in-progress": "done",
  done: "todo",
};

export function DelegatePanel({ projectRoot, planSlug, approvalStatus }: Props) {
  const [board, setBoard] = useState<Board | null>(null);
  const [collisions, setCollisions] = useState<Collision[]>([]);
  const [n, setN] = useState(3);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // agreement
  const [agreement, setAgreement] = useState<string>("");
  const [agreementCustom, setAgreementCustom] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState(false);
  const [savingAgreement, setSavingAgreement] = useState(false);

  const q = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : "";
  const approved = approvalStatus === "approved";

  const loadBoard = useCallback(async () => {
    if (!planSlug) return;
    try {
      const res = await fetch(`/api/delegate/${planSlug}${q}`);
      const data = await res.json();
      setBoard(data.board ?? null);
      setCollisions(data.collisions ?? []);
    } catch {
      /* ignore */
    }
  }, [planSlug, q]);

  const loadAgreement = useCallback(async () => {
    if (!projectRoot) return;
    try {
      const res = await fetch(`/api/agreement${q}`);
      const data = await res.json();
      setAgreement(data.text ?? "");
      setAgreementCustom(!!data.custom);
    } catch {
      /* ignore */
    }
  }, [projectRoot, q]);

  useEffect(() => {
    setBoard(null);
    setCollisions([]);
    setError(null);
    setEditingAgreement(false);
    loadBoard();
  }, [planSlug, loadBoard]);

  useEffect(() => {
    loadAgreement();
  }, [loadAgreement]);

  async function split() {
    if (!planSlug) return;
    setSplitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/delegate/${planSlug}${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setBoard(data.board);
      setCollisions(data.collisions ?? []);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSplitting(false);
    }
  }

  async function cycleStatus(t: Subtask) {
    if (!planSlug) return;
    const next = NEXT[t.status];
    try {
      const res = await fetch(`/api/delegate/${planSlug}${q}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, status: next }),
      });
      const data = await res.json();
      if (data?.board) {
        setBoard(data.board);
        setCollisions(data.collisions ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  async function copyBrief(id: string) {
    if (!planSlug) return;
    try {
      const res = await fetch(`/api/delegate/${planSlug}${q}&brief=${id}`);
      const data = await res.json();
      if (data?.brief) {
        await navigator.clipboard.writeText(data.brief);
        setCopied(id);
        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
      }
    } catch {
      /* ignore */
    }
  }

  async function saveAgreement() {
    if (!projectRoot) return;
    setSavingAgreement(true);
    try {
      const res = await fetch(`/api/agreement${q}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: agreement }),
      });
      const data = await res.json();
      if (!data?.error) {
        setAgreementCustom(true);
        setEditingAgreement(false);
      }
    } finally {
      setSavingAgreement(false);
    }
  }

  if (!planSlug) return <div className="text-xs text-fg-secondary italic">Select a plan to split into parallel subtasks.</div>;

  const collidedIds = new Set(collisions.flatMap((c) => c.subtaskIds));

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-fg-secondary leading-relaxed flex items-start gap-1.5">
        <Users2 size={13} className="text-accent-1 shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>
          Split this plan across parallel Claude sessions. Each brief carries the <strong className="text-fg">Working
          Agreement</strong> (so every session runs the same checks) and its own <strong className="text-fg">file lane</strong>{" "}
          (so they don't collide).
        </span>
      </div>

      {/* Working Agreement */}
      <div className="border border-border-subtle rounded-md bg-elevated overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
          <ShieldCheck size={14} className="text-accent-1" strokeWidth={1.5} />
          <span className="text-sm font-medium text-fg">Working Agreement</span>
          <span className="text-[10px] font-mono text-fg-tertiary">{agreementCustom ? "custom" : "default"}</span>
          <button
            onClick={() => setEditingAgreement((v) => !v)}
            className="ml-auto text-[11px] text-accent-1 hover:underline"
          >
            {editingAgreement ? "cancel" : "edit"}
          </button>
        </div>
        {editingAgreement ? (
          <div className="p-2.5 space-y-2">
            <textarea
              value={agreement}
              onChange={(e) => setAgreement(e.target.value)}
              rows={10}
              className="w-full text-[11px] font-mono leading-relaxed border border-border-strong bg-base text-fg rounded p-2 resize-y"
            />
            <button
              onClick={saveAgreement}
              disabled={savingAgreement}
              className="text-[11px] px-2.5 py-1 rounded bg-accent-gradient text-white flex items-center gap-1 disabled:opacity-60"
            >
              {savingAgreement ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2} />}
              Save agreement
            </button>
          </div>
        ) : (
          <pre className="text-[11px] font-mono text-fg-secondary whitespace-pre-wrap p-2.5 max-h-36 overflow-auto">
            {agreement}
          </pre>
        )}
      </div>

      {/* split control */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-fg-secondary flex items-center gap-1.5">
          Split into
          <select
            value={n}
            onChange={(e) => setN(+e.target.value)}
            disabled={splitting}
            className="bg-elevated border border-border-subtle rounded px-1.5 py-1 text-fg text-xs"
          >
            {[2, 3, 4, 5, 6].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          sessions
        </label>
        <button
          onClick={split}
          disabled={splitting || !approved}
          title={!approved ? "Approve the plan first" : "Ask Claude to split the plan"}
          className="text-xs px-3 py-1.5 rounded bg-accent-gradient text-white flex items-center gap-1.5 disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
        >
          {splitting ? <Loader2 size={14} className="animate-spin" /> : <Split size={14} strokeWidth={1.5} />}
          {board ? "Re-split" : "Split with Claude"}
        </button>
        {!approved && <span className="text-[11px] text-fg-tertiary">Approve the plan to enable splitting.</span>}
      </div>

      {error && <div className="text-xs chip-changes p-2 rounded">{error}</div>}

      {/* collision banner */}
      {collisions.length > 0 && (
        <div className="text-xs rounded-md border border-status-changes/40 bg-status-changes/10 p-2.5 flex items-start gap-2">
          <AlertTriangle size={14} className="text-status-changes shrink-0 mt-0.5" />
          <div>
            <strong className="text-fg">Overlap detected.</strong> These files are claimed by more than one subtask — sequence them (set a dependency) or narrow the scope:
            <ul className="mt-1 space-y-0.5">
              {collisions.map((c) => (
                <li key={c.file} className="font-mono text-fg-secondary">
                  {c.file} → {c.subtaskIds.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* board */}
      {board && (
        <div className="space-y-2">
          {board.subtasks.map((t) => (
            <SubtaskRow
              key={t.id}
              t={t}
              collided={collidedIds.has(t.id)}
              copied={copied === t.id}
              onCopy={() => copyBrief(t.id)}
              onCycle={() => cycleStatus(t)}
              depTitles={t.dependsOn.map((id) => board.subtasks.find((s) => s.id === id)?.title || id)}
            />
          ))}
        </div>
      )}

      {!board && (
        <div className="border border-dashed border-border-strong rounded-md p-4 text-center space-y-2">
          <div className="flex justify-center">
            <Users2 size={20} className="text-accent-1" strokeWidth={1.5} />
          </div>
          <div className="text-sm text-fg font-medium">Split the work, keep it consistent</div>
          <div className="text-xs text-fg-secondary leading-relaxed max-w-md mx-auto">
            Approve the plan, choose how many sessions, and hit <strong className="text-fg">Split</strong>. Copy each brief
            into a separate Claude session — every one runs the same pre-flight and stays in its own lane.
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: Subtask["status"] }) {
  if (status === "done") return <CheckCircle2 size={16} className="text-status-approved shrink-0" />;
  if (status === "in-progress") return <CircleDot size={16} className="text-accent-1 shrink-0" />;
  return <Circle size={16} className="text-fg-tertiary/60 shrink-0" />;
}

function SubtaskRow({
  t,
  collided,
  copied,
  onCopy,
  onCycle,
  depTitles,
}: {
  t: Subtask;
  collided: boolean;
  copied: boolean;
  onCopy: () => void;
  onCycle: () => void;
  depTitles: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-md bg-elevated overflow-hidden ${collided ? "border-status-changes/50" : "border-border-subtle"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={onCycle} title="Cycle status (todo → in-progress → done)">
          <StatusIcon status={t.status} />
        </button>
        <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left flex items-center gap-2">
          <span className="text-[10px] font-mono text-fg-tertiary">{t.id}</span>
          <span className="text-sm font-medium text-fg truncate">{t.title}</span>
          {collided && <AlertTriangle size={12} className="text-status-changes shrink-0" />}
          <ChevronRight size={13} className={`text-fg-tertiary ml-auto shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        <button
          onClick={onCopy}
          className="shrink-0 text-[11px] px-2 py-1 rounded border border-border-strong text-accent-1 hover:bg-base flex items-center gap-1"
          title="Copy the paste-ready brief for this session"
        >
          {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy brief"}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-0 border-t border-border-subtle space-y-2 text-xs">
          <div className="text-fg-secondary pt-2 leading-relaxed">{t.scope}</div>
          {t.files.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <FileText size={12} className="text-fg-tertiary" />
              {t.files.map((f) => (
                <span key={f} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-base text-fg-secondary border border-border-subtle">
                  {f}
                </span>
              ))}
            </div>
          )}
          {depTitles.length > 0 && (
            <div className="text-[11px] text-fg-tertiary">
              depends on: <span className="text-fg-secondary">{depTitles.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
