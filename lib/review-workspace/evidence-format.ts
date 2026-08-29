// ---------------------------------------------------------------------------
// lib/review-workspace/evidence-format.ts
// Shared formatting utilities for evidence rendering in FindingsPane and
// IntentPanel. Extracted from FindingsPane to avoid duplication (REQ-009).
// ---------------------------------------------------------------------------

/**
 * Shortens a file path to its last two segments for compact display.
 * Full path is retained for tooltip (title) use.
 * Example: "demo/legacy-billing/src/util/MoneyUtils.java" → "…/util/MoneyUtils.java"
 */
export function shortFilePath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  if (parts.length <= 2) return path;
  return `…/${parts.slice(-2).join("/")}`;
}

/**
 * Formats a 1-based line number or [start, end] range as a display string.
 * Examples: 51 → "L51", [17, 19] → "L17–19", [51, 51] → "L51"
 */
export function formatLineRange(
  line: number | [number, number] | undefined
): string | null {
  if (line === undefined) return null;
  if (Array.isArray(line)) {
    return line[0] === line[1] ? `L${line[0]}` : `L${line[0]}–${line[1]}`;
  }
  return `L${line}`;
}
