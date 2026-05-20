"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

let mermaidInitialized = false;
let mermaidThemeKey = "";

function detectThemeKey(): string {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function ensureMermaidInit() {
  const themeKey = detectThemeKey();
  if (mermaidInitialized && themeKey === mermaidThemeKey) return;

  const dark = themeKey === "dark";
  const css = getComputedStyle(document.documentElement);
  const bg = css.getPropertyValue("--bg-elevated").trim() || (dark ? "#14161c" : "#ffffff");
  const fg = css.getPropertyValue("--fg-primary").trim() || (dark ? "#e6e8ee" : "#14161c");
  const border = css.getPropertyValue("--border-subtle").trim() || (dark ? "#20232c" : "#e6e8ee");
  const accent = css.getPropertyValue("--accent-1").trim() || "#7c5cff";
  const muted = css.getPropertyValue("--fg-tertiary").trim() || (dark ? "#5b6478" : "#9aa1b3");

  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "loose",
    flowchart: { useMaxWidth: true, htmlLabels: true },
    fontFamily: "var(--font-geist-mono), JetBrains Mono, ui-monospace, monospace",
    themeVariables: {
      primaryColor: bg,
      primaryTextColor: fg,
      primaryBorderColor: accent,
      lineColor: muted,
      secondaryColor: border,
      tertiaryColor: bg,
      background: bg,
      mainBkg: bg,
      textColor: fg,
      labelTextColor: fg,
      nodeBorder: accent,
    },
  });
  mermaidInitialized = true;
  mermaidThemeKey = themeKey;
}

export function MarkdownPreview({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureMermaidInit();
    if (!containerRef.current) return;
    const nodes = containerRef.current.querySelectorAll("code.language-mermaid");
    let cancelled = false;
    (async () => {
      let i = 0;
      for (const node of Array.from(nodes)) {
        if (cancelled) return;
        const text = node.textContent ?? "";
        const id = `mermaid-${Date.now()}-${i++}`;
        try {
          const { svg } = await mermaid.render(id, text);
          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-block";
          wrapper.innerHTML = svg;
          node.parentElement?.replaceWith(wrapper);
        } catch (err) {
          const errBlock = document.createElement("pre");
          errBlock.className = "mermaid-block text-red-600 text-xs";
          errBlock.textContent = `Mermaid render error: ${(err as Error)?.message ?? String(err)}`;
          node.parentElement?.replaceWith(errBlock);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div ref={containerRef} className="prose-adept max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
