// ---------------------------------------------------------------------------
// lib/review-workspace/diff.ts
// Deterministic diff fixture for the Meridian MoneyUtils.java rounding change.
// This module embeds the known diff as a typed constant — no disk I/O, no
// patch parsing at runtime.
// ---------------------------------------------------------------------------

export type DiffLineType = "context" | "added" | "removed";

export interface DiffLineNumber {
  before?: number;
  after?: number;
}

export interface DiffLine {
  type: DiffLineType;
  lineNumber: DiffLineNumber;
  content: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  filename: string;
  hunks: DiffHunk[];
}

// ---------------------------------------------------------------------------
// MeridianDiff — the canonical DOWN → HALF_UP rounding change in MoneyUtils.java
// Source lines derived from the known fixture content in:
//   lib/analysis/fixtures/meridian-sample-contract.json  (BR-01 evidence)
//   lib/analysis/fixtures/meridian-sample-review.json    (F-001 evidence)
// ---------------------------------------------------------------------------

export const MeridianDiff: DiffFile = {
  filename:
    "src/main/java/com/meridian/billing/util/MoneyUtils.java",
  hunks: [
    {
      header: "@@ -12,15 +12,15 @@",
      lines: [
        // --- context before the change ---
        {
          type: "context",
          lineNumber: { before: 12, after: 12 },
          content: "    /**",
        },
        {
          type: "context",
          lineNumber: { before: 13, after: 13 },
          content:
            "     * Rounds a late fee value to two decimal places.",
        },
        {
          type: "context",
          lineNumber: { before: 14, after: 14 },
          content:
            "     * Uses RoundingMode.DOWN (truncation) — customers are never",
        },
        {
          type: "context",
          lineNumber: { before: 15, after: 15 },
          content: "     * charged more than the precise calculated amount.",
        },
        {
          type: "context",
          lineNumber: { before: 16, after: 16 },
          content: "     */",
        },
        {
          type: "context",
          lineNumber: { before: 17, after: 17 },
          content: "    public static BigDecimal roundLateFee(BigDecimal value) {",
        },
        // --- the change ---
        {
          type: "removed",
          lineNumber: { before: 18 },
          content: "        return value.setScale(2, RoundingMode.DOWN);",
        },
        {
          type: "added",
          lineNumber: { after: 18 },
          content: "        return value.setScale(2, RoundingMode.HALF_UP);",
        },
        // --- context after the change ---
        {
          type: "context",
          lineNumber: { before: 19, after: 19 },
          content: "    }",
        },
        {
          type: "context",
          lineNumber: { before: 20, after: 20 },
          content: "",
        },
        {
          type: "context",
          lineNumber: { before: 21, after: 21 },
          content: "    /**",
        },
        {
          type: "context",
          lineNumber: { before: 22, after: 22 },
          content:
            "     * Rounds an interest value to two decimal places.",
        },
        {
          type: "context",
          lineNumber: { before: 23, after: 23 },
          content:
            "     * Uses RoundingMode.HALF_UP — interest rounding is intentionally",
        },
        {
          type: "context",
          lineNumber: { before: 24, after: 24 },
          content:
            "     * asymmetric with late-fee rounding.",
        },
        {
          type: "context",
          lineNumber: { before: 25, after: 25 },
          content: "     */",
        },
        {
          type: "context",
          lineNumber: { before: 26, after: 26 },
          content:
            "    public static BigDecimal roundInterest(BigDecimal value) {",
        },
      ],
    },
  ],
};
