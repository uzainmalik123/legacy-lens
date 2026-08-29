// ---------------------------------------------------------------------------
// lib/analysis/__tests__/bundle.test.ts
// Tests for AnalysisBundleWireSchema.
// TEST-607 through TEST-610, TEST-619 per contract.
// ---------------------------------------------------------------------------

import { it, expect, describe } from "vitest";
import { AnalysisBundleWireSchema } from "@/lib/analysis/bundle";

// ---------------------------------------------------------------------------
// Helpers — minimal valid sub-objects
// ---------------------------------------------------------------------------

function validEvidence() {
  return {
    file: "demo/legacy-billing/src/main/java/com/meridian/billing/util/MoneyUtils.java",
    kind: "source" as const,
  };
}

function validRule() {
  return {
    id: "BR-01",
    title: "Late-fee rounding",
    description: "Rounds late fees using DOWN",
    business_context: "Customer billing",
    invariant: "roundLateFee always uses DOWN",
    evidence: [validEvidence()],
    confidence: 0.9,
    test_coverage: "uncovered" as const,
    related_symbols: ["MoneyUtils.roundLateFee"],
    downstream_dependencies: ["LateFeeService.calculateLateFee"],
    risk_if_changed: "Customers overcharged",
  };
}

function validContract() {
  return {
    analysis_id: "test-001",
    generated_at: "2026-08-29T00:00:00Z",
    source_fixture: "demo/legacy-billing",
    rules: [validRule()],
  };
}

function validFinding() {
  return {
    id: "F-001",
    severity: "high" as const,
    title: "Rounding changed",
    summary: "A summary",
    behavior_rule_ids: ["BR-01"],
    business_impact: "Customers overcharged",
    evidence: [],
    confidence: 0.9,
    test_coverage: "uncovered" as const,
    recommended_action: "Reject",
  };
}

function validReview() {
  return {
    analysis_id: "test-001",
    overall_risk: "high" as const,
    findings: [validFinding()],
    affected_behavior_rule_ids: ["BR-01"],
  };
}

function validMetadata() {
  return {
    analysis_id: "test-001",
    repository: "demo/legacy-billing",
    base_revision: "main",
    target_revision: "proposed-change",
    started_at: "2026-08-29T00:00:00Z",
    status: "complete" as const,
    files_inspected: 14,
    functions_traced: 23,
    behavior_rules_discovered: 6,
    affected_behavior_rules: 1,
    untested_affected_rules: 1,
    high_risk_findings: 1,
    generated_tests: 1,
  };
}

function validIntent() {
  return {
    analysis_id: "test-001",
    target_symbol: "MoneyUtils.roundLateFee",
    target_file: "demo/legacy-billing/src/main/java/com/meridian/billing/util/MoneyUtils.java",
    business_role: "Rounds late fees",
    summary: "Computes rounded late fee",
    invariants: ["always DOWN"],
    related_behavior_rule_ids: ["BR-01"],
    dependencies: [],
    evidence: [],
    confidence: 0.9,
  };
}

function validGuardrailTest() {
  return {
    id: "GT-001",
    behavior_rule_id: "BR-01",
    analysis_id: "test-001",
    filename: "LateFeeRoundingTest.java",
    framework: "JUnit 5",
    language: "Java",
    code: "class Foo {}",
    rationale: "captures rounding behavior",
    status: "generated" as const,
    protected_behavior: "DOWN rounding",
    boundary_scenario: {
      balance: "1500.00",
      rate: "0.00823",
      raw_fee: "12.345",
      current_result: "12.34",
      proposed_result: "12.35",
    },
    detection_note: "catches regression",
  };
}

function validBundle(overrides: Record<string, unknown> = {}) {
  return {
    behavioral_contract: validContract(),
    review: validReview(),
    metadata: validMetadata(),
    intent: validIntent(),
    guardrail_test: validGuardrailTest(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// TEST-607
it("TEST-607: safeParse passes for a valid bundle containing all five sub-schemas", () => {
  const result = AnalysisBundleWireSchema.safeParse(validBundle());
  expect(result.success).toBe(true);
});

// TEST-608
it("TEST-608: safeParse fails when review sub-object is missing", () => {
  const { review: _r, ...noReview } = validBundle();
  const result = AnalysisBundleWireSchema.safeParse(noReview);
  expect(result.success).toBe(false);
});

// TEST-609
it("TEST-609: safeParse fails when behavioral_contract has empty rules array", () => {
  const bundle = validBundle({
    behavioral_contract: { ...validContract(), rules: [] },
  });
  const result = AnalysisBundleWireSchema.safeParse(bundle);
  expect(result.success).toBe(false);
});

// TEST-610
it("TEST-610: safeParse passes when guardrail_test is null", () => {
  const result = AnalysisBundleWireSchema.safeParse(
    validBundle({ guardrail_test: null })
  );
  expect(result.success).toBe(true);
});

// TEST-619
it("TEST-619: safeParse passes when blast_radius is absent from the bundle", () => {
  // blast_radius is optional — its absence should not fail validation
  const bundle = validBundle();
  const result = AnalysisBundleWireSchema.safeParse(bundle);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.blast_radius).toBeUndefined();
  }
});

describe("AnalysisBundleWireSchema additional validation", () => {
  it("safeParse fails when behavioral_contract is missing", () => {
    const { behavioral_contract: _bc, ...noContract } = validBundle();
    expect(AnalysisBundleWireSchema.safeParse(noContract).success).toBe(false);
  });

  it("safeParse fails when intent is missing", () => {
    const { intent: _i, ...noIntent } = validBundle();
    expect(AnalysisBundleWireSchema.safeParse(noIntent).success).toBe(false);
  });

  it("safeParse fails when metadata is missing", () => {
    const { metadata: _m, ...noMeta } = validBundle();
    expect(AnalysisBundleWireSchema.safeParse(noMeta).success).toBe(false);
  });

  it("safeParse fails when guardrail_test key is entirely absent (field is required, not optional)", () => {
    const { guardrail_test: _gt, ...noGt } = validBundle();
    // guardrail_test is required (nullable, not optional)
    expect(AnalysisBundleWireSchema.safeParse(noGt).success).toBe(false);
  });
});
