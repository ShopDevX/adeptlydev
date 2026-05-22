"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Command,
  Maximize2,
  Minimize2,
  MessageSquare,
  Keyboard,
} from "lucide-react";
import { PlansList } from "@/components/PlansList";
import { PlanEditor } from "@/components/PlanEditor";
import { FeatureSidebar } from "@/components/FeatureSidebar";
import { SessionsSidebar } from "@/components/SessionsSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { ChatPanel } from "@/components/ChatPanel";
import { Wordmark } from "@/components/Wordmark";
import { WelcomeEmpty } from "@/components/WelcomeEmpty";
import { ShortcutsOverlay } from "@/components/ShortcutsOverlay";
import { Splitter } from "@/components/Splitter";
import { ClaudePreflightBanner } from "@/components/ClaudePreflightBanner";
import { FileExplorer, FilePreviewModal } from "@/components/FileExplorer";
import {
  ProjectPicker,
  loadCurrentProject,
  saveCurrentProject,
  loadRecentProjects,
  saveRecentProjects,
} from "@/components/ProjectPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useShortcut } from "@/lib/use-shortcut";
import type { ProjectInfo } from "@/lib/types";

const LEFT_KEY = "adeptly:leftCollapsed";
const RIGHT_KEY = "adeptly:rightCollapsed";
const RIGHT_TAB_KEY = "adeptly:rightTab";
const LEFT_TAB_KEY = "adeptly:leftTab";

type RightTab = "features" | "sessions";
type LeftTab = "plans" | "files";

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
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Chat opens by default so first-time users see the primary affordance.
  // Persists across reloads via localStorage.
  const [chatOpen, setChatOpen] = useState(true);
  const [selectedPlanTitle, setSelectedPlanTitle] = useState<string | null>(null);
  const [planRefreshKey, setPlanRefreshKey] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(288);
  const [chatWidth, setChatWidth] = useState(420);
  const [leftTab, setLeftTab] = useState<LeftTab>("plans");
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  /** Transient status banner. Cleared by a timer after a few seconds. */
  const [lastAction, setLastAction] = useState<{ kind: "created" | "updated"; text: string } | null>(null);
  const lastActionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashAction(kind: "created" | "updated", text: string) {
    setLastAction({ kind, text });
    if (lastActionTimer.current) clearTimeout(lastActionTimer.current);
    lastActionTimer.current = setTimeout(() => setLastAction(null), 4000);
  }

  // Initial mount: read collapse state + current project from localStorage,
  // then ask the server for project info.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setLeftCollapsed(window.localStorage.getItem(LEFT_KEY) === "1");
    setRightCollapsed(window.localStorage.getItem(RIGHT_KEY) === "1");
    const savedTab = window.localStorage.getItem(RIGHT_TAB_KEY) as RightTab | null;
    if (savedTab === "features" || savedTab === "sessions") setRightTab(savedTab);
    const savedLeftTab = window.localStorage.getItem(LEFT_TAB_KEY) as LeftTab | null;
    if (savedLeftTab === "plans" || savedLeftTab === "files") setLeftTab(savedLeftTab);

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

  function selectLeftTab(t: LeftTab) {
    setLeftTab(t);
    if (typeof window !== "undefined") window.localStorage.setItem(LEFT_TAB_KEY, t);
  }

  function jumpToFeature(featureId: string) {
    setRightCollapsed(false);
    if (typeof window !== "undefined") window.localStorage.setItem(RIGHT_KEY, "0");
    selectRightTab("features");
    setHighlightedFeatures(new Set([featureId]));
    setScrollToFeature(featureId);
    setTimeout(() => setScrollToFeature(null), 250);
  }

  // Keyboard shortcuts (Phase E + chat)
  useShortcut([
    { key: "k", mod: true, handler: () => setPaletteOpen((o) => !o), whileTyping: true },
    {
      key: "f",
      mod: true,
      shift: true,
      handler: () => setFocusMode((f) => !f),
      whileTyping: true,
    },
    { key: "i", mod: true, handler: () => setChatOpen((o) => !o), whileTyping: true },
    { key: "?", shift: true, handler: () => setShortcutsOpen((o) => !o), whileTyping: false },
    {
      key: "Escape",
      handler: () => {
        // Most-recent-opened first: shortcuts overlay > palette >
        // focus mode > chat. We swallow keystroke (prevent: true) only
        // when we actually handled something, otherwise let it pass so
        // native browser behaviour (e.g. blurring inputs) still works.
        if (shortcutsOpen) {
          setShortcutsOpen(false);
        } else if (paletteOpen) {
          setPaletteOpen(false);
        } else if (focusMode) {
          setFocusMode(false);
        } else if (chatOpen) {
          setChatOpen(false);
        }
      },
      whileTyping: false,
      prevent: false,
    },
  ]);

  // Look up the selected plan's title for the chat panel header
  useEffect(() => {
    if (!project || !selectedSlug) {
      setSelectedPlanTitle(null);
      return;
    }
    fetch(`/api/plans/${selectedSlug}?projectRoot=${encodeURIComponent(project.path)}`)
      .then((r) => r.json())
      .then((data) => setSelectedPlanTitle(data?.plan?.title ?? null))
      .catch(() => setSelectedPlanTitle(null));
  }, [selectedSlug, project]);

  return (
    <main className="h-screen flex flex-col">
      <ClaudePreflightBanner />
      <header className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-elevated">
        <div className="flex items-center gap-3 min-w-0">
          <Wordmark size="md" />
          <div className="text-xs text-fg-secondary hidden lg:block truncate">
            Use Claude Code properly. Plan first, ship sharper.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project && (
            <button
              onClick={() => setChatOpen((o) => !o)}
              title="Chat with Claude (Ctrl+I)"
              className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-colors text-xs ${
                chatOpen
                  ? "border-accent-1 text-accent-1 bg-accent-soft"
                  : "border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg"
              }`}
            >
              <MessageSquare size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline">Chat</span>
              <span className="font-mono text-[10px] text-fg-tertiary">⌘I</span>
            </button>
          )}
          {project && (
            <button
              onClick={() => setPaletteOpen(true)}
              title="Command palette (Ctrl+K)"
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg transition-colors text-xs"
            >
              <Command size={14} strokeWidth={1.5} />
              <span className="font-mono text-[10px] text-fg-tertiary">⌘K</span>
            </button>
          )}
          {project && (
            <button
              onClick={() => setFocusMode((f) => !f)}
              title={`${focusMode ? "Exit" : "Enter"} focus mode (Ctrl+Shift+F)`}
              className="p-1.5 rounded border border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg transition-colors"
              aria-label="Toggle focus mode"
            >
              {focusMode ? (
                <Minimize2 size={14} strokeWidth={1.5} />
              ) : (
                <Maximize2 size={14} strokeWidth={1.5} />
              )}
            </button>
          )}
          <button
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (Shift+?)"
            aria-label="Keyboard shortcuts"
            className="p-1.5 rounded border border-border-subtle hover:border-border-strong text-fg-secondary hover:text-fg transition-colors"
          >
            <Keyboard size={14} strokeWidth={1.5} />
          </button>
          <ThemeToggle />
          <ProjectPicker
            current={project}
            onSelect={handleSelectProject}
            forceOpen={pickerOpen}
            onOpenChange={setPickerOpen}
          />
        </div>
      </header>

      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        projectRoot={project?.path ?? null}
        onSelectPlan={(slug) => {
          setSelectedSlug(slug);
          setPaletteOpen(false);
        }}
      />

      {focusMode && project && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full border border-border-strong shadow-lg text-xs text-fg-secondary flex items-center gap-2"
          style={{ background: "var(--bg-overlay)", backdropFilter: "blur(16px)" }}
        >
          <span>Focus mode</span>
          <kbd>esc</kbd>
          <span className="text-fg-tertiary">to exit</span>
        </div>
      )}

      <FilePreviewModal
        projectRoot={project?.path ?? null}
        filePath={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {!project && (
        <WelcomeEmpty
          onOpenProject={() => setPickerOpen(true)}
          onOpenSelf={() => handleSelectProject("")}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          selfProjectPath="(Adeptly itself)"
        />
      )}

      {project && (
        <div className="flex-1 flex min-h-0">
          {!focusMode && (
            <>
              {leftCollapsed ? (
                <PlansList
                  projectRoot={project.path}
                  selected={selectedSlug}
                  onSelect={setSelectedSlug}
                  refreshKey={refreshKey}
                  collapsed={leftCollapsed}
                  onToggleCollapsed={toggleLeft}
                  onPlanCreated={(slug, title) => {
                    setSelectedPlanTitle(title);
                    flashAction("created", `Plan created: ${title}`);
                  }}
                  width={leftWidth}
                />
              ) : (
                <aside
                  className="border-r border-border-subtle bg-elevated flex flex-col shrink-0"
                  style={{ width: leftWidth }}
                >
                  <div className="flex items-center gap-0.5 px-2 pt-2 border-b border-border-subtle">
                    <button
                      onClick={() => selectLeftTab("plans")}
                      className={`text-xs px-2.5 py-1 rounded-t transition-colors ${
                        leftTab === "plans"
                          ? "bg-base border border-border-subtle border-b-base -mb-px font-medium text-fg"
                          : "text-fg-secondary hover:text-fg"
                      }`}
                    >
                      Plans
                    </button>
                    <button
                      onClick={() => selectLeftTab("files")}
                      className={`text-xs px-2.5 py-1 rounded-t transition-colors ${
                        leftTab === "files"
                          ? "bg-base border border-border-subtle border-b-base -mb-px font-medium text-fg"
                          : "text-fg-secondary hover:text-fg"
                      }`}
                    >
                      Files
                    </button>
                    <button
                      onClick={toggleLeft}
                      title="Collapse left panel"
                      aria-label="Collapse left panel"
                      className="ml-auto p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
                    >
                      <ChevronLeft size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto min-h-0">
                    {leftTab === "plans" ? (
                      <PlansList
                        projectRoot={project.path}
                        selected={selectedSlug}
                        onSelect={setSelectedSlug}
                        refreshKey={refreshKey}
                        collapsed={false}
                        onToggleCollapsed={toggleLeft}
                        onPlanCreated={(slug, title) => {
                          setSelectedPlanTitle(title);
                          flashAction("created", `Plan created: ${title}`);
                        }}
                        width={leftWidth}
                        embedded
                      />
                    ) : (
                      <FileExplorer
                        projectRoot={project.path}
                        width={leftWidth}
                        onPreviewFile={(filePath) => setPreviewFile(filePath)}
                      />
                    )}
                  </div>
                </aside>
              )}
              {!leftCollapsed && (
                <Splitter
                  storageKey="adeptly:left-width"
                  defaultWidth={288}
                  min={200}
                  max={520}
                  side="left"
                  onChange={setLeftWidth}
                />
              )}
            </>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
            {lastAction && (
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 shadow-lg"
                style={{
                  background: "var(--bg-overlay)",
                  backdropFilter: "blur(16px)",
                  borderColor: "var(--status-approved)",
                  color: "var(--status-approved)",
                }}
              >
                ✓ {lastAction.text}
              </div>
            )}
            <PlanEditor
              projectRoot={project.path}
              slug={selectedSlug}
              onJumpToFeature={jumpToFeature}
              refreshKey={planRefreshKey}
            />
          </div>

          {!focusMode && chatOpen && (
            <>
              <Splitter
                storageKey="adeptly:chat-width"
                defaultWidth={420}
                min={320}
                max={720}
                side="right"
                onChange={setChatWidth}
              />
              <ChatPanel
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                projectRoot={project?.path ?? null}
                planSlug={selectedSlug}
                planTitle={selectedPlanTitle}
                onPlanUpdated={() => {
                  setPlanRefreshKey((k) => k + 1);
                  flashAction("updated", `Plan updated`);
                }}
                onPlanCreated={(slug, title) => {
                  setSelectedSlug(slug);
                  setSelectedPlanTitle(title);
                  setRefreshKey((k) => k + 1);
                  flashAction("created", `Plan created: ${title}`);
                }}
                width={chatWidth}
              />
            </>
          )}

          {focusMode || chatOpen ? null : rightCollapsed ? (
            <aside className="w-10 border-l border-border-subtle bg-elevated flex flex-col items-center py-2 gap-2">
              <button
                onClick={toggleRight}
                title="Expand right panel"
                className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
                aria-label="Expand right panel"
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
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
                  className="p-1 rounded hover:bg-base text-fg-secondary hover:text-fg transition-colors"
                  aria-label="Collapse right panel"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
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
