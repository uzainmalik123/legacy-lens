// ---------------------------------------------------------------------------
// lib/review-workspace/confidence.ts
// Thin UI formatting utilities for confidence scores and band labels.
// Uses confidenceLabel() from lib/analysis/types.ts — does not re-implement thresholds.
// ---------------------------------------------------------------------------

import {
  confidenceLabel,
  type ConfidenceLevel,
} from "@/lib/analysis/types";

/**
 * Formats a 0–1 confidence score as a percentage string, e.g. "96%".
 */
export function formatConfidencePct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Maps a ConfidenceLevel band to a human-readable label, e.g. "High confidence".
 */
export function confidenceBandLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
  }
}

/**
 * Returns both the formatted percentage and band label for a 0–1 score.
 * Uses confidenceLabel() from lib/analysis/types.ts for threshold computation.
 */
export function formatConfidence(score: number): {
  pct: string;
  level: ConfidenceLevel;
  label: string;
} {
  const level = confidenceLabel(score);
  return {
    pct: formatConfidencePct(score),
    level,
    label: confidenceBandLabel(level),
  };
}
