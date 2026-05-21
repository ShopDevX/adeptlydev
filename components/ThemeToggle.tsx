"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "adeptly:theme";

type Theme = "dark" | "light";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  // The inline script in layout.tsx already applied the `dark` or `light`
  // class to <html> before this component first renders. Read that, so
  // the icon is correct on first paint (no blank flash).
  if (document.documentElement.classList.contains("light")) return "light";
  return "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readInitialTheme());

  // After mount, also sync from localStorage (in case the SSR placeholder
  // assumed something different from the user's saved preference).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored === "light" || stored === "dark" ? stored : readInitialTheme();
    if (initial !== theme) {
      setTheme(initial);
      applyTheme(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label="Toggle theme"
      className="p-1.5 rounded border border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg transition-colors"
    >
      {theme === "dark" ? (
        <Moon size={16} strokeWidth={1.5} />
      ) : (
        <Sun size={16} strokeWidth={1.5} />
      )}
    </button>
  );
}
