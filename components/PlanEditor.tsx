"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy as CopyIcon, Check as CheckIcon } from "lucide-react";
import { MarkdownPreview } from "./MarkdownPreview";
import { SuggestedFeatures } from "./SuggestedFeatures";
import { GitHubReviewers } from "./GitHubReviewers";
import { PlanRecipe } from "./PlanRecipe";
import type { Approval, FeatureSuggestion, Plan, PlanStatus } from "@/lib/types";

interface FileChange {
  kind: "create" | "modify" | "delete";
  path: string;
  exists: boolean;
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "Draft",
  "in-review": "In Review",
  approved: "Approved",
  "changes-requested": "Changes Requested",
};

const STATUS_CHIP: Record<PlanStatus, string> = {
  draft: "chip chip-draft",
  "in-review": "chip chip-review",
  approved: "chip chip-approved",
  "changes-requested": "chip chip-changes",
};

const STATUS_UNDERLINE: Record<PlanStatus, string> = {
  draft: "status-underline-draft",
  "in-review": "status-underline-review",
  approved: "status-underline-approved",
  "changes-requested": "status-underline-changes",
};

function StatusChip({ status }: { status: PlanStatus }) {
  return <span className={STATUS_CHIP[status]}>{STATUS_LABELS[status]}</span>;
}

function ChangeIcon({ change }: { change: FileChange }) {
  const map = {
    create: { icon: "+", colour: "text-status-approved" },
    modify: { icon: "~", colour: "text-status-review" },
    delete: { icon: "−", colour: "text-status-changes" },
  } as const;
  const m = map[change.kind];
  const existsHint = change.exists ? "exists" : "missing";
  const warn =
    (change.kind === "create" && change.exists) || (change.kind !== "create" && !change.exists);
  return (
    <li className="flex items-center gap-2 text-sm py-0.5">
      <span className={`font-mono font-bold ${m.colour}`}>{m.icon}</span>
      <span className="font-mono text-fg">{change.path}</span>
      <span className={`text-xs ${warn ? "text-status-changes" : "text-fg-secondary"}`}>
        ({existsHint}
        {warn ? " — plan/codebase mismatch" : ""})
      </span>
    </li>
  );
}

export function PlanEditor({
  projectRoot,
  slug,
  onJumpToFeature,
  refreshKey,
}: {
  projectRoot: string | null;
  slug: string | null;
  onJumpToFeature?: (featureId: string) => void;
  /** Bumping this number from a parent refetches the plan (e.g. after chat injection). */
  refreshKey?: number;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[]>([]);
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<
    "changes" | "suggestions" | "approval" | "reviewers" | "recipe"
  >("approval");
  const [pathCopied, setPathCopied] = useState(false);

  useEffect(() => {
    if (!slug || !projectRoot) {
      setPlan(null);
      setChanges([]);
      setSuggestions([]);
      setEditContent("");
      setDirty(false);
      return;
    }
    setError(null);
    fetch(`/api/plans/${slug}?projectRoot=${encodeURIComponent(projectRoot)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setPlan(data.plan);
        setChanges(data.changes ?? []);
        setSuggestions(data.suggestions ?? []);
        setEditContent(data.plan?.content ?? "");
        setDirty(false);
      })
      .catch((e) => setError(e.message ?? String(e)));
  }, [slug, projectRoot, refreshKey]);

  const approval = plan?.approval ?? null;

  async function save() {
    if (!slug || !projectRoot) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plans/${slug}?projectRoot=${encodeURIComponent(projectRoot)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        }
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setPlan(data.plan);
      setChanges(data.changes ?? []);
      setSuggestions(data.suggestions ?? []);
      setDirty(false);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function patchApproval(body: Record<string, unknown>) {
    if (!slug || !projectRoot) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/approvals/${slug}?projectRoot=${encodeURIComponent(projectRoot)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setPlan((p) => (p ? { ...p, approval: data.approval } : p));
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  async function copyAsPrompt() {
    if (!plan) return;
    const promptText =
      `# Approved plan: ${plan.title}\n\n` +
      `Status: ${approval?.status ?? "(no approval record)"}\n\n` +
      `---\n\n${plan.content}\n\n---\n\n` +
      `Please execute this plan exactly as described. If anything is unclear, ask before changing code. Use plan mode if the change is larger than a single edit.`;
    try {
      await navigator.clipboard.writeText(promptText);
      alert("Plan copied to clipboard as a Claude Code prompt.");
    } catch (e: any) {
      setError("Could not copy: " + (e.message ?? String(e)));
    }
  }

  const sendDisabled = !approval || approval.status !== "approved";

  const mismatchCount = useMemo(
    () =>
      changes.filter(
        (c) => (c.kind === "create" && c.exists) || (c.kind !== "create" && !c.exists)
      ).length,
    [changes]
  );

  if (!projectRoot) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-secondary text-sm">
        Select or create a project to begin.
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-secondary text-sm">
        Select a plan from the left, or create one in <span className="font-mono ml-1">docs/plans/</span>.
      </div>
    );
  }

  if (!plan && !error) {
    return <div className="flex-1 flex items-center justify-center text-fg-secondary text-sm">Loading…</div>;
  }

  const statusUnderline = approval ? STATUS_UNDERLINE[approval.status] : "";

  // Build a display path. Server hands us only the filename; we know plans live
  // under <projectRoot>/docs/plans/. Show both the project-relative path AND
  // the absolute path on hover/click — the absolute path is what the user
  // needs if they want to open the file in their editor outside Adeptly.
  const isWindows = projectRoot?.includes("\\");
  const sep = isWindows ? "\\" : "/";
  const relativePath = plan?.filename ? `docs${sep}plans${sep}${plan.filename}` : "";
  const absolutePath =
    projectRoot && plan?.filename ? `${projectRoot}${sep}${relativePath}` : "";

  async function copyAbsolutePath() {
    if (!absolutePath) return;
    try {
      await navigator.clipboard.writeText(absolutePath);
      setPathCopied(true);
      setTimeout(() => setPathCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-elevated">
      <div className={`p-3 flex items-center gap-3 ${statusUnderline || "border-b border-border-subtle"}`}>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold truncate text-fg tracking-tight">{plan?.title ?? slug}</div>
          <div className="text-xs text-fg-tertiary font-mono flex items-center gap-1.5">
            <span className="truncate" title={absolutePath}>{relativePath || plan?.filename}</span>
            {absolutePath && (
              <button
                onClick={copyAbsolutePath}
                title={`Copy absolute path: ${absolutePath}`}
                aria-label="Copy file path"
                className="p-0.5 rounded hover:bg-base text-fg-tertiary hover:text-accent-1 transition-colors shrink-0"
              >
                {pathCopied ? (
                  <CheckIcon size={11} strokeWidth={2} className="text-status-approved" />
                ) : (
                  <CopyIcon size={11} strokeWidth={1.5} />
                )}
              </button>
            )}
          </div>
        </div>
        {approval && <StatusChip status={approval.status} />}
      </div>

      {error && (
        <div className="chip-changes border-b border-border-subtle text-sm px-3 py-2">{error}</div>
      )}

      <div className="border-b border-border-subtle px-3 pt-2 flex items-center gap-2 bg-elevated">
        <button
          onClick={() => setTab("edit")}
          className={`text-sm px-3 py-1 rounded-t transition-colors ${
            tab === "edit"
              ? "bg-base border border-border-subtle border-b-base -mb-px font-medium text-fg"
              : "text-fg-secondary hover:text-fg"
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setTab("preview")}
          className={`text-sm px-3 py-1 rounded-t transition-colors ${
            tab === "preview"
              ? "bg-base border border-border-subtle border-b-base -mb-px font-medium text-fg"
              : "text-fg-secondary hover:text-fg"
          }`}
        >
          Preview
        </button>
        <div className="flex-1" />
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="text-sm px-3 py-1 rounded bg-accent-gradient text-white disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-base">
        {tab === "edit" ? (
          <textarea
            value={editContent}
            onChange={(e) => {
              setEditContent(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            className="plan-content w-full h-full p-4 text-sm resize-none focus:outline-none text-fg"
            placeholder="# Plan title…"
          />
        ) : (
          <div className="p-4">
            <MarkdownPreview content={editContent} suggestions={suggestions} />
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle bg-elevated">
        <div className="flex items-center gap-1 px-3 pt-2">
          {(
            [
              ["approval", "Approval"],
              ["reviewers", "GitHub reviewers"],
              ["recipe", "Claude recipe"],
              ["changes", `Changes${mismatchCount ? ` · ${mismatchCount} ⚠` : ""}`],
              ["suggestions", `Suggestions · ${suggestions.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBottomTab(key)}
              className={`text-xs px-2 py-1 rounded-t transition-colors ${
                bottomTab === key
                  ? "bg-base border border-border-subtle border-b-base -mb-px font-medium text-fg"
                  : "text-fg-secondary hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="max-h-96 overflow-auto bg-base border-t border-border-subtle p-3">
          {bottomTab === "approval" &&
            (!approval ? (
              <div className="text-xs text-fg-secondary italic">
                No approval record yet. The file will be created when you submit for review or add a reviewer.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-fg-secondary flex items-center gap-2 flex-wrap">
                  Status: <StatusChip status={approval.status} />
                  <span>Author: <span className="font-mono text-fg">{approval.author}</span></span>
                </div>
                {approval.reviewers.length === 0 ? (
                  <div className="text-xs text-fg-secondary italic">
                    No reviewers yet. Add one from the GitHub reviewers tab.
                  </div>
                ) : (
                  <ul className="text-xs space-y-1">
                    {approval.reviewers.map((r) => (
                      <li key={r.name} className="flex items-center gap-2">
                        {r.avatarUrl && (
                          <img src={r.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                        )}
                        <span className="font-mono text-fg">{r.name}</span>
                        <span
                          className={`chip ${
                            r.status === "approved"
                              ? "chip-approved"
                              : r.status === "changes-requested"
                              ? "chip-changes"
                              : "chip-draft"
                          } !text-[10px] !px-1.5`}
                        >
                          {r.status}
                        </span>
                        {r.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                patchApproval({ reviewer: r.name, reviewerStatus: "approved" })
                              }
                              className="text-status-approved hover:underline"
                            >
                              approve
                            </button>
                            <button
                              onClick={() =>
                                patchApproval({ reviewer: r.name, reviewerStatus: "changes-requested" })
                              }
                              className="text-status-changes hover:underline"
                            >
                              request changes
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => patchApproval({ removeReviewer: r.name })}
                          className="text-fg-tertiary hover:text-status-changes hover:underline ml-auto"
                        >
                          remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {approval.status === "draft" && (
                    <button
                      onClick={() => patchApproval({ status: "in-review" })}
                      className="text-xs px-2 py-1 rounded bg-accent-gradient text-white"
                    >
                      Submit for review
                    </button>
                  )}
                  <button
                    onClick={copyAsPrompt}
                    disabled={sendDisabled}
                    title={sendDisabled ? "Plan must be approved before sending to Claude Code" : ""}
                    className="text-xs px-2 py-1 rounded bg-accent-gradient text-white disabled:opacity-40 disabled:bg-none disabled:bg-border-subtle"
                  >
                    Copy as Claude Code prompt
                  </button>
                </div>
              </div>
            ))}

          {bottomTab === "reviewers" && (
            <GitHubReviewers
              projectRoot={projectRoot}
              planSlug={slug}
              existingReviewers={approval?.reviewers ?? []}
              onAdded={() => {
                // refetch plan to update the reviewer list
                if (slug && projectRoot) {
                  fetch(`/api/plans/${slug}?projectRoot=${encodeURIComponent(projectRoot)}`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (!data?.error) setPlan(data.plan);
                    });
                }
              }}
            />
          )}

          {bottomTab === "changes" &&
            (changes.length === 0 ? (
              <div className="text-xs text-fg-secondary italic">
                No "create X / modify Y / delete Z" lines detected in the plan yet.
              </div>
            ) : (
              <ul>{changes.map((c) => <ChangeIcon key={`${c.kind}-${c.path}`} change={c} />)}</ul>
            ))}

          {bottomTab === "suggestions" && (
            <SuggestedFeatures suggestions={suggestions} onJumpToFeature={onJumpToFeature} />
          )}

          {bottomTab === "recipe" && (
            <PlanRecipe
              projectRoot={projectRoot}
              planSlug={slug}
              planContent={editContent}
              planTitle={plan?.title ?? slug ?? ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
