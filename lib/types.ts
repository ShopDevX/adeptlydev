export type PlanStatus = "draft" | "in-review" | "approved" | "changes-requested";

export type ReviewerStatus = "pending" | "approved" | "changes-requested";

export interface Reviewer {
  name: string;
  status: ReviewerStatus;
  comments: string[];
  decidedAt?: string;
  githubUrl?: string;
  avatarUrl?: string;
}

export interface Approval {
  plan: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  author: string;
  reviewers: Reviewer[];
}

export interface Plan {
  slug: string;
  filename: string;
  title: string;
  content: string;
  approval: Approval | null;
}

export interface SessionSummary {
  id: string;
  filename: string;
  startedAt: string;
  lastTurnAt: string;
  firstUserMessage: string;
  turnCount: number;
  cwd?: string;
}

export type FeatureCategory =
  | "Planning"
  | "Agents"
  | "Skills"
  | "Hooks"
  | "MCP"
  | "Memory"
  | "Sessions"
  | "Worktrees"
  | "Scheduling"
  | "Background"
  | "Permissions";

export interface ClaudeCodeFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  description: string;
  whenToUse: string;
  invocation?: string;
  docsHint?: string;
}

export interface FeatureSuggestion {
  featureId: string;
  reason: string;
  matchedText?: string;
  /** 1-based line number in the plan markdown where the match occurred. */
  line?: number;
}

export interface GitHubCollaborator {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions?: number;
}

export interface GitHubInfo {
  owner: string;
  repo: string;
  remoteUrl: string;
  collaborators: GitHubCollaborator[];
  collaboratorsError?: string;
}

export interface ProjectInfo {
  path: string;
  name: string;
  hasPlansDir: boolean;
  plansCount: number;
  github?: GitHubInfo | null;
}
