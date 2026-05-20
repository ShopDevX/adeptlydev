"use client";

import { useEffect, useState } from "react";
import {
  ArrowUp,
  Folder,
  FolderOpen,
  HardDrive,
  Home as HomeIcon,
  Check,
} from "lucide-react";

interface DirEntry {
  name: string;
  path: string;
}

interface ListResponse {
  cwd: string;
  parent: string | null;
  children: DirEntry[];
  roots: DirEntry[];
}

export function FolderBrowser({
  initialPath,
  onSelect,
  onCancel,
}: {
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function navigate(target?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const q = target ? `?path=${encodeURIComponent(target)}` : "";
      const res = await fetch(`/api/fs/list${q}`);
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    navigate(initialPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => navigate()}
          title="Home"
          className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
        >
          <HomeIcon size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => data?.parent && navigate(data.parent)}
          disabled={!data?.parent}
          title="Up"
          className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg disabled:text-fg-tertiary disabled:opacity-50 transition-colors"
        >
          <ArrowUp size={14} strokeWidth={1.5} />
        </button>
        {data?.roots.map((r) => (
          <button
            key={r.path}
            onClick={() => navigate(r.path)}
            title={r.path}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-fg-secondary hover:text-fg hover:bg-base font-mono transition-colors"
          >
            <HardDrive size={11} strokeWidth={1.5} />
            {r.name}
          </button>
        ))}
      </div>

      <div className="text-[10px] font-mono text-fg-tertiary break-all">
        {data?.cwd ?? "—"}
      </div>

      {error && (
        <div className="text-xs chip-changes p-2 rounded">{error}</div>
      )}

      <div className="border border-border-subtle rounded max-h-56 overflow-auto">
        {loading && <div className="p-3 text-xs text-fg-secondary">Loading…</div>}
        {!loading && data && data.children.length === 0 && (
          <div className="p-3 text-xs text-fg-tertiary italic">
            No subfolders.
          </div>
        )}
        <ul className="divide-y divide-border-subtle">
          {data?.children.map((c) => (
            <li key={c.path}>
              <button
                onClick={() => navigate(c.path)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-base transition-colors"
              >
                <Folder size={14} strokeWidth={1.5} className="text-fg-tertiary shrink-0" />
                <span className="text-sm text-fg truncate">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => data?.cwd && onSelect(data.cwd)}
          disabled={!data?.cwd}
          className="text-xs px-3 py-1.5 rounded bg-accent-gradient text-white disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle flex items-center gap-1.5"
        >
          <Check size={12} strokeWidth={1.5} />
          Select this folder
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded text-fg-secondary hover:text-fg"
        >
          Cancel
        </button>
        <div className="flex-1" />
        {data?.cwd && (
          <span className="text-[10px] text-fg-tertiary font-mono flex items-center gap-1">
            <FolderOpen size={11} strokeWidth={1.5} />
            {data.children.length} subfolder{data.children.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}
