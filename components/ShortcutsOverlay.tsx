"use client";

import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: "Navigation",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["⌘", "I"], label: "Toggle chat with Claude" },
      { keys: ["⌘", "⇧", "F"], label: "Toggle focus mode" },
      { keys: ["?"], label: "Show this shortcut help" },
      { keys: ["esc"], label: "Close overlay / exit focus mode" },
    ],
  },
  {
    group: "In the editor",
    items: [
      { keys: ["↵"], label: "Send (in chat)" },
      { keys: ["⇧", "↵"], label: "Newline (in chat)" },
      { keys: ["tab"], label: "Move focus to next control" },
    ],
  },
];

export function ShortcutsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="absolute inset-0 bg-base/70"
        style={{ backdropFilter: "blur(4px)" }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[520px] max-w-[92vw] rounded-md p-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          boxShadow:
            "0 10px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Keyboard size={16} className="text-accent-1" strokeWidth={1.5} />
          <div className="text-sm font-semibold text-fg tracking-tight flex-1">
            Keyboard shortcuts
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-base text-fg-tertiary hover:text-fg transition-colors"
            aria-label="Close"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary mb-1.5">
                {g.group}
              </div>
              <ul className="space-y-1">
                {g.items.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-fg">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <kbd key={j}>{k}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border-subtle text-[10px] text-fg-tertiary">
          On Windows / Linux, <kbd>⌘</kbd> = <kbd>Ctrl</kbd>. Press <kbd>esc</kbd> or
          click outside to close.
        </div>
      </div>
    </div>
  );
}
