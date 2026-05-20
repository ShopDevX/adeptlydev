import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Plan, Approval, PlanStatus } from "./types";

/**
 * Adeptly reads plans from <projectRoot>/docs/plans/*.md and approvals from
 * <projectRoot>/docs/plans/approvals/<slug>.json. The project root defaults to
 * the current working directory (we eat our own dog food by default).
 */

export function getProjectRoot(): string {
  return process.env.ADEPTLY_PROJECT_ROOT || process.cwd();
}

export function getPlansDir(projectRoot = getProjectRoot()): string {
  return path.join(projectRoot, "docs", "plans");
}

export function getApprovalsDir(projectRoot = getProjectRoot()): string {
  return path.join(getPlansDir(projectRoot), "approvals");
}

function deriveTitle(content: string, fallback: string): string {
  const headingMatch = content.match(/^#\s+(.+?)\s*$/m);
  if (headingMatch) return headingMatch[1].trim();
  return fallback;
}

async function ensureApprovalsDir(projectRoot = getProjectRoot()): Promise<void> {
  const dir = getApprovalsDir(projectRoot);
  await fs.mkdir(dir, { recursive: true });
}

export async function listPlans(projectRoot = getProjectRoot()): Promise<Plan[]> {
  const dir = getPlansDir(projectRoot);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
  const mdFiles = entries.filter((f) => f.endsWith(".md"));
  const plans: Plan[] = [];
  for (const filename of mdFiles) {
    const slug = filename.replace(/\.md$/, "");
    const plan = await readPlan(slug, projectRoot);
    if (plan) plans.push(plan);
  }
  // Sort by approval updatedAt desc, with no-approval plans last
  plans.sort((a, b) => {
    const aT = a.approval?.updatedAt ?? "";
    const bT = b.approval?.updatedAt ?? "";
    if (aT === bT) return a.slug.localeCompare(b.slug);
    return bT.localeCompare(aT);
  });
  return plans;
}

export async function readPlan(slug: string, projectRoot = getProjectRoot()): Promise<Plan | null> {
  const filename = `${slug}.md`;
  const filePath = path.join(getPlansDir(projectRoot), filename);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
  const parsed = matter(raw);
  const content = parsed.content || raw;
  const title = (parsed.data?.title as string | undefined) || deriveTitle(content, slug);
  const approval = await readApproval(slug, projectRoot);
  return {
    slug,
    filename,
    title,
    content: raw, // store the full file so saves preserve front-matter
    approval,
  };
}

export async function writePlan(slug: string, content: string, projectRoot = getProjectRoot()): Promise<void> {
  const filePath = path.join(getPlansDir(projectRoot), `${slug}.md`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
  // Bump approval updatedAt if approval exists
  const approval = await readApproval(slug, projectRoot);
  if (approval) {
    approval.updatedAt = new Date().toISOString().slice(0, 10);
    await writeApproval(slug, approval, projectRoot);
  }
}

export async function readApproval(slug: string, projectRoot = getProjectRoot()): Promise<Approval | null> {
  const filePath = path.join(getApprovalsDir(projectRoot), `${slug}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Approval;
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

export async function writeApproval(slug: string, approval: Approval, projectRoot = getProjectRoot()): Promise<void> {
  await ensureApprovalsDir(projectRoot);
  const filePath = path.join(getApprovalsDir(projectRoot), `${slug}.json`);
  approval.updatedAt = new Date().toISOString().slice(0, 10);
  await fs.writeFile(filePath, JSON.stringify(approval, null, 2) + "\n", "utf-8");
}

export async function setPlanStatus(slug: string, status: PlanStatus, projectRoot = getProjectRoot()): Promise<Approval | null> {
  const approval = await readApproval(slug, projectRoot);
  if (!approval) return null;
  approval.status = status;
  await writeApproval(slug, approval, projectRoot);
  return approval;
}

const NEW_PLAN_TEMPLATE = (title: string) => `# ${title}

**Status:** DRAFT — awaiting review
**Author:** you
**Created:** ${new Date().toISOString().slice(0, 10)}

> Write the plan before you write the code. Approve it. Then ship.

## 1. Problem

What problem does this plan solve? One paragraph.

## 2. Approach

How are you going to solve it? Constraints, assumptions, trade-offs.

## 3. Files to change

- create path/to/new-file.ts
- modify path/to/existing-file.ts
- delete path/to/old-file.ts

Adeptly checks each path against the codebase and warns on mismatches.

## 4. Flow

\`\`\`mermaid
flowchart LR
  A[Start] --> B[Step 1]
  B --> C[Step 2]
  C --> D[Done]
\`\`\`

## 5. Risks

- Risk 1 — mitigation.

## 6. Approval

Approve in the panel below when ready.
`;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export async function createPlan(
  title: string,
  projectRoot = getProjectRoot(),
  customSlug?: string
): Promise<{ slug: string; filename: string }> {
  const slug = (customSlug && slugify(customSlug)) || slugify(title) || "untitled-plan";
  const filename = `${slug}.md`;
  const filePath = path.join(getPlansDir(projectRoot), filename);

  await fs.mkdir(getPlansDir(projectRoot), { recursive: true });

  // Refuse to overwrite an existing plan
  try {
    await fs.access(filePath);
    throw new Error(`A plan named "${slug}.md" already exists. Pick a different title.`);
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }

  await fs.writeFile(filePath, NEW_PLAN_TEMPLATE(title), "utf-8");

  // Seed an empty approval record so reviewers can be added
  const approval: Approval = {
    plan: filename,
    status: "draft",
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    author: "you",
    reviewers: [],
  };
  await writeApproval(slug, approval, projectRoot);

  return { slug, filename };
}

export async function addReviewer(
  slug: string,
  name: string,
  projectRoot = getProjectRoot(),
  opts?: { githubUrl?: string; avatarUrl?: string }
): Promise<Approval | null> {
  let approval = await readApproval(slug, projectRoot);
  if (!approval) {
    // Bootstrap an approval record if one doesn't exist yet
    approval = {
      plan: `${slug}.md`,
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      author: "you",
      reviewers: [],
    };
  }
  if (!approval.reviewers.find((r) => r.name === name)) {
    approval.reviewers.push({
      name,
      status: "pending",
      comments: [],
      ...(opts?.githubUrl ? { githubUrl: opts.githubUrl } : {}),
      ...(opts?.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
    });
    await writeApproval(slug, approval, projectRoot);
  }
  return approval;
}

export async function removeReviewer(
  slug: string,
  name: string,
  projectRoot = getProjectRoot()
): Promise<Approval | null> {
  const approval = await readApproval(slug, projectRoot);
  if (!approval) return null;
  approval.reviewers = approval.reviewers.filter((r) => r.name !== name);
  await writeApproval(slug, approval, projectRoot);
  return approval;
}

export async function setReviewerStatus(
  slug: string,
  reviewerName: string,
  status: "approved" | "changes-requested",
  projectRoot = getProjectRoot()
): Promise<Approval | null> {
  const approval = await readApproval(slug, projectRoot);
  if (!approval) return null;
  const reviewer = approval.reviewers.find((r) => r.name === reviewerName);
  if (!reviewer) return null;
  reviewer.status = status;
  reviewer.decidedAt = new Date().toISOString().slice(0, 10);
  // Plan status: approved if every reviewer approved, else changes-requested if any rejected, else in-review
  const anyRejected = approval.reviewers.some((r) => r.status === "changes-requested");
  const allApproved = approval.reviewers.every((r) => r.status === "approved");
  if (anyRejected) approval.status = "changes-requested";
  else if (allApproved) approval.status = "approved";
  else approval.status = "in-review";
  await writeApproval(slug, approval, projectRoot);
  return approval;
}

export interface FileChange {
  kind: "create" | "modify" | "delete";
  path: string;
  exists: boolean;
}

/**
 * Crude codebase-diff hint: scans the plan markdown for declarations like
 *   - `create path/to/file.ts`
 *   - `modify path/to/file.ts`
 *   - `delete path/to/file.ts`
 * and reports whether each path currently exists in the project root.
 */
export async function detectDeclaredChanges(content: string, projectRoot = getProjectRoot()): Promise<FileChange[]> {
  const pattern = /^\s*[-*]\s*(create|modify|delete)\s+`?([\w./\\-]+)`?/gim;
  const seen = new Set<string>();
  const changes: FileChange[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const kind = match[1].toLowerCase() as FileChange["kind"];
    const relPath = match[2].replace(/\\/g, "/");
    const key = `${kind}::${relPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const absPath = path.join(projectRoot, relPath);
    let exists = false;
    try {
      await fs.access(absPath);
      exists = true;
    } catch {
      exists = false;
    }
    changes.push({ kind, path: relPath, exists });
  }
  return changes;
}
