import fs from "node:fs/promises";
import path from "node:path";
import { CLAUDE_CODE_FEATURES } from "./features";
import { getProjectRoot } from "./plans";
import type { ClaudeCodeFeature } from "./types";

/**
 * Effective feature catalogue = the built-in snapshot (lib/features.ts) plus any
 * features discovered from the user's own `claude` CLI and accepted locally.
 *
 * The built-in list is a point-in-time snapshot that goes stale when Anthropic
 * ships new Claude Code features. Rather than phone home or scrape docs (which
 * would break Adeptly's "nothing leaves your machine except via claude" model),
 * we let the local, self-updating `claude` binary tell us what's current, and
 * store what the user accepts in `.adeptly/features.json` (gitignored, per repo).
 */

const LOCAL_DIR = ".adeptly";
const LOCAL_FILE = "features.json";

export interface LocalFeature extends ClaudeCodeFeature {
  /** marks a feature that came from a refresh, not the built-in snapshot */
  custom: true;
  addedAt: string;
}

function localPath(projectRoot: string): string {
  return path.join(projectRoot, LOCAL_DIR, LOCAL_FILE);
}

export async function readLocalFeatures(projectRoot = getProjectRoot()): Promise<LocalFeature[]> {
  try {
    const raw = await fs.readFile(localPath(projectRoot), "utf-8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as LocalFeature[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalFeatures(features: LocalFeature[], projectRoot: string): Promise<void> {
  const dir = path.join(projectRoot, LOCAL_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(localPath(projectRoot), JSON.stringify(features, null, 2) + "\n", "utf-8");
}

/** Built-in snapshot + accepted local features, de-duped by id. */
export async function getEffectiveCatalogue(
  projectRoot = getProjectRoot()
): Promise<ClaudeCodeFeature[]> {
  const local = await readLocalFeatures(projectRoot);
  const builtinIds = new Set(CLAUDE_CODE_FEATURES.map((f) => f.id));
  const extra = local.filter((f) => !builtinIds.has(f.id));
  return [...CLAUDE_CODE_FEATURES, ...extra];
}

export async function getCustomIds(projectRoot = getProjectRoot()): Promise<string[]> {
  const local = await readLocalFeatures(projectRoot);
  const builtinIds = new Set(CLAUDE_CODE_FEATURES.map((f) => f.id));
  return local.filter((f) => !builtinIds.has(f.id)).map((f) => f.id);
}

/** Append newly-accepted features to the local store, skipping anything known. */
export async function addLocalFeatures(
  incoming: ClaudeCodeFeature[],
  addedAt: string,
  projectRoot = getProjectRoot()
): Promise<{ features: ClaudeCodeFeature[]; added: number }> {
  const existing = await readLocalFeatures(projectRoot);
  const known = new Set<string>([
    ...CLAUDE_CODE_FEATURES.map((f) => f.id),
    ...existing.map((f) => f.id),
  ]);
  const merged = [...existing];
  let added = 0;
  for (const f of incoming) {
    if (known.has(f.id)) continue;
    merged.push({ ...f, custom: true, addedAt });
    known.add(f.id);
    added += 1;
  }
  if (added > 0) await writeLocalFeatures(merged, projectRoot);
  return { features: await getEffectiveCatalogue(projectRoot), added };
}
