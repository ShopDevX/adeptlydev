"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  File as FileIcon,
  FileText,
  RefreshCcw,
} from "lucide-react";

interface DirEntry {
  name: string;
  kind: "dir" | "file";
  size?: number;
  ext?: string;
}

interface DirResponse {
  kind: "dir";
  path: string;
  entries: DirEntry[];
}

interface FileResponse {
  kind: "file";
  path: string;
  name: string;
  size: number;
  textual: boolean;
  lang: string;
  content: string | null;
  reason?: string;
}

/**
 * Lazy-loaded directory tree. Each open folder fetches its own children;
 * the parent caches them so collapse + re-expand doesn't re-fetch.
 * Tree state lives entirely client-side so navigation is instant.
 */
export function FileExplorer({
  projectRoot,
  width,
  onPreviewFile,
}: {
  projectRoot: string | null;
  /** Pixel width when not collapsed. */
  width?: number;
  /** Called when the user clicks a file. Parent decides what to do
   *  (open preview modal, send to chat, etc.). */
  onPreviewFile?: (filePath: string, name: string) => void;
}) {
  if (!projectRoot) {
    return (
      <div className="p-3 text-xs text-fg-secondary" style={{ width: width ?? 288 }}>
        Open a project to browse files.
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full" style={{ width: width ?? 288 }}>
      <DirNode
        projectRoot={projectRoot}
        relPath=""
        name={lastSegment(projectRoot)}
        depth={0}
        initiallyOpen
        onPreviewFile={onPreviewFile}
      />
    </div>
  );
}

function lastSegment(p: string): string {
  const m = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return m[m.length - 1] || p;
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function DirNode({
  projectRoot,
  relPath,
  name,
  depth,
  initiallyOpen = false,
  onPreviewFile,
}: {
  projectRoot: string;
  relPath: string;
  name: string;
  depth: number;
  initiallyOpen?: boolean;
  onPreviewFile?: (filePath: string, name: string) => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [entries, setEntries] = useState<DirEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchEntries(force = false) {
    if (entries && !force) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/api/files?projectRoot=${encodeURIComponent(projectRoot)}&path=${encodeURIComponent(
        relPath
      )}`;
      const res = await fetch(url);
      const data: DirResponse | { error: string } = await res.json();
      if ("error" in data) throw new Error(data.error);
      setEntries(data.entries);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !entries) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const indent = depth * 12;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1 px-2 py-1 text-sm text-fg-secondary hover:text-fg hover:bg-base/40 transition-colors text-left"
        style={{ paddingLeft: indent + 8 }}
      >
        {open ? (
          <ChevronRight size={11} strokeWidth={1.5} className="rotate-90 transition-transform shrink-0" />
        ) : (
          <ChevronRight size={11} strokeWidth={1.5} className="transition-transform shrink-0" />
        )}
        {open ? (
          <FolderOpen size={13} strokeWidth={1.5} className="text-accent-1 shrink-0" />
        ) : (
          <Folder size={13} strokeWidth={1.5} className="text-fg-tertiary shrink-0" />
        )}
        <span className="truncate text-fg">{name}</span>
        {depth === 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEntries(null);
              fetchEntries(true);
            }}
            title="Refresh"
            aria-label="Refresh"
            className="ml-auto p-0.5 rounded hover:bg-border-subtle text-fg-tertiary hover:text-fg shrink-0"
          >
            <RefreshCcw size={11} strokeWidth={1.5} />
          </button>
        )}
      </button>
      {open && (
        <>
          {loading && (
            <div className="text-xs text-fg-tertiary px-2 py-1" style={{ paddingLeft: indent + 32 }}>
              loading…
            </div>
          )}
          {error && (
            <div className="text-xs text-status-changes px-2 py-1" style={{ paddingLeft: indent + 32 }}>
              {error}
            </div>
          )}
          {entries && entries.length === 0 && (
            <div className="text-xs text-fg-tertiary italic px-2 py-1" style={{ paddingLeft: indent + 32 }}>
              empty
            </div>
          )}
          {entries?.map((e) =>
            e.kind === "dir" ? (
              <DirNode
                key={e.name}
                projectRoot={projectRoot}
                relPath={joinRel(relPath, e.name)}
                name={e.name}
                depth={depth + 1}
                onPreviewFile={onPreviewFile}
              />
            ) : (
              <button
                key={e.name}
                onClick={() =>
                  onPreviewFile?.(joinRel(relPath, e.name), e.name)
                }
                className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-fg-secondary hover:text-fg hover:bg-base/40 transition-colors text-left"
                style={{ paddingLeft: indent + 26 }}
              >
                {e.ext === "md" || e.ext === "mdx" ? (
                  <FileText size={12} strokeWidth={1.5} className="text-accent-1 shrink-0" />
                ) : (
                  <FileIcon size={12} strokeWidth={1.5} className="text-fg-tertiary shrink-0" />
                )}
                <span className="truncate text-fg">{e.name}</span>
                {e.size !== undefined && (
                  <span className="text-[10px] font-mono text-fg-tertiary ml-auto shrink-0">
                    {formatSize(e.size)}
                  </span>
                )}
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}

function joinRel(parent: string, name: string): string {
  if (!parent) return name;
  return parent + "/" + name;
}

/**
 * Modal that previews a single file. Markdown gets rendered; other
 * textual files show as <pre>; binary files just show metadata.
 */
export function FilePreviewModal({
  projectRoot,
  filePath,
  onClose,
}: {
  projectRoot: string | null;
  filePath: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<FileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath || !projectRoot) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(
      `/api/files?projectRoot=${encodeURIComponent(projectRoot)}&path=${encodeURIComponent(
        filePath
      )}&file=1`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) throw new Error(d.error);
        setData(d as FileResponse);
      })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [filePath, projectRoot]);

  useEffect(() => {
    if (!filePath) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filePath, onClose]);

  if (!filePath) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-base/70" onClick={onClose} />
      <div className="relative bg-elevated border border-border-subtle rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
          <FileText size={14} strokeWidth={1.5} className="text-accent-1" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-fg truncate">
              {data?.name ?? filePath}
            </div>
            <div className="text-[10px] text-fg-tertiary font-mono truncate">{filePath}</div>
          </div>
          <button
            onClick={onClose}
            className="text-fg-tertiary hover:text-fg p-1 rounded hover:bg-base transition-colors"
            aria-label="Close"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && <div className="text-sm text-fg-secondary">loading…</div>}
          {error && <div className="text-sm chip-changes p-2 rounded">{error}</div>}
          {data && data.content === null && (
            <div className="text-sm text-fg-secondary italic">
              {data.reason || "Cannot preview this file."}
              <div className="mt-1 text-xs text-fg-tertiary">
                {formatSize(data.size)} · .{data.lang || "unknown"}
              </div>
            </div>
          )}
          {data && data.content !== null && (
            <pre className="text-xs font-mono whitespace-pre-wrap text-fg bg-base border border-border-subtle rounded p-3 overflow-x-auto">
              {data.content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
