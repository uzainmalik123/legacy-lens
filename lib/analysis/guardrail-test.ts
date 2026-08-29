import { z } from "zod";

// ---------------------------------------------------------------------------
// BoundaryScenario — the specific numeric scenario the test exercises
// All values are strings to preserve exact decimal precision without
// floating-point ambiguity in JSON serialization.
// ---------------------------------------------------------------------------

const BoundaryScenarioSchema = z.object({
  balance: z.string(),
  rate: z.string(),
  rawFee: z.string(),
  currentResult: z.string(),
  proposedResult: z.string(),
});
export type BoundaryScenario = z.infer<typeof BoundaryScenarioSchema>;

// ---------------------------------------------------------------------------
// GuardrailTestSchema — camelCase domain model (PRD §FR-011, §19.8)
// ---------------------------------------------------------------------------

export const GuardrailTestSchema = z.object({
  id: z.string(),
  behaviorRuleId: z.string(),
  analysisId: z.string(),
  filename: z.string(),
  framework: z.string(),
  language: z.string(),
  code: z.string(),
  rationale: z.string(),
  // z.literal("generated") — Feature 6 widens to z.enum([...]) when needed
  status: z.literal("generated"),
  protectedBehavior: z.string(),
  boundaryScenario: BoundaryScenarioSchema,
  detectionNote: z.string(),
});
export type GuardrailTest = z.infer<typeof GuardrailTestSchema>;

// ---------------------------------------------------------------------------
// Wire schemas — snake_case wire format matching fixture JSON
// Uses .passthrough() for forward compatibility and _fixture_note support.
// ---------------------------------------------------------------------------

const BoundaryScenarioWireSchema = z
  .object({
    balance: z.string(),
    rate: z.string(),
    raw_fee: z.string(),
    current_result: z.string(),
    proposed_result: z.string(),
  })
  .passthrough();

export const GuardrailTestWireSchema = z
  .object({
    id: z.string(),
    behavior_rule_id: z.string(),
    analysis_id: z.string(),
    filename: z.string(),
    framework: z.string(),
    language: z.string(),
    code: z.string(),
    rationale: z.string(),
    status: z.literal("generated"),
    protected_behavior: z.string(),
    boundary_scenario: BoundaryScenarioWireSchema,
    detection_note: z.string(),
  })
  .passthrough();

export type GuardrailTestWire = z.infer<typeof GuardrailTestWireSchema>;

// ---------------------------------------------------------------------------
// guardrailTestFromWireFormat — maps snake_case wire to camelCase GuardrailTest
// SEC-001: caller must parse through GuardrailTestWireSchema before calling this.
// ---------------------------------------------------------------------------

export function guardrailTestFromWireFormat(wire: GuardrailTestWire): GuardrailTest {
  return {
    id: wire.id,
    behaviorRuleId: wire.behavior_rule_id,
    analysisId: wire.analysis_id,
    filename: wire.filename,
    framework: wire.framework,
    language: wire.language,
    code: wire.code,
    rationale: wire.rationale,
    status: wire.status,
    protectedBehavior: wire.protected_behavior,
    boundaryScenario: {
      balance: wire.boundary_scenario.balance,
      rate: wire.boundary_scenario.rate,
      rawFee: wire.boundary_scenario.raw_fee,
      currentResult: wire.boundary_scenario.current_result,
      proposedResult: wire.boundary_scenario.proposed_result,
    },
    detectionNote: wire.detection_note,
  };
}
