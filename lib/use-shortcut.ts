"use client";

import { useEffect } from "react";

export interface ShortcutSpec {
  /** Lowercase key, e.g. "k", "f", "Escape", "/" */
  key: string;
  /** Require Ctrl on Win/Linux OR Cmd on Mac */
  mod?: boolean;
  /** Require Shift in addition */
  shift?: boolean;
  /** Require Alt in addition */
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  /** Default true. If false, the handler does not preventDefault. */
  prevent?: boolean;
  /** If true, the shortcut still fires when an input/textarea has focus. */
  whileTyping?: boolean;
}

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

export function useShortcut(spec: ShortcutSpec | ShortcutSpec[]) {
  const specs = Array.isArray(spec) ? spec : [spec];
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      for (const s of specs) {
        if (e.key.toLowerCase() !== s.key.toLowerCase()) continue;
        const wantMod = !!s.mod;
        const hasMod = e.metaKey || e.ctrlKey;
        if (wantMod !== hasMod) continue;
        if (!!s.shift !== e.shiftKey) continue;
        if (!!s.alt !== e.altKey) continue;
        if (!s.whileTyping && isTyping(e.target)) continue;
        if (s.prevent !== false) e.preventDefault();
        s.handler(e);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(specs.map((s) => ({ k: s.key, m: s.mod, s: s.shift, a: s.alt })))]);
}
