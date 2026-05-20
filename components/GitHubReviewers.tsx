"use client";

import { useEffect, useState } from "react";
import type { GitHubInfo, Reviewer } from "@/lib/types";

export function GitHubReviewers({
  projectRoot,
  planSlug,
  existingReviewers,
  onAdded,
}: {
  projectRoot: string | null;
  planSlug: string | null;
  existingReviewers: Reviewer[];
  onAdded: () => void;
}) {
  const [github, setGithub] = useState<GitHubInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectRoot) {
      setGithub(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/github?projectRoot=${encodeURIComponent(projectRoot)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setGithub(data.github);
      })
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [projectRoot]);

  async function addAsReviewer(login: string, githubUrl: string, avatarUrl: string) {
    if (!planSlug || !projectRoot) return;
    try {
      const res = await fetch(
        `/api/approvals/${planSlug}?projectRoot=${encodeURIComponent(projectRoot)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ addReviewer: login, githubUrl, avatarUrl }),
        }
      );
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      onAdded();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }

  if (!projectRoot) return null;
  if (loading) {
    return <div className="text-xs text-fg-secondary px-3 py-2">Detecting GitHub remote…</div>;
  }
  if (error) {
    return (
      <div className="m-3 text-xs chip-changes p-2 rounded">
        {error}
      </div>
    );
  }
  if (!github) {
    return (
      <div className="text-xs text-fg-secondary px-3 py-2 italic">
        This project has no GitHub remote (no <span className="font-mono">.git/config</span> with a github.com URL).
      </div>
    );
  }

  const existingLogins = new Set(existingReviewers.map((r) => r.name.toLowerCase()));

  return (
    <div className="space-y-2 px-3 py-2">
      <div className="text-xs text-fg">
        <span className="font-mono">{github.owner}/{github.repo}</span>
      </div>
      {github.collaboratorsError && (
        <div className="text-xs chip-changes p-1.5 rounded">
          {github.collaboratorsError}
          {github.collaboratorsError.includes("404") && (
            <div className="mt-1 text-fg">
              Tip: set <span className="font-mono">GITHUB_TOKEN</span> in your env for private repos.
            </div>
          )}
        </div>
      )}
      {github.collaborators.length === 0 ? (
        <div className="text-xs text-fg-secondary italic">
          No collaborators returned (the repo may be private — set <span className="font-mono">GITHUB_TOKEN</span>).
        </div>
      ) : (
        <ul className="space-y-1 max-h-56 overflow-auto">
          {github.collaborators.map((c) => {
            const already = existingLogins.has(c.login.toLowerCase());
            return (
              <li key={c.login} className="flex items-center gap-2 text-xs">
                <img src={c.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-accent-1 hover:underline"
                >
                  {c.login}
                </a>
                {typeof c.contributions === "number" && (
                  <span className="text-fg-tertiary">({c.contributions})</span>
                )}
                <div className="flex-1" />
                {already ? (
                  <span className="text-fg-tertiary">added</span>
                ) : (
                  <button
                    disabled={!planSlug}
                    onClick={() => addAsReviewer(c.login, c.htmlUrl, c.avatarUrl)}
                    className="text-accent-1 hover:underline disabled:text-fg-tertiary"
                  >
                    + reviewer
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
