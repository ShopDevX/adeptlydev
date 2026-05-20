"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectInfo } from "@/lib/types";

interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

const STORAGE_KEY = "adeptly:recentProjects";
const CURRENT_KEY = "adeptly:currentProject";
const MAX_RECENT = 10;

export function loadRecentProjects(): RecentProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentProject[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentProjects(list: RecentProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

export function loadCurrentProject(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CURRENT_KEY);
}

export function saveCurrentProject(p: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_KEY, p);
}

export function ProjectPicker({
  current,
  onSelect,
}: {
  current: ProjectInfo | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [mode, setMode] = useState<"open" | "create">("open");
  const [openPath, setOpenPath] = useState("");
  const [createParent, setCreateParent] = useState("");
  const [createName, setCreateName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecent(loadRecentProjects());
  }, [open, current]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function chooseRecent(p: RecentProject) {
    onSelect(p.path);
    setOpen(false);
  }

  async function openExisting() {
    if (!openPath.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects?projectRoot=${encodeURIComponent(openPath.trim())}`
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      onSelect(data.project.path);
      setOpen(false);
      setOpenPath("");
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    if (!createParent.trim() || !createName.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          parent: createParent.trim(),
          name: createName.trim(),
        }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      onSelect(data.project.path);
      setOpen(false);
      setCreateName("");
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm"
      >
        <span className="text-gray-500 text-xs">Project:</span>
        <span className="font-medium truncate max-w-[260px]">
          {current?.name || "no project selected"}
        </span>
        <span className="text-gray-400 text-xs font-mono truncate max-w-[300px] hidden md:inline">
          {current?.path}
        </span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-30 w-[520px] max-w-[90vw] max-h-[80vh] overflow-auto bg-white border border-gray-200 rounded shadow-lg p-3 space-y-3">
          {error && (
            <div className="text-xs bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded">
              {error}
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                Recent
              </div>
              <ul className="border border-gray-200 rounded divide-y divide-gray-100 max-h-44 overflow-auto">
                {recent.map((r) => (
                  <li key={r.path}>
                    <button
                      onClick={() => chooseRecent(r)}
                      className="w-full text-left px-2 py-1.5 hover:bg-gray-50"
                    >
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{r.path}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setMode("open")}
              className={`px-2 py-1 rounded ${
                mode === "open" ? "bg-adept-50 text-adept-700 font-medium" : "text-gray-600"
              }`}
            >
              Open folder
            </button>
            <button
              onClick={() => setMode("create")}
              className={`px-2 py-1 rounded ${
                mode === "create" ? "bg-adept-50 text-adept-700 font-medium" : "text-gray-600"
              }`}
            >
              Create new
            </button>
          </div>

          {mode === "open" ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Folder path
              </label>
              <input
                type="text"
                value={openPath}
                onChange={(e) => setOpenPath(e.target.value)}
                placeholder="C:\path\to\your\project"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
              />
              <div className="text-xs text-gray-500">
                If the folder has no <span className="font-mono">docs/plans/</span>, Adeptly will create it.
              </div>
              <button
                onClick={openExisting}
                disabled={busy || !openPath.trim()}
                className="text-sm px-3 py-1.5 rounded bg-adept-600 text-white disabled:bg-gray-300"
              >
                {busy ? "Opening…" : "Open"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Parent folder
              </label>
              <input
                type="text"
                value={createParent}
                onChange={(e) => setCreateParent(e.target.value)}
                placeholder="C:\xampp8\htdocs"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
              />
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                New project name
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="my-new-project"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
              />
              <div className="text-xs text-gray-500">
                Creates <span className="font-mono">{createParent || "<parent>"}/{createName || "<name>"}</span> with a starter plan.
              </div>
              <button
                onClick={createNew}
                disabled={busy || !createParent.trim() || !createName.trim()}
                className="text-sm px-3 py-1.5 rounded bg-adept-600 text-white disabled:bg-gray-300"
              >
                {busy ? "Creating…" : "Create project"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
