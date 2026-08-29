import { z } from "zod";

// ---------------------------------------------------------------------------
// ConfidenceLevel — UI display utility only (not a BehavioralRule field)
// PRD §17.3 thresholds: >= 0.80 high, >= 0.50 medium, < 0.50 low
// ---------------------------------------------------------------------------

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export function confidenceLabel(score: number): ConfidenceLevel {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// TestCoverageStatus
// ---------------------------------------------------------------------------

export const TestCoverageStatusSchema = z.enum([
  "covered",
  "partial",
  "uncovered",
  "unknown",
]);
export type TestCoverageStatus = z.infer<typeof TestCoverageStatusSchema>;

// ---------------------------------------------------------------------------
// BehavioralEvidence
// ---------------------------------------------------------------------------

const LineNumberSchema = z.union([
  z.number().int().min(1),
  z
    .tuple([z.number().int().min(1), z.number().int().min(1)])
    .refine(([start, end]) => end >= start, {
      message: "line range end must be >= start",
    }),
]);

export const BehavioralEvidenceSchema = z.object({
  file: z.string(),
  symbol: z.string().optional(),
  line: LineNumberSchema.optional(),
  excerpt: z.string().optional(),
  kind: z.enum(["source", "test", "dependency", "change"]),
});
export type BehavioralEvidence = z.infer<typeof BehavioralEvidenceSchema>;

// ---------------------------------------------------------------------------
// BehavioralRule
// ---------------------------------------------------------------------------

export const BehavioralRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  businessContext: z.string(),
  invariant: z.string(),
  evidence: z.array(BehavioralEvidenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  testCoverage: TestCoverageStatusSchema,
  relatedSymbols: z.array(z.string()),
  downstreamDependencies: z.array(z.string()),
  riskIfChanged: z.string(),
});
export type BehavioralRule = z.infer<typeof BehavioralRuleSchema>;

// ---------------------------------------------------------------------------
// BehavioralContract
// ---------------------------------------------------------------------------

export const BehavioralContractSchema = z.object({
  analysisId: z.string(),
  generatedAt: z.string().datetime(),
  sourceFixture: z.string(),
  rules: z.array(BehavioralRuleSchema).min(1),
});
export type BehavioralContract = z.infer<typeof BehavioralContractSchema>;
