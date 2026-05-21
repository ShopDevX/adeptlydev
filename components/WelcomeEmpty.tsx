"use client";

import { FolderSearch, FolderPlus, Sparkles, ArrowRight, FileText, Keyboard } from "lucide-react";
import { Wordmark } from "./Wordmark";

const EXAMPLE_PROMPTS = [
  "I want to build an API that tracks subscription renewals",
  "I'm refactoring auth in an existing Next.js app",
  "I want to ship a CLI that summarises recent git commits",
];

export function WelcomeEmpty({
  onOpenProject,
  onOpenSelf,
  onOpenShortcuts,
  selfProjectPath,
}: {
  onOpenProject: () => void;
  onOpenSelf: () => void;
  onOpenShortcuts: () => void;
  /** Optional: Adeptly's own folder path, so we can offer "open this app's plans" as a quick win. */
  selfProjectPath?: string | null;
}) {
  return (
    <div className="flex-1 overflow-auto bg-base">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-10">
        {/* Hero */}
        <section className="space-y-4 text-center fade-up">
          <div className="flex justify-center">
            <Wordmark size="lg" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-fg">
            Use Claude Code properly.
          </h1>
          <p className="text-fg-secondary leading-relaxed max-w-xl mx-auto">
            Describe what you want to build. Adeptly drafts the full plan and
            bakes in the right Claude Code features — subagents, skills, hooks —
            for each section. You learn what to use by reading.
          </p>
        </section>

        {/* Primary CTAs */}
        <section className="grid md:grid-cols-2 gap-3 fade-up-delay-1">
          <button
            onClick={onOpenProject}
            className="group text-left p-4 rounded-md border border-border-subtle hover:border-accent-1 bg-elevated transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <FolderSearch size={16} className="text-accent-1" strokeWidth={1.5} />
              <span className="font-medium text-fg">Open a project</span>
              <ArrowRight
                size={14}
                className="ml-auto text-fg-tertiary group-hover:text-accent-1 group-hover:translate-x-0.5 transition-all"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-xs text-fg-secondary leading-relaxed">
              Pick any folder. Adeptly creates a <span className="font-mono">docs/plans/</span> directory if it's missing.
            </p>
          </button>

          {selfProjectPath && (
            <button
              onClick={onOpenSelf}
              className="group text-left p-4 rounded-md border border-border-subtle hover:border-accent-1 bg-elevated transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-accent-1" strokeWidth={1.5} />
                <span className="font-medium text-fg">Try it on Adeptly itself</span>
                <ArrowRight
                  size={14}
                  className="ml-auto text-fg-tertiary group-hover:text-accent-1 group-hover:translate-x-0.5 transition-all"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-xs text-fg-secondary leading-relaxed">
                Open Adeptly's own folder — it already has the product plan,
                the v0.4 design plan, and a research log to explore.
              </p>
            </button>
          )}
        </section>

        {/* How it works */}
        <section className="space-y-3 fade-up-delay-2">
          <div className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
            How it works
          </div>
          <ol className="space-y-3">
            {[
              {
                title: "Pick a project",
                body: "Browse to a folder. Adeptly reads any plans in docs/plans/.",
              },
              {
                title: "Open chat. Describe what you want to build.",
                body: (
                  <span>
                    e.g. <em>"{EXAMPLE_PROMPTS[0]}"</em>. Claude drafts the plan,
                    picks the right Claude Code features for each section, and
                    saves it to <span className="font-mono">docs/plans/</span>.
                  </span>
                ),
              },
              {
                title: "Read the plan. Features are underlined inline.",
                body: "Hover any underlined feature for an explanation. Suggestions appear in the bottom strip with line numbers.",
              },
              {
                title: "Refine via chat. One click adds features into the right section.",
                body: "When Claude recommends something new, an Add-to-plan card appears below the reply.",
              },
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent-1 font-mono text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-fg">{s.title}</div>
                  <div className="text-xs text-fg-secondary leading-relaxed mt-0.5">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Example prompts */}
        <section className="space-y-2 fade-up-delay-3">
          <div className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
            Example things to ask Claude to plan
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <span
                key={p}
                className="text-xs px-2 py-1 rounded border border-border-subtle bg-elevated text-fg-secondary"
              >
                <FileText size={11} strokeWidth={1.5} className="inline mr-1 -mt-0.5 text-fg-tertiary" />
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* Helpful pointers */}
        <section className="text-xs text-fg-tertiary flex items-center gap-3 flex-wrap pt-2 border-t border-border-subtle fade-up-delay-4">
          <button
            onClick={onOpenShortcuts}
            className="inline-flex items-center gap-1 text-fg-secondary hover:text-accent-1 transition-colors"
          >
            <Keyboard size={12} strokeWidth={1.5} />
            keyboard shortcuts
          </button>
          <span>·</span>
          <span>
            free + open source · runs locally · uses your existing Claude Code subscription
          </span>
        </section>
      </div>
    </div>
  );
}
