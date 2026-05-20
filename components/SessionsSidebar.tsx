"use client";

import { useEffect, useState } from "react";
import type { SessionSummary } from "@/lib/types";

export function SessionsSidebar({ projectRoot }: { projectRoot: string | null }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectRoot) return;
    setLoading(true);
    fetch(`/api/sessions?projectRoot=${encodeURIComponent(projectRoot)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setSessions(data.sessions ?? []);
      })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [projectRoot]);

  return (
    <div className="flex flex-col h-full bg-elevated">
      <div className="px-3 py-2 border-b border-border-subtle sticky top-0 bg-elevated z-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-fg-secondary">
          Recent Claude Code sessions
        </div>
        <div className="text-xs text-fg-tertiary mt-0.5">
          From <span className="font-mono">~/.claude/projects/</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && <div className="p-3 text-xs text-fg-secondary">Loading…</div>}
        {error && (
          <div className="m-3 text-xs chip-changes p-2 rounded">{error}</div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="p-3 text-xs text-fg-secondary">No sessions found yet.</div>
        )}
        <ul className="divide-y divide-border-subtle">
          {sessions.map((s, i) => (
            <li key={s.filename} className="px-3 py-2 relative">
              {/* timeline dot + connector */}
              <span
                className="absolute left-0 top-3 w-1.5 h-1.5 rounded-full bg-accent-1"
                aria-hidden
              />
              {i < sessions.length - 1 && (
                <span
                  className="absolute left-[3px] top-5 bottom-0 w-px bg-border-subtle"
                  aria-hidden
                />
              )}
              <div className="text-xs text-fg line-clamp-2 leading-snug pl-3">
                {s.firstUserMessage}
              </div>
              <div className="text-[10px] text-fg-tertiary font-mono mt-1 flex items-center gap-2 flex-wrap pl-3">
                <span>{s.lastTurnAt?.slice(0, 19).replace("T", " ") || "—"}</span>
                <span>·</span>
                <span>{s.turnCount} turns</span>
                <span>·</span>
                <span className="text-accent-1">/resume {s.id.slice(0, 8)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
