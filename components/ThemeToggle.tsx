"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "adeptly:theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
}

export function ThemeToggle() {
  // First render (both SSR and client hydration) intentionally produces the
  // same output regardless of the user's saved theme — otherwise React
  // can't reconcile <Moon> (path) vs <Sun> (circle + lines) and the whole
  // root falls back to client-side render, which cascades into
  // hydration/removeChild errors elsewhere on the page.
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const fromDom: Theme = document.documentElement.classList.contains("light")
      ? "light"
      : "dark";
    const initial: Theme = stored === "light" || stored === "dark" ? stored : fromDom;
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }

  return (
    <button
      onClick={toggle}
      title={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      aria-label="Toggle theme"
      className="p-1.5 rounded border border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg transition-colors"
      // suppressHydrationWarning lets the icon swap after mount without
      // tripping React's mismatch check on the rendered child SVG.
      suppressHydrationWarning
    >
      {!mounted ? (
        // Stable placeholder for SSR + first client render — a neutral
        // 16px box of the same shape that occupies the same space as the
        // real icons.
        <span
          aria-hidden
          className="inline-block w-4 h-4"
          style={{ width: 16, height: 16 }}
        />
      ) : theme === "dark" ? (
        <Moon size={16} strokeWidth={1.5} />
      ) : (
        <Sun size={16} strokeWidth={1.5} />
      )}
    </button>
  );
}
