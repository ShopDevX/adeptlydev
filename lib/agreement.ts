import fs from "node:fs/promises";
import path from "node:path";
import { getProjectRoot } from "./plans";

/**
 * Working Agreement — the shared pre-flight contract every task carries.
 *
 * The problem it solves: when you split work across parallel Claude Code
 * sessions, each session gets an ad-hoc prompt, so rigor is inconsistent — the
 * session you *hand* a subtask to surfaces concerns and security impact first,
 * while the *driver* session just implements. There's no definition-of-done
 * that travels WITH the task.
 *
 * The Agreement fixes that: it's a per-project markdown gate that Adeptly staples
 * onto every delegated brief and every "copy as prompt", so every session —
 * driver included — runs the same checks. Stored at `.adeptly/agreement.md`
 * (gitignored by default; commit it if you want the whole team on the same bar).
 */

const AGREEMENT_PATH = ".adeptly/agreement.md";

export const DEFAULT_AGREEMENT = `# Working Agreement

Follow this before implementing ANY task in this repo — whether you started it or picked it up from another session.

1. **Restate the scope** in one line. If it's bigger than described, stop and flag it before touching code.
2. **Surface concerns** — list edge cases, assumptions, and anything that looks risky or under-specified.
3. **State the security impact.** If the task touches auth, sessions, credentials, user input, file uploads, DB queries, or external calls, run \`/security-review\` before you finish.
4. **Confirm the approach** — the files you'll change and the order. For non-trivial work, wait for approval before writing code.
5. **Smallest sensible diff.** Follow existing conventions. Don't add unrelated changes.
6. **Stay in your lane.** Only edit the files assigned to your subtask; another session may own the rest.
`;

function filePath(projectRoot: string): string {
  return path.join(projectRoot, AGREEMENT_PATH);
}

/** Current agreement text, or the built-in default if none has been saved. */
export async function getAgreement(projectRoot = getProjectRoot()): Promise<{ text: string; custom: boolean }> {
  try {
    const text = await fs.readFile(filePath(projectRoot), "utf-8");
    return { text, custom: true };
  } catch {
    return { text: DEFAULT_AGREEMENT, custom: false };
  }
}

export async function setAgreement(text: string, projectRoot = getProjectRoot()): Promise<void> {
  const dir = path.join(projectRoot, ".adeptly");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath(projectRoot), text, "utf-8");
}

/** Staple the agreement onto a task prompt so the session can't skip the gate. */
export function wrapWithAgreement(taskContent: string, agreement: string): string {
  return `${taskContent.trim()}

---

${agreement.trim()}

Acknowledge the Working Agreement above, then proceed through its steps in order.`;
}
