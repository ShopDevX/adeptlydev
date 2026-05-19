"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

let mermaidInitialized = false;

function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    flowchart: { useMaxWidth: true, htmlLabels: true },
    fontFamily: "inherit",
  });
  mermaidInitialized = true;
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
