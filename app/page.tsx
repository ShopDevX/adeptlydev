"use client";

import { useCallback, useEffect, useState } from "react";
import { PlansList } from "@/components/PlansList";
import { PlanEditor } from "@/components/PlanEditor";
import { FeatureSidebar } from "@/components/FeatureSidebar";
import { SessionsSidebar } from "@/components/SessionsSidebar";
import {
  ProjectPicker,
  loadCurrentProject,
  saveCurrentProject,
  loadRecentProjects,
  saveRecentProjects,
} from "@/components/ProjectPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ProjectInfo } from "@/lib/types";

const LEFT_KEY = "adeptly:leftCollapsed";
const RIGHT_KEY = "adeptly:rightCollapsed";
const RIGHT_TAB_KEY = "adeptly:rightTab";

type RightTab = "features" | "sessions";

export default function Home() {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("features");
  const [highlightedFeatures, setHighlightedFeatures] = useState<Set<string>>(new Set());
  const [scrollToFeature, setScrollToFeature] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Initial mount: read collapse state + current project from localStorage,
  // then ask the server for project info.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setLeftCollapsed(window.localStorage.getItem(LEFT_KEY) === "1");
    setRightCollapsed(window.localStorage.getItem(RIGHT_KEY) === "1");
    const savedTab = window.localStorage.getItem(RIGHT_TAB_KEY) as RightTab | null;
    if (savedTab === "features" || savedTab === "sessions") setRightTab(savedTab);

    const stored = loadCurrentProject();
    const initialPath = stored ?? "";
    const url = initialPath
      ? `/api/projects?projectRoot=${encodeURIComponent(initialPath)}`
      : "/api/projects";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data?.project) {
          setProject(data.project);
          saveCurrentProject(data.project.path);
          touchRecent(data.project);
        }
      })
      .finally(() => setBootstrapped(true));
  }, []);

  function touchRecent(p: ProjectInfo) {
    const list = loadRecentProjects();
    const filtered = list.filter((r) => r.path !== p.path);
    filtered.unshift({ path: p.path, name: p.name, lastOpened: new Date().toISOString() });
    saveRecentProjects(filtered);
  }

  const handleSelectProject = useCallback(async (path: string) => {
    const res = await fetch(`/api/projects?projectRoot=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data?.project) {
      setProject(data.project);
      saveCurrentProject(data.project.path);
      touchRecent(data.project);
      setSelectedSlug(null);
      setRefreshKey((k) => k + 1);
    } else if (data?.error) {
      alert(`Could not open project: ${data.error}`);
    }
  }, []);

  function toggleLeft() {
    setLeftCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") window.localStorage.setItem(LEFT_KEY, next ? "1" : "0");
      return next;
    });
  }

  function toggleRight() {
    setRightCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") window.localStorage.setItem(RIGHT_KEY, next ? "1" : "0");
      return next;
    });
  }

  function selectRightTab(t: RightTab) {
    setRightTab(t);
    if (typeof window !== "undefined") window.localStorage.setItem(RIGHT_TAB_KEY, t);
  }

  function jumpToFeature(featureId: string) {
    setRightCollapsed(false);
    if (typeof window !== "undefined") window.localStorage.setItem(RIGHT_KEY, "0");
    selectRightTab("features");
    setHighlightedFeatures(new Set([featureId]));
    setScrollToFeature(featureId);
    // Clear scrollToFeature shortly after so subsequent clicks on the same id re-trigger
    setTimeout(() => setScrollToFeature(null), 250);
  }

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-elevated">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold tracking-tight bg-accent-gradient bg-clip-text text-transparent">
            Adeptly
          </div>
          <div className="text-xs text-fg-secondary hidden lg:block">
            Use Claude Code properly. Plan first, ship sharper.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ProjectPicker current={project} onSelect={handleSelectProject} />
        </div>
      </header>

      {!project && bootstrapped && (
        <div className="flex-1 flex items-center justify-center bg-base">
          <div className="max-w-md text-center space-y-3">
            <div className="text-lg font-semibold text-fg tracking-tight">No project selected</div>
            <div className="text-sm text-fg-secondary">
              Click "Project" in the top right to open an existing folder or create a new one.
            </div>
          </div>
        </div>
      )}

      {project && (
        <div className="flex-1 flex min-h-0">
          <PlansList
            projectRoot={project.path}
            selected={selectedSlug}
            onSelect={setSelectedSlug}
            refreshKey={refreshKey}
            collapsed={leftCollapsed}
            onToggleCollapsed={toggleLeft}
          />

          <PlanEditor
            projectRoot={project.path}
            slug={selectedSlug}
            onJumpToFeature={jumpToFeature}
          />

          {rightCollapsed ? (
            <aside className="w-10 border-l border-border-subtle bg-elevated flex flex-col items-center py-2 gap-2">
              <button
                onClick={toggleRight}
                title="Expand right panel"
                className="p-1 rounded hover:bg-base text-fg-secondary"
                aria-label="Expand right panel"
              >
                ◀
              </button>
              <button
                onClick={() => {
                  selectRightTab("features");
                  toggleRight();
                }}
                title="Features"
                className="text-[10px] text-fg-secondary [writing-mode:vertical-rl] rotate-180 hover:text-fg"
              >
                Features
              </button>
              <button
                onClick={() => {
                  selectRightTab("sessions");
                  toggleRight();
                }}
                title="Sessions"
                className="text-[10px] text-fg-secondary [writing-mode:vertical-rl] rotate-180 hover:text-fg"
              >
                Sessions
              </button>
            </aside>
          ) : (
            <aside className="w-80 border-l border-border-subtle bg-elevated flex flex-col">
              <div className="px-2 py-1.5 border-b border-border-subtle flex items-center gap-1">
                <button
                  onClick={toggleRight}
                  title="Collapse right panel"
                  className="p-1 rounded hover:bg-base text-fg-secondary"
                  aria-label="Collapse right panel"
                >
                  ▶
                </button>
                <button
                  onClick={() => selectRightTab("features")}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    rightTab === "features"
                      ? "bg-base text-accent-1 font-medium"
                      : "text-fg-secondary hover:bg-base hover:text-fg"
                  }`}
                >
                  Features
                </button>
                <button
                  onClick={() => selectRightTab("sessions")}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    rightTab === "sessions"
                      ? "bg-base text-accent-1 font-medium"
                      : "text-fg-secondary hover:bg-base hover:text-fg"
                  }`}
                >
                  Sessions
                </button>
              </div>
              <div className="flex-1 min-h-0">
                {rightTab === "features" ? (
                  <FeatureSidebar
                    highlightedIds={highlightedFeatures}
                    scrollToId={scrollToFeature}
                  />
                ) : (
                  <SessionsSidebar projectRoot={project.path} />
                )}
              </div>
            </aside>
          )}
        </div>
      )}
    </main>
  );
}
