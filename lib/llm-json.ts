/**
 * Extract a single JSON object from LLM output. Models occasionally wrap their
 * reply in ```json fences or add a sentence of preamble; this strips fences and
 * grabs the outermost `{ … }`. Returns the parsed value, or null if there's no
 * valid object to parse. One helper for every place we ask Claude for JSON.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  let text = (raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1)) as T;
  } catch {
    return null;
  }
}

/**
 * Like {@link extractJson}, but for a top-level JSON array `[ … ]`. Strips
 * ```json fences and grabs the outermost brackets. Returns the parsed array,
 * or null if there's nothing valid to parse.
 */
export function extractJsonArray<T = unknown>(raw: string): T[] | null {
  let text = (raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const first = text.indexOf("[");
  const last = text.lastIndexOf("]");
  if (first === -1 || last === -1 || last < first) return null;
  try {
    const parsed = JSON.parse(text.slice(first, last + 1));
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}
