"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, X } from "lucide-react";

interface Preflight {
  claude: { installed: boolean; version?: string; error?: string };
  install: { command: string; docs: string };
  login: { command: string; hint: string };
}

const DISMISS_KEY = "adeptly:preflight-dismissed-until";

/**
 * Banner shown at the top of every screen if the local `claude` CLI is not
 * installed (or not on PATH). The chat is useless without it, and users who
 * skip this hit a generic 500 once they try to send a message — that's the
 * #1 reason first-time installers bounce.
 *
 * Dismissal is per-day (localStorage); rechecks on every page load.
 */
export function ClaudePreflightBanner() {
  const [pre, setPre] = useState<Preflight | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start dismissed; flip after first check

  useEffect(() => {
    let cancelled = false;
    fetch("/api/preflight")
      .then((r) => r.json())
      .then((data: Preflight) => {
        if (cancelled) return;
        setPre(data);
        // Show banner if NOT installed AND not dismissed within last 24h
        if (!data.claude.installed) {
          if (typeof window !== "undefined") {
            const until = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
            setDismissed(until > Date.now());
          } else {
            setDismissed(false);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function copyInstall() {
    if (!pre) return;
    navigator.clipboard?.writeText(pre.install.command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function dismissForDay() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    }
    setDismissed(true);
  }

  if (!pre || pre.claude.installed || dismissed) return null;

  return (
    <div
      role="alert"
      className="border-b border-status-changes/40 px-4 py-2 flex items-center gap-3 text-sm"
      style={{ background: "color-mix(in srgb, var(--status-changes) 14%, var(--bg-elevated))" }}
    >
      <AlertTriangle size={16} strokeWidth={1.5} className="text-status-changes shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-fg font-medium">
          Claude Code CLI not detected — chat won&apos;t work until you install it.
        </div>
        <div className="text-xs text-fg-secondary mt-0.5 flex items-center gap-2 flex-wrap">
          <span>Run this in your terminal:</span>
          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-base border border-border-subtle text-fg">
            {pre.install.command}
          </code>
          <button
            onClick={copyInstall}
            title="Copy install command"
            aria-label="Copy install command"
            className="inline-flex items-center gap-1 text-fg-secondary hover:text-fg transition-colors"
          >
            {copied ? (
              <>
                <Check size={11} className="text-status-approved" />
                <span className="text-[10px]">copied</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span className="text-[10px]">copy</span>
              </>
            )}
          </button>
          <span className="text-fg-tertiary">·</span>
          <a
            href={pre.install.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-1 hover:underline"
          >
            docs
          </a>
        </div>
      </div>
      <button
        onClick={dismissForDay}
        title="Dismiss for 24h"
        aria-label="Dismiss"
        className="p-1 rounded hover:bg-base text-fg-tertiary hover:text-fg transition-colors shrink-0"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
