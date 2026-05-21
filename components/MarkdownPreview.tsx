"use client";

import { useEffect, useRef, useState } from "react";
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
  // sourceRef is React-owned; outputRef is ours to mutate freely.
  // We mirror sourceRef.innerHTML → outputRef, then run mermaid render and
  // suggestion-mark wrapping on outputRef so React never sees the mutations.
  // This avoids "removeChild: node is not a child" errors on theme toggle
  // and content updates.
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  const [renderTick, setRenderTick] = useState(0);

  // Watch the <html> class for theme changes — re-render mermaid SVGs with
  // the new theme variables and bump renderTick so we re-mirror the markdown.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    let last = html.classList.contains("light") ? "light" : "dark";
    const observer = new MutationObserver(() => {
      const current = html.classList.contains("light") ? "light" : "dark";
      if (current !== last) {
        last = current;
        mermaidInitialized = false;
        setThemeTick((t) => t + 1);
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // When React finishes painting sourceRef, mirror its HTML into outputRef
  // and run mutation passes (mermaid + suggestion marks). renderTick is
  // bumped from a layout effect below so we always mirror the latest HTML.
  useEffect(() => {
    if (!outputRef.current || !sourceRef.current) return;
    ensureMermaidInit();
    outputRef.current.innerHTML = sourceRef.current.innerHTML;

    const nodes = outputRef.current.querySelectorAll("code.language-mermaid");
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
      if (!cancelled && outputRef.current) {
        wrapSuggestionsInDom(outputRef.current, suggestions ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content, suggestions, themeTick, renderTick]);

  // Bump renderTick after the React render commits to sourceRef so the
  // mirror effect runs against the freshest HTML, not a stale snapshot.
  useEffect(() => {
    setRenderTick((t) => t + 1);
  }, [content, themeTick]);

  return (
    <div className="prose-adept max-w-none">
      <div ref={sourceRef} style={{ display: "none" }} aria-hidden>
        <ReactMarkdown key={themeTick} remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      <div ref={outputRef} />
    </div>
  );
}
