"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  MinusCircle,
  Users,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  Ban,
  ExternalLink,
  Coins,
  History,
  RotateCcw,
} from "lucide-react";
import type { Run, RunStage, RunMode, StageStatus } from "@/lib/crew";

interface Props {
  projectRoot: string | null;
  planSlug: string | null;
  planTitle: string;
  approvalStatus?: string | null;
}

const POLL_MS = 1500;
const TERMINAL = ["passed", "failed", "cancelled"];

export function CrewPanel({ projectRoot, planSlug, planTitle, approvalStatus }: Props) {
  const [mode, setMode] = useState<RunMode>("dry-run");
  const [run, setRun] = useState<Run | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ turns: number; cost: number } | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const approved = approvalStatus === "approved";
  const q = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : "";

  const stopPolling = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!planSlug) return;
    try {
      const sep = q ? "&" : "?";
      const res = await fetch(`/api/runs${q}${sep}slug=${encodeURIComponent(planSlug)}`);
      const data = await res.json();
      setHistory(Array.isArray(data?.runs) ? data.runs : []);
    } catch {
      /* ignore */
    }
  }, [planSlug, q]);

  const poll = useCallback(
    async (id: string) => {
      if (!planSlug) return;
      try {
        const sep = q ? "&" : "?";
        const res = await fetch(`/api/runs/${id}${q}${sep}slug=${encodeURIComponent(planSlug)}`);
        const data = await res.json();
        if (data?.run) {
          setRun(data.run);
          if (TERMINAL.includes(data.run.status)) {
            stopPolling();
            if (showHistory) loadHistory();
          }
        }
      } catch {
        /* keep polling; transient */
      }
    },
    [planSlug, q, stopPolling, showHistory, loadHistory]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  // reset when switching plans
  useEffect(() => {
    stopPolling();
    setRun(null);
    setError(null);
    setOpenStage(null);
    setEstimate(null);
    setHistory([]);
    setShowHistory(false);
  }, [planSlug, stopPolling]);

  // pull the recipe's upfront estimate (turns + cost) for this plan, if generated
  useEffect(() => {
    if (!planSlug) return;
    let alive = true;
    fetch(`/api/recipe/${planSlug}${q}`)
      .then((r) => r.json())
      .then((data) => {
        const rec = data?.record?.recipe;
        if (alive && rec) setEstimate({ turns: rec.expected_turns, cost: rec.estimated_cost_usd });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [planSlug, q]);

  async function start(overrideMode?: RunMode) {
    if (!planSlug) return;
    const runMode = overrideMode ?? mode;
    if (overrideMode) setMode(overrideMode);
    setStarting(true);
    setError(null);
    stopPolling();
    try {
      const res = await fetch(`/api/runs${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: planSlug, mode: runMode }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setRun(data.run);
      setShowHistory(false);
      setOpenStage(data.run.stages[0]?.id ?? null);
      const id = data.run.id;
      timer.current = setInterval(() => poll(id), POLL_MS);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setStarting(false);
    }
  }

  async function cancel() {
    if (!planSlug || !run) return;
    try {
      const sep = q ? "&" : "?";
      await fetch(`/api/runs/${run.id}${q}${sep}slug=${encodeURIComponent(planSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", slug: planSlug }),
      });
      poll(run.id);
    } catch {
      /* ignore */
    }
  }

  if (!planSlug) return null;

  const isRunning = run && (run.status === "running" || run.status === "queued");

  return (
    <div className="space-y-3">
      {/* controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded overflow-hidden border border-border-subtle text-xs">
          {(["dry-run", "live"] as RunMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={!!isRunning}
              className={`px-2.5 py-1.5 transition-colors ${
                mode === m ? "bg-accent-gradient text-white" : "text-fg-secondary hover:text-fg"
              } disabled:opacity-60`}
            >
              {m === "dry-run" ? "Dry-run" : "Live"}
            </button>
          ))}
        </div>

        {isRunning ? (
          <button
            onClick={cancel}
            className="text-xs px-3 py-1.5 rounded border border-border-strong text-status-changes flex items-center gap-1.5 hover:bg-base/40"
          >
            <Ban size={14} strokeWidth={1.5} /> Cancel
          </button>
        ) : (
          <button
            onClick={() => start()}
            disabled={starting || (mode === "live" && !approved)}
            title={mode === "live" && !approved ? "Plan must be approved for a live run" : ""}
            className="text-xs px-3 py-1.5 rounded bg-accent-gradient text-white flex items-center gap-1.5 disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
          >
            {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} strokeWidth={1.5} />}
            {run ? "Run again" : "Run the crew"}
          </button>
        )}

        {run && <RunStatusChip status={run.status} mode={run.mode} />}

        <button
          onClick={() => setShowHistory((v) => !v)}
          className={`ml-auto text-xs px-2 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
            showHistory ? "text-accent-1 bg-base" : "text-fg-secondary hover:text-fg"
          }`}
          title="Past runs of this plan"
        >
          <History size={14} strokeWidth={1.5} /> History
        </button>
      </div>

      {showHistory && (
        <div className="border border-border-subtle rounded-md bg-elevated divide-y divide-border-subtle">
          {history.length === 0 ? (
            <div className="text-xs text-fg-secondary italic p-3">
              No past runs for this plan yet. Run the crew (dry-run or live) and it'll be logged here.
            </div>
          ) : (
            history.map((h) => {
              const passed = h.stages.filter((s) => s.status === "passed").length;
              return (
                <div key={h.id} className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                  <StageIcon status={h.status === "passed" ? "passed" : h.status === "failed" ? "failed" : h.status === "cancelled" ? "skipped" : "running"} />
                  <button
                    onClick={() => {
                      setRun(h);
                      setShowHistory(false);
                      setOpenStage(null);
                      if (h.status === "running" || h.status === "queued") {
                        stopPolling();
                        timer.current = setInterval(() => poll(h.id), POLL_MS);
                      }
                    }}
                    className="min-w-0 flex-1 text-left hover:text-accent-1"
                    title="View this run"
                  >
                    <span className="font-mono text-fg-tertiary">{h.mode === "dry-run" ? "dry" : "live"}</span>{" "}
                    <span className="text-fg-secondary">{passed}/{h.stages.length}</span>{" "}
                    <span className="text-fg-tertiary">{new Date(h.createdAt).toLocaleString()}</span>
                    {typeof h.costUsd === "number" && h.costUsd > 0 && (
                      <span className="text-fg-tertiary"> · ${h.costUsd.toFixed(2)}</span>
                    )}
                  </button>
                  {h.prUrl && (
                    <a href={h.prUrl} target="_blank" rel="noreferrer" className="text-accent-1 shrink-0" title="View PR">
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => start(h.mode)}
                    disabled={!!isRunning || (h.mode === "live" && !approved)}
                    className="shrink-0 text-accent-1 hover:bg-base rounded p-1 disabled:opacity-40"
                    title={h.mode === "live" && !approved ? "Plan must be approved for a live re-run" : "Re-run with the same mode"}
                  >
                    <RotateCcw size={13} strokeWidth={1.5} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* mode explainer */}
      <div className="text-[11px] text-fg-secondary leading-relaxed flex items-start gap-1.5">
        <ShieldCheck size={13} className="text-accent-1 shrink-0 mt-0.5" strokeWidth={1.5} />
        {mode === "dry-run" ? (
          <span>
            <strong className="text-fg">Dry-run</strong> simulates the whole pipeline — no git, no{" "}
            <span className="font-mono">claude</span>, no PR. Safe to run anytime to preview the crew.
          </span>
        ) : (
          <span>
            <strong className="text-fg">Live</strong> runs headless <span className="font-mono">claude</span> in this
            repo: branch → build → test → review → PR. Requires an <strong className="text-fg">approved</strong> plan and{" "}
            <span className="font-mono">ADEPTLY_LIVE=1</span>. Your code never leaves your machine.
          </span>
        )}
      </div>

      {/* cost: upfront estimate + actual after a live run */}
      {(estimate || (run && run.mode === "live" && typeof run.costUsd === "number")) && (
        <div className="flex items-center gap-3 text-[11px] border border-border-subtle rounded-md px-2.5 py-1.5 bg-base/40 flex-wrap">
          <Coins size={13} className="text-accent-1 shrink-0" strokeWidth={1.5} />
          {estimate && (
            <span className="text-fg-secondary">
              Estimate: <strong className="text-fg">≈ {estimate.turns} turns</strong> ·{" "}
              <strong className="text-fg">≈ ${estimate.cost.toFixed(2)}</strong>
            </span>
          )}
          {run && run.mode === "live" && typeof run.costUsd === "number" && run.costUsd > 0 && (
            <span className="text-fg-secondary">
              Actual: <strong className="text-status-approved">${run.costUsd.toFixed(2)}</strong>
              {estimate && (
                <span className="text-fg-tertiary">
                  {" "}
                  ({run.costUsd <= estimate.cost ? "under" : "over"} estimate)
                </span>
              )}
            </span>
          )}
          {!estimate && (
            <span className="text-fg-tertiary">Generate a recipe for an upfront turn/cost estimate.</span>
          )}
        </div>
      )}

      {error && <div className="text-xs chip-changes p-2 rounded">{error}</div>}

      {/* pipeline */}
      {run && (
        <div className="space-y-1.5">
          {(run.branch || run.prUrl) && (
            <div className="flex items-center gap-3 text-xs text-fg-secondary flex-wrap border border-border-subtle rounded-md p-2 bg-elevated">
              {run.branch && (
                <span className="flex items-center gap-1 font-mono">
                  <GitBranch size={12} className="text-accent-1" /> {run.branch}
                </span>
              )}
              {run.prUrl && (
                <a
                  href={run.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-accent-1 hover:underline"
                >
                  <ExternalLink size={12} /> View PR
                </a>
              )}
            </div>
          )}

          {run.stages.map((s) => (
            <StageRow key={s.id} stage={s} open={openStage === s.id} onToggle={() => setOpenStage(openStage === s.id ? null : s.id)} />
          ))}

          {run.error && <div className="text-xs chip-changes p-2 rounded">{run.error}</div>}
        </div>
      )}

      {!run && (
        <div className="border border-dashed border-border-strong rounded-md p-4 text-center space-y-2">
          <div className="flex justify-center">
            <Users size={20} className="text-accent-1" strokeWidth={1.5} />
          </div>
          <div className="text-sm text-fg font-medium">Run this plan as a crew</div>
          <div className="text-xs text-fg-secondary leading-relaxed max-w-md mx-auto">
            Architect → Approval Gate → Builder → Medic → Reviewer → Security → Pilot. Each role is a headless{" "}
            <span className="font-mono">claude</span> turn in your repo. Start with <strong className="text-fg">Dry-run</strong> to
            preview it safely.
          </div>
        </div>
      )}
    </div>
  );
}

function StageRow({ stage, open, onToggle }: { stage: RunStage; open: boolean; onToggle: () => void }) {
  const hasBody = stage.log.length > 0 || stage.summary;
  return (
    <div className="border border-border-subtle rounded-md bg-elevated overflow-hidden">
      <button
        onClick={onToggle}
        disabled={!hasBody}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left disabled:cursor-default hover:bg-base/30 transition-colors"
      >
        <StageIcon status={stage.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-fg">{stage.role}</span>
            <span className="text-[11px] text-fg-tertiary truncate">{stage.title}</span>
          </div>
          {stage.summary && !open && (
            <div className="text-[11px] text-fg-secondary truncate mt-0.5">{stage.summary}</div>
          )}
        </div>
        {hasBody && (
          <ChevronRight
            size={14}
            className={`text-fg-tertiary shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
        )}
      </button>
      {open && hasBody && (
        <div className="px-3 pb-3 pt-0 space-y-1.5 border-t border-border-subtle">
          {stage.summary && <div className="text-xs text-fg pt-2">{stage.summary}</div>}
          {stage.log.length > 0 && (
            <pre className="text-[11px] font-mono text-fg-secondary whitespace-pre-wrap bg-base rounded p-2 max-h-52 overflow-auto">
              {stage.log.join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  const cls = "shrink-0";
  switch (status) {
    case "running":
      return <Loader2 size={16} className={`${cls} text-accent-1 animate-spin`} />;
    case "passed":
      return <CheckCircle2 size={16} className={`${cls} text-status-approved`} />;
    case "failed":
      return <XCircle size={16} className={`${cls} text-status-changes`} />;
    case "skipped":
      return <MinusCircle size={16} className={`${cls} text-fg-tertiary`} />;
    default:
      return <Circle size={16} className={`${cls} text-fg-tertiary/50`} />;
  }
}

function RunStatusChip({ status, mode }: { status: string; mode: RunMode }) {
  const map: Record<string, string> = {
    running: "chip-review",
    queued: "chip-draft",
    passed: "chip-approved",
    failed: "chip-changes",
    cancelled: "chip-draft",
  };
  return (
    <span className={`chip ${map[status] ?? "chip-draft"} !text-[10px] !px-1.5`}>
      {mode === "dry-run" ? "dry · " : "live · "}
      {status}
    </span>
  );
}
