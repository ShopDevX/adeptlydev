"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Vertical column splitter — drag horizontally to resize neighbouring
 * columns. Width is persisted in localStorage under `storageKey`.
 *
 * Usage:
 *   <PlansList style={{ width: leftWidth }} />
 *   <Splitter storageKey="adeptly:left-width"
 *             min={180} max={520} default={288}
 *             onChange={setLeftWidth} />
 *   <Editor />  // flex-1
 *
 * We keep the splitter UI tiny: a 4px-wide hit area with an accent line
 * appearing on hover. No drag indicators, no overlays — calm.
 */
export function Splitter({
  storageKey,
  defaultWidth,
  min = 160,
  max = 720,
  onChange,
  side = "left",
}: {
  storageKey: string;
  defaultWidth: number;
  min?: number;
  max?: number;
  onChange: (width: number) => void;
  /** "left" — controls the panel to the splitter's left.
      "right" — controls the panel to the splitter's right (drag inverts). */
  side?: "left" | "right";
}) {
  const [dragging, setDragging] = useState(false);
  const lastWidthRef = useRef(defaultWidth);

  // Restore from localStorage on mount + push value up
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    const initial =
      Number.isFinite(parsed) && parsed >= min && parsed <= max
        ? parsed
        : defaultWidth;
    lastWidthRef.current = initial;
    onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(true);
      const startX = e.clientX;
      const startWidth = lastWidthRef.current;
      const sign = side === "left" ? 1 : -1;

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - startX;
        const next = Math.max(min, Math.min(max, startWidth + dx * sign));
        lastWidthRef.current = next;
        onChange(next);
      }
      function onUp() {
        setDragging(false);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, String(lastWidthRef.current));
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [min, max, onChange, side, storageKey]
  );

  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      title="Drag to resize"
      className={`relative w-1 shrink-0 cursor-col-resize group ${
        dragging ? "" : "hover:bg-accent-1/30"
      }`}
      style={
        dragging
          ? { backgroundColor: "var(--accent-1)" }
          : { backgroundColor: "transparent" }
      }
    >
      {/* widen the hit area without taking layout space */}
      <div className="absolute inset-y-0 -inset-x-1" />
    </div>
  );
}
