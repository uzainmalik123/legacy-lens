import { z } from "zod";

// ---------------------------------------------------------------------------
// AnalysisStage — pipeline stage literals (PRD §21)
// Note: "idle" is an AnalysisStatus, not a pipeline stage.
// ---------------------------------------------------------------------------

export const AnalysisStageSchema = z.enum([
  "preparing",
  "investigating",
  "extracting_intent",
  "analyzing_tests",
  "mapping_impact",
  "reviewing_change",
  "validating_evidence",
  "generating_tests",
  "complete",
  "failed",
]);
export type AnalysisStage = z.infer<typeof AnalysisStageSchema>;

// ---------------------------------------------------------------------------
// AnalysisStatus — coarse run status
// ---------------------------------------------------------------------------

export const AnalysisStatusSchema = z.enum([
  "idle",
  "running",
  "complete",
  "failed",
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

// ---------------------------------------------------------------------------
// AnalysisMetadata — analysis run state and metrics (PRD §FR-014, §20.3)
// ---------------------------------------------------------------------------

export const AnalysisMetadataSchema = z.object({
  analysisId: z.string(),
  repository: z.string(),
  baseRevision: z.string(),
  targetRevision: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().int().min(0).optional(),
  status: AnalysisStatusSchema,
  currentStage: AnalysisStageSchema.optional(),
  filesInspected: z.number().int().min(0),
  functionsTraced: z.number().int().min(0),
  behaviorRulesDiscovered: z.number().int().min(0),
  affectedBehaviorRules: z.number().int().min(0),
  untestedAffectedRules: z.number().int().min(0),
  highRiskFindings: z.number().int().min(0),
  generatedTests: z.number().int().min(0),
});
export type AnalysisMetadata = z.infer<typeof AnalysisMetadataSchema>;

// ---------------------------------------------------------------------------
// AnalysisMetadataWireSchema — snake_case wire format (PRD §20.3)
// Uses .passthrough() for forward compatibility and _fixture_note support.
// ---------------------------------------------------------------------------

export const AnalysisMetadataWireSchema = z
  .object({
    analysis_id: z.string(),
    repository: z.string(),
    base_revision: z.string(),
    target_revision: z.string(),
    started_at: z.string().datetime(),
    completed_at: z.string().datetime().optional(),
    duration_ms: z.number().int().min(0).optional(),
    status: AnalysisStatusSchema,
    current_stage: AnalysisStageSchema.optional(),
    files_inspected: z.number().int().min(0),
    functions_traced: z.number().int().min(0),
    behavior_rules_discovered: z.number().int().min(0),
    affected_behavior_rules: z.number().int().min(0),
    untested_affected_rules: z.number().int().min(0),
    high_risk_findings: z.number().int().min(0),
    generated_tests: z.number().int().min(0),
  })
  .passthrough();

export type AnalysisMetadataWire = z.infer<typeof AnalysisMetadataWireSchema>;

// ---------------------------------------------------------------------------
// metadataFromWireFormat — maps snake_case wire to camelCase AnalysisMetadata
// SEC-001: caller must parse through AnalysisMetadataWireSchema before calling this.
// ---------------------------------------------------------------------------

export function metadataFromWireFormat(
  wire: AnalysisMetadataWire
): AnalysisMetadata {
  return {
    analysisId: wire.analysis_id,
    repository: wire.repository,
    baseRevision: wire.base_revision,
    targetRevision: wire.target_revision,
    startedAt: wire.started_at,
    completedAt: wire.completed_at,
    durationMs: wire.duration_ms,
    status: wire.status,
    currentStage: wire.current_stage,
    filesInspected: wire.files_inspected,
    functionsTraced: wire.functions_traced,
    behaviorRulesDiscovered: wire.behavior_rules_discovered,
    affectedBehaviorRules: wire.affected_behavior_rules,
    untestedAffectedRules: wire.untested_affected_rules,
    highRiskFindings: wire.high_risk_findings,
    generatedTests: wire.generated_tests,
  };
}
