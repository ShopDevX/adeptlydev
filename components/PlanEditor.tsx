"use client";

import { useEffect, useMemo, useState } from "react";
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

const STATUS_COLOURS: Record<PlanStatus, string> = {
  draft: "bg-gray-200 text-gray-700",
  "in-review": "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  "changes-requested": "bg-rose-100 text-rose-800",
};

function StatusChip({ status }: { status: PlanStatus }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_COLOURS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function ChangeIcon({ change }: { change: FileChange }) {
  const map = {
    create: { icon: "+", colour: "text-emerald-600" },
    modify: { icon: "~", colour: "text-amber-600" },
    delete: { icon: "−", colour: "text-rose-600" },
  } as const;
  const m = map[change.kind];
  const existsHint = change.exists ? "exists" : "missing";
  const warn =
    (change.kind === "create" && change.exists) || (change.kind !== "create" && !change.exists);
  return (
    <li className="flex items-center gap-2 text-sm py-0.5">
      <span className={`font-mono font-bold ${m.colour}`}>{m.icon}</span>
      <span className="font-mono">{change.path}</span>
      <span className={`text-xs ${warn ? "text-rose-600" : "text-gray-500"}`}>
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
}: {
  projectRoot: string | null;
  slug: string | null;
  onJumpToFeature?: (featureId: string) => void;
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
  }, [slug, projectRoot]);

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
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Select or create a project to begin.
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Select a plan from the left, or create one in <span className="font-mono ml-1">docs/plans/</span>.
      </div>
    );
  }

  if (!plan && !error) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Loading…</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="border-b border-gray-200 p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-lg font-semibold truncate">{plan?.title ?? slug}</div>
          <div className="text-xs text-gray-500 font-mono">{plan?.filename}</div>
        </div>
        {approval && <StatusChip status={approval.status} />}
      </div>

      {error && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-sm px-3 py-2">{error}</div>
      )}

      <div className="border-b border-gray-200 px-3 pt-2 flex items-center gap-2">
        <button
          onClick={() => setTab("edit")}
          className={`text-sm px-3 py-1 rounded-t ${
            tab === "edit" ? "bg-white border border-gray-200 border-b-white -mb-px font-medium" : "text-gray-500"
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setTab("preview")}
          className={`text-sm px-3 py-1 rounded-t ${
            tab === "preview" ? "bg-white border border-gray-200 border-b-white -mb-px font-medium" : "text-gray-500"
          }`}
        >
          Preview
        </button>
        <div className="flex-1" />
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="text-sm px-3 py-1 rounded bg-adept-600 text-white disabled:bg-gray-300"
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        {tab === "edit" ? (
          <textarea
            value={editContent}
            onChange={(e) => {
              setEditContent(e.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
            placeholder="# Plan title…"
          />
        ) : (
          <div className="p-4">
            <MarkdownPreview content={editContent} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-1 px-3 pt-2">
          {(
            [
              ["approval", "Approval"],
              ["reviewers", "GitHub reviewers"],
              ["recipe", "✨ Claude recipe"],
              ["changes", `Changes${mismatchCount ? ` · ${mismatchCount} ⚠` : ""}`],
              ["suggestions", `Suggestions · ${suggestions.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBottomTab(key)}
              className={`text-xs px-2 py-1 rounded-t ${
                bottomTab === key
                  ? "bg-white border border-gray-200 border-b-white -mb-px font-medium"
                  : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="max-h-96 overflow-auto bg-white border-t border-gray-200 p-3">
          {bottomTab === "approval" &&
            (!approval ? (
              <div className="text-xs text-gray-500 italic">
                No approval record yet. The file will be created when you submit for review or add a reviewer.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                  Status: <StatusChip status={approval.status} />
                  <span>Author: <span className="font-mono">{approval.author}</span></span>
                </div>
                {approval.reviewers.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">
                    No reviewers yet. Add one from the GitHub reviewers tab.
                  </div>
                ) : (
                  <ul className="text-xs space-y-1">
                    {approval.reviewers.map((r) => (
                      <li key={r.name} className="flex items-center gap-2">
                        {r.avatarUrl && (
                          <img src={r.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                        )}
                        <span className="font-mono">{r.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            r.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "changes-requested"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                patchApproval({ reviewer: r.name, reviewerStatus: "approved" })
                              }
                              className="text-emerald-700 hover:underline"
                            >
                              approve
                            </button>
                            <button
                              onClick={() =>
                                patchApproval({ reviewer: r.name, reviewerStatus: "changes-requested" })
                              }
                              className="text-rose-700 hover:underline"
                            >
                              request changes
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => patchApproval({ removeReviewer: r.name })}
                          className="text-gray-400 hover:text-rose-600 hover:underline ml-auto"
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
                      className="text-xs px-2 py-1 rounded bg-adept-600 text-white"
                    >
                      Submit for review
                    </button>
                  )}
                  <button
                    onClick={copyAsPrompt}
                    disabled={sendDisabled}
                    title={sendDisabled ? "Plan must be approved before sending to Claude Code" : ""}
                    className="text-xs px-2 py-1 rounded bg-emerald-600 text-white disabled:bg-gray-300"
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
              <div className="text-xs text-gray-500 italic">
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
