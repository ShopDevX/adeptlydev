import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectInfo } from "./types";
import { getPlansDir, getApprovalsDir, listPlans } from "./plans";
import { readGitHubInfo } from "./github";

/**
 * Resolves the project root from a request — either the ?projectRoot query
 * param (validated for existence) or, as a fallback, process.cwd().
 *
 * We deliberately do NOT keep a server-side list of "known projects". The
 * client persists recents in localStorage. Each API request brings its own
 * projectRoot. This keeps the server stateless and safe.
 */
export function resolveProjectRoot(requested: string | null | undefined): string {
  if (requested && requested.trim().length > 0) {
    return path.resolve(requested.trim());
  }
  return process.env.ADEPTLY_PROJECT_ROOT || process.cwd();
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function projectInfo(projectRoot: string): Promise<ProjectInfo> {
  const name = path.basename(projectRoot);
  const plansDir = getPlansDir(projectRoot);
  const hasPlansDir = await pathExists(plansDir);
  let plansCount = 0;
  if (hasPlansDir) {
    try {
      const plans = await listPlans(projectRoot);
      plansCount = plans.length;
    } catch {
      plansCount = 0;
    }
  }
  const github = await readGitHubInfo(projectRoot).catch(() => null);
  return { path: projectRoot, name, hasPlansDir, plansCount, github };
}

const STARTER_PLAN = `---
title: First Plan
---

# First Plan — change this title

**Status:** DRAFT — awaiting review
**Author:** you
**Created:** ${new Date().toISOString().slice(0, 10)}

> Write the plan before you write the code. Approve it. Then ship.

## 1. Problem

Describe the problem you're solving in one paragraph.

## 2. Approach

How will you solve it. Reference any constraints, assumptions, or trade-offs.

## 3. Files to change

- create path/to/new-file.ts
- modify path/to/existing-file.ts
- delete path/to/old-file.ts

Adeptly will check each path against the codebase and warn if a "create" path already exists or a "modify"/"delete" path doesn't.

## 4. Flow

\`\`\`mermaid
flowchart LR
  A[Start] --> B[Step 1]
  B --> C[Step 2]
  C --> D[Done]
\`\`\`

## 5. Risks

- Risk 1 — mitigation.
- Risk 2 — mitigation.

## 6. Reviewers

Once you submit this plan, the approval panel below will show your reviewers and let them approve or request changes.
`;

const STARTER_APPROVAL = (filename: string) => `{
  "plan": "${filename}",
  "status": "draft",
  "createdAt": "${new Date().toISOString().slice(0, 10)}",
  "updatedAt": "${new Date().toISOString().slice(0, 10)}",
  "author": "you",
  "reviewers": []
}
`;

const STARTER_README = `# {{NAME}}

A new project, planned with [Adeptly](https://adeptly.dev).

Plans live in \`docs/plans/\`. Approvals live in \`docs/plans/approvals/\`.
`;

export async function initProject(projectRoot: string): Promise<ProjectInfo> {
  const abs = path.resolve(projectRoot);
  await fs.mkdir(abs, { recursive: true });
  const plansDir = getPlansDir(abs);
  await fs.mkdir(plansDir, { recursive: true });
  const approvalsDir = getApprovalsDir(abs);
  await fs.mkdir(approvalsDir, { recursive: true });

  // Starter README if none exists
  const readmePath = path.join(abs, "README.md");
  if (!(await pathExists(readmePath))) {
    await fs.writeFile(readmePath, STARTER_README.replace("{{NAME}}", path.basename(abs)), "utf-8");
  }

  // Starter plan if there are no plans yet
  const existingPlans = await fs.readdir(plansDir).catch(() => [] as string[]);
  const hasMd = existingPlans.some((f) => f.endsWith(".md"));
  if (!hasMd) {
    const planFile = path.join(plansDir, "first-plan.md");
    await fs.writeFile(planFile, STARTER_PLAN, "utf-8");
    const approvalFile = path.join(approvalsDir, "first-plan.json");
    await fs.writeFile(approvalFile, STARTER_APPROVAL("first-plan.md"), "utf-8");
  }

  return projectInfo(abs);
}
