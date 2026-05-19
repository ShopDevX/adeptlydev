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
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Recent Claude Code sessions
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          From <span className="font-mono">~/.claude/projects/</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && <div className="p-3 text-xs text-gray-500">Loading…</div>}
        {error && (
          <div className="m-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded">
            {error}
          </div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="p-3 text-xs text-gray-500">No sessions found yet.</div>
        )}
        <ul className="divide-y divide-gray-100">
          {sessions.map((s) => (
            <li key={s.filename} className="px-3 py-2">
              <div className="text-xs text-gray-700 line-clamp-2 leading-snug">
                {s.firstUserMessage}
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                <span>{s.lastTurnAt?.slice(0, 19).replace("T", " ") || "—"}</span>
                <span>·</span>
                <span>{s.turnCount} turns</span>
                <span>·</span>
                <span>/resume {s.id.slice(0, 8)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
