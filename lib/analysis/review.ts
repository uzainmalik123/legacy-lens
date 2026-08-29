import { z } from "zod";
import {
  BehavioralEvidenceSchema,
  TestCoverageStatusSchema,
} from "@/lib/analysis/types";

// ---------------------------------------------------------------------------
// Severity — PRD §18 Risk Model
// ---------------------------------------------------------------------------

export const SeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export type Severity = z.infer<typeof SeveritySchema>;

// ---------------------------------------------------------------------------
// Line range — same semantics as BehavioralEvidence.line (1-based, start <= end)
// Defined inline because lib/analysis/types.ts is frozen and does not export
// LineNumberSchema.
// ---------------------------------------------------------------------------

const ChangedLinesSchema = z
  .union([
    z.number().int().min(1),
    z
      .tuple([z.number().int().min(1), z.number().int().min(1)])
      .refine(([start, end]) => end >= start, {
        message: "changedLines range end must be >= start",
      }),
  ])
  .optional();

// ---------------------------------------------------------------------------
// ReviewFinding — PRD §FR-007
// ---------------------------------------------------------------------------

export const ReviewFindingSchema = z.object({
  id: z.string(),
  severity: SeveritySchema,
  title: z.string(),
  summary: z.string(),
  behaviorRuleIds: z.array(z.string()),
  changedFile: z.string().optional(),
  changedLines: ChangedLinesSchema,
  businessImpact: z.string(),
  evidence: z.array(BehavioralEvidenceSchema),
  confidence: z.number().min(0).max(1),
  testCoverage: TestCoverageStatusSchema,
  recommendedAction: z.string(),
});
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

// ---------------------------------------------------------------------------
// ReviewReport — PRD §20.2
// ---------------------------------------------------------------------------

export const ReviewReportSchema = z.object({
  analysisId: z.string(),
  overallRisk: SeveritySchema,
  riskScore: z.number().int().min(0).max(100).optional(),
  findings: z.array(ReviewFindingSchema),
  affectedBehaviorRuleIds: z.array(z.string()),
});
export type ReviewReport = z.infer<typeof ReviewReportSchema>;

// ---------------------------------------------------------------------------
// ReviewReportWireSchema — snake_case wire format (PRD §20.2)
// Uses .passthrough() so _fixture_note and other unknown keys are allowed.
// ---------------------------------------------------------------------------

const ReviewFindingWireSchema = z
  .object({
    id: z.string(),
    severity: SeveritySchema,
    title: z.string(),
    summary: z.string(),
    behavior_rule_ids: z.array(z.string()),
    changed_file: z.string().optional(),
    changed_lines: ChangedLinesSchema,
    business_impact: z.string(),
    evidence: z.array(
      z
        .object({
          file: z.string(),
          symbol: z.string().optional(),
          line: z
            .union([
              z.number().int().min(1),
              z
                .tuple([z.number().int().min(1), z.number().int().min(1)])
                .refine(([s, e]) => e >= s, {
                  message: "line range end must be >= start",
                }),
            ])
            .optional(),
          excerpt: z.string().optional(),
          kind: z.enum(["source", "test", "dependency", "change"]),
        })
        .passthrough()
    ),
    confidence: z.number().min(0).max(1),
    test_coverage: z.enum(["covered", "partial", "uncovered", "unknown"]),
    recommended_action: z.string(),
  })
  .passthrough();

export const ReviewReportWireSchema = z
  .object({
    analysis_id: z.string(),
    overall_risk: SeveritySchema,
    risk_score: z.number().int().min(0).max(100).optional(),
    findings: z.array(ReviewFindingWireSchema),
    affected_behavior_rule_ids: z.array(z.string()),
  })
  .passthrough();

export type ReviewReportWire = z.infer<typeof ReviewReportWireSchema>;

// ---------------------------------------------------------------------------
// reviewFromWireFormat — maps snake_case wire object to camelCase ReviewReport
// SEC-001: caller must parse through ReviewReportWireSchema before calling this.
// ---------------------------------------------------------------------------

export function reviewFromWireFormat(wire: ReviewReportWire): ReviewReport {
  return {
    analysisId: wire.analysis_id,
    overallRisk: wire.overall_risk,
    riskScore: wire.risk_score,
    findings: wire.findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      summary: f.summary,
      behaviorRuleIds: f.behavior_rule_ids,
      changedFile: f.changed_file,
      changedLines: f.changed_lines,
      businessImpact: f.business_impact,
      evidence: f.evidence.map((e) => ({
        file: e.file,
        symbol: e.symbol,
        line: e.line,
        excerpt: e.excerpt,
        kind: e.kind,
      })),
      confidence: f.confidence,
      testCoverage: f.test_coverage,
      recommendedAction: f.recommended_action,
    })),
    affectedBehaviorRuleIds: wire.affected_behavior_rule_ids,
  };
}
