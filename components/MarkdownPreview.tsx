"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { getFeatureById } from "@/lib/features";
import type { FeatureSuggestion } from "@/lib/types";

let mermaidInitialized = false;
let mermaidThemeKey = "";

function detectThemeKey(): string {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function ensureMermaidInit() {
  const themeKey = detectThemeKey();
  if (mermaidInitialized && themeKey === mermaidThemeKey) return;
  const css = getComputedStyle(document.documentElement);
  const dark = themeKey === "dark";
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

function wrapSuggestionsInDom(root: HTMLElement, suggestions: FeatureSuggestion[]) {
  if (!suggestions || suggestions.length === 0) return;
  // Build a map from lowercased matched text → list of suggestions
  const byMatch = new Map<string, FeatureSuggestion[]>();
  for (const s of suggestions) {
    if (!s.matchedText) continue;
    const key = s.matchedText.toLowerCase();
    const arr = byMatch.get(key) ?? [];
    arr.push(s);
    byMatch.set(key, arr);
  }
  if (byMatch.size === 0) return;

  // Walk text nodes, skip inside code/pre/mermaid blocks
  const SKIP_TAGS = new Set(["CODE", "PRE", "MERMAID-BLOCK", "STYLE", "SCRIPT"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p: Node | null = node.parentNode;
      while (p) {
        if (p instanceof HTMLElement && SKIP_TAGS.has(p.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (p instanceof HTMLElement && p.classList.contains("mermaid-block")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (p instanceof HTMLElement && p.classList.contains("suggestion-mark")) {
          return NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return node.nodeValue && node.nodeValue.trim().length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  let n: Node | null = walker.nextNode();
  while (n) {
    textNodes.push(n as Text);
    n = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? "";
    // Find earliest match of any key in this node (case-insensitive)
    let lowerText = text.toLowerCase();
    const fragments: Array<{ type: "text" | "mark"; value: string; sugs?: FeatureSuggestion[] }> = [];
    let cursor = 0;
    while (cursor < text.length) {
      let nextHit: { idx: number; len: number; sugs: FeatureSuggestion[] } | null = null;
      for (const [key, sugs] of byMatch.entries()) {
        const idx = lowerText.indexOf(key, cursor);
        if (idx === -1) continue;
        if (!nextHit || idx < nextHit.idx) {
          nextHit = { idx, len: key.length, sugs };
        }
      }
      if (!nextHit) {
        fragments.push({ type: "text", value: text.slice(cursor) });
        break;
      }
      if (nextHit.idx > cursor) {
        fragments.push({ type: "text", value: text.slice(cursor, nextHit.idx) });
      }
      fragments.push({
        type: "mark",
        value: text.slice(nextHit.idx, nextHit.idx + nextHit.len),
        sugs: nextHit.sugs,
      });
      cursor = nextHit.idx + nextHit.len;
    }
    if (fragments.length === 1 && fragments[0].type === "text") continue; // no match

    const parent = textNode.parentNode;
    if (!parent) continue;
    for (const f of fragments) {
      if (f.type === "text") {
        parent.insertBefore(document.createTextNode(f.value), textNode);
      } else {
        const span = document.createElement("span");
        span.className = "suggestion-mark";
        span.textContent = f.value;
        const summary = (f.sugs ?? [])
          .map((s) => {
            const feat = getFeatureById(s.featureId);
            return feat ? `${feat.name}: ${s.reason}` : s.reason;
          })
          .join("\n\n");
        span.title = summary;
        if (f.sugs && f.sugs.length > 0) {
          span.setAttribute("data-feature-id", f.sugs[0].featureId);
        }
        parent.insertBefore(span, textNode);
      }
    }
    parent.removeChild(textNode);
  }
}

export function MarkdownPreview({
  content,
  suggestions,
}: {
  content: string;
  suggestions?: FeatureSuggestion[];
}) {
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

  // Apply suggestion marks AFTER markdown render + mermaid is settled
  useEffect(() => {
    if (!containerRef.current) return;
    const tick = setTimeout(() => {
      if (containerRef.current) wrapSuggestionsInDom(containerRef.current, suggestions ?? []);
    }, 50);
    return () => clearTimeout(tick);
  }, [content, suggestions]);

  return (
    <div ref={containerRef} className="prose-adept max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
