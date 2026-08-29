// ---------------------------------------------------------------------------
// app/components/DiffPane.tsx — Server Component
// Renders a deterministic DiffFile as a developer-tool-style diff view.
// Line numbers, added/removed styling, token emphasis on the key change.
// No external diff library — single-hunk static fixture.
// ---------------------------------------------------------------------------

import React from "react";
import type { DiffFile, DiffLine } from "@/lib/review-workspace/diff";

interface DiffPaneProps {
  diff: DiffFile;
}

// Tokens to visually emphasise within the changed lines
const EMPHASIS_TOKENS: readonly string[] = [
  "RoundingMode.DOWN",
  "RoundingMode.HALF_UP",
];

/** Splits a line into text segments, wrapping emphasis tokens in <mark> */
function renderLineContent(content: string, emphasise: boolean): React.ReactNode {
  if (!emphasise || content.trim() === "") {
    return <span className="diff-content">{content || " "}</span>;
  }

  // Find first matching token
  for (const token of EMPHASIS_TOKENS) {
    const idx = content.indexOf(token);
    if (idx === -1) continue;
    const before = content.slice(0, idx);
    const after = content.slice(idx + token.length);
    return (
      <span className="diff-content">
        {before}
        <mark
          style={{
            background: "transparent",
            fontWeight: 700,
            color: "var(--text-primary)",
            textDecoration: "underline",
            textDecorationColor: "var(--text-muted)",
            textUnderlineOffset: "3px",
          }}
        >
          {token}
        </mark>
        {after}
      </span>
    );
  }

  return <span className="diff-content">{content}</span>;
}

function lineClass(line: DiffLine): string {
  switch (line.type) {
    case "added":
      return "diff-line-added";
    case "removed":
      return "diff-line-removed";
    default:
      return "diff-line-context";
  }
}

function linePrefix(line: DiffLine): string {
  switch (line.type) {
    case "added":
      return "+";
    case "removed":
      return "-";
    default:
      return " ";
  }
}

function formatLineNo(n: number | undefined): string {
  return n !== undefined ? String(n).padStart(4, " ") : "    ";
}

export default function DiffPane({ diff }: DiffPaneProps) {
  return (
    <section
      className="flex flex-col h-full overflow-hidden"
      aria-label="Code diff"
    >
      {/* Pane header: filename */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
        style={{
          background: "var(--surface-2)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <span
          className="text-xs uppercase tracking-widest font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          diff
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--text-secondary)" }}
          title={diff.filename}
        >
          {diff.filename}
        </span>
      </div>

      {/* Scrollable diff body */}
      <div
        className="flex-1 overflow-y-auto overflow-x-auto"
        style={{ background: "var(--surface-2)" }}
      >
        <table
          className="w-full border-collapse"
          style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
          aria-label={`Diff for ${diff.filename}`}
        >
          <tbody>
            {diff.hunks.map((hunk, hunkIdx) => (
              <React.Fragment key={`hunk-${hunkIdx}`}>
                {/* Hunk header row */}
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-1 text-xs select-none"
                    style={{
                      background: "var(--surface-1)",
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--border-subtle)",
                      borderBottom: "1px solid var(--border-subtle)",
                      fontFamily: "var(--font-geist-mono, monospace)",
                    }}
                  >
                    {hunk.header}
                  </td>
                </tr>

                {/* Diff lines */}
                {hunk.lines.map((line, lineIdx) => {
                  const shouldEmphasise = line.type !== "context";
                  const cls = lineClass(line);
                  return (
                    <tr
                      key={`hunk-${hunkIdx}-line-${lineIdx}`}
                      className={cls}
                      style={{ fontSize: "0.8125rem", lineHeight: "1.5" }}
                    >
                      {/* Before line number */}
                      <td
                        className="px-2 text-right select-none w-10 shrink-0"
                        style={{
                          color:
                            line.type === "context"
                              ? "var(--diff-lineno)"
                              : "var(--diff-lineno-active)",
                          userSelect: "none",
                          minWidth: "2.5rem",
                        }}
                        aria-hidden="true"
                      >
                        <span className="font-mono text-xs">
                          {formatLineNo(line.lineNumber.before)}
                        </span>
                      </td>

                      {/* After line number */}
                      <td
                        className="px-2 text-right select-none w-10 shrink-0"
                        style={{
                          color:
                            line.type === "context"
                              ? "var(--diff-lineno)"
                              : "var(--diff-lineno-active)",
                          userSelect: "none",
                          minWidth: "2.5rem",
                        }}
                        aria-hidden="true"
                      >
                        <span className="font-mono text-xs">
                          {formatLineNo(line.lineNumber.after)}
                        </span>
                      </td>

                      {/* +/- prefix */}
                      <td
                        className="px-1 select-none w-5 shrink-0 text-center"
                        style={{
                          color:
                            line.type === "added"
                              ? "var(--diff-added-border)"
                              : line.type === "removed"
                                ? "var(--diff-removed-border)"
                                : "var(--diff-lineno)",
                          fontWeight: line.type !== "context" ? 700 : 400,
                          userSelect: "none",
                        }}
                        aria-hidden="true"
                      >
                        <span className="font-mono text-xs">
                          {linePrefix(line)}
                        </span>
                      </td>

                      {/* Line content */}
                      <td
                        className="px-3 pr-8 whitespace-pre"
                        style={{
                          color:
                            line.type === "context"
                              ? "var(--text-muted)"
                              : "var(--text-code)",
                        }}
                      >
                        {renderLineContent(line.content, shouldEmphasise)}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
