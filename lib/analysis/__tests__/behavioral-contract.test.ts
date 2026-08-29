import { it, expect } from "vitest";
import {
  BehavioralContractSchema,
  BehavioralEvidenceSchema,
  ConfidenceLevelSchema,
  TestCoverageStatusSchema,
  confidenceLabel,
} from "@/lib/analysis/types";
import {
  parseContract,
  ContractValidationError,
  BehavioralContractWireSchema,
  fromWireFormat,
} from "@/lib/analysis/parser";
import fixtureJson from "@/lib/analysis/fixtures/meridian-sample-contract.json";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function validEvidence() {
  return {
    file: "src/Main.java",
    kind: "source" as const,
  };
}

function validRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "BR-01",
    title: "Some rule",
    description: "A description",
    businessContext: "Business context",
    invariant: "An invariant",
    evidence: [validEvidence()],
    confidence: 0.9,
    testCoverage: "covered" as const,
    relatedSymbols: [],
    downstreamDependencies: [],
    riskIfChanged: "High risk",
    ...overrides,
  };
}

function validContract(overrides: Record<string, unknown> = {}) {
  return {
    analysisId: "test-001",
    generatedAt: "2025-08-29T00:00:00Z",
    sourceFixture: "demo/legacy-billing/src",
    rules: [validRule()],
    ...overrides,
  };
}

function validWireRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "BR-01",
    title: "Some rule",
    description: "A description",
    business_context: "Business context",
    invariant: "An invariant",
    evidence: [validEvidence()],
    confidence: 0.9,
    test_coverage: "covered" as const,
    related_symbols: [],
    downstream_dependencies: [],
    risk_if_changed: "High risk",
    ...overrides,
  };
}

function validWireContract(overrides: Record<string, unknown> = {}) {
  return {
    analysis_id: "test-001",
    generated_at: "2025-08-29T00:00:00Z",
    source_fixture: "demo/legacy-billing/src",
    rules: [validWireRule()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TEST-001: Valid contract passes (boundary confidence 0.0 and 1.0) + confidenceLabel
// ---------------------------------------------------------------------------
it("TEST-001: valid contract passes safeParse and confidenceLabel thresholds are correct", () => {
  expect(BehavioralContractSchema.safeParse(validContract()).success).toBe(true);
  expect(BehavioralContractSchema.safeParse(
    validContract({ rules: [validRule({ confidence: 0.0 })] })
  ).success).toBe(true);
  expect(BehavioralContractSchema.safeParse(
    validContract({ rules: [validRule({ confidence: 1.0 })] })
  ).success).toBe(true);
  // AC-012: confidenceLabel thresholds
  expect(confidenceLabel(0.85)).toBe("high");
  expect(confidenceLabel(0.65)).toBe("medium");
  expect(confidenceLabel(0.40)).toBe("low");
});

// ---------------------------------------------------------------------------
// TEST-002: Empty evidence array fails
// ---------------------------------------------------------------------------
it("TEST-002: empty evidence array fails safeParse", () => {
  const result = BehavioralContractSchema.safeParse(
    validContract({ rules: [validRule({ evidence: [] })] })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-003: confidence > 1.0 fails
// ---------------------------------------------------------------------------
it("TEST-003: confidence 1.1 fails safeParse", () => {
  const result = BehavioralContractSchema.safeParse(
    validContract({ rules: [validRule({ confidence: 1.1 })] })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-004: confidence < 0.0 fails
// ---------------------------------------------------------------------------
it("TEST-004: confidence -0.1 fails safeParse", () => {
  const result = BehavioralContractSchema.safeParse(
    validContract({ rules: [validRule({ confidence: -0.1 })] })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-005: Missing rules array fails
// ---------------------------------------------------------------------------
it("TEST-005: missing rules array fails safeParse", () => {
  const { rules: _rules, ...noRules } = validContract();
  const result = BehavioralContractSchema.safeParse(noRules);
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-006: Rule missing id fails
// ---------------------------------------------------------------------------
it("TEST-006: rule missing id fails safeParse", () => {
  const { id: _id, ...noId } = validRule();
  const result = BehavioralContractSchema.safeParse(
    validContract({ rules: [noId] })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-007: Rule missing title fails
// ---------------------------------------------------------------------------
it("TEST-007: rule missing title fails safeParse", () => {
  const { title: _title, ...noTitle } = validRule();
  const result = BehavioralContractSchema.safeParse(
    validContract({ rules: [noTitle] })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-008: Evidence missing file fails
// ---------------------------------------------------------------------------
it("TEST-008: evidence missing file fails safeParse", () => {
  const { file: _file, ...noFile } = validEvidence();
  const result = BehavioralContractSchema.safeParse(
    validContract({ rules: [validRule({ evidence: [noFile] })] })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-009: Invalid ConfidenceLevel string fails
// ---------------------------------------------------------------------------
it("TEST-009: invalid ConfidenceLevel string 'very-high' fails safeParse", () => {
  const result = ConfidenceLevelSchema.safeParse("very-high");
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-010: Invalid TestCoverageStatus string fails
// ---------------------------------------------------------------------------
it("TEST-010: invalid TestCoverageStatus string 'fully-covered' fails safeParse", () => {
  const result = TestCoverageStatusSchema.safeParse("fully-covered");
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-011: meridian-sample-contract.json fixture passes BehavioralContractWireSchema
// ---------------------------------------------------------------------------
it("TEST-011: meridian-sample-contract.json passes BehavioralContractWireSchema.safeParse", () => {
  const result = BehavioralContractWireSchema.safeParse(fixtureJson);
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-012: parseContract throws ContractValidationError on empty object
// ---------------------------------------------------------------------------
it("TEST-012: parseContract throws ContractValidationError for empty object", () => {
  expect(() => parseContract({})).toThrowError(ContractValidationError);
});

// ---------------------------------------------------------------------------
// TEST-013: parseContract returns typed BehavioralContract for valid input
// ---------------------------------------------------------------------------
it("TEST-013: parseContract returns BehavioralContract for valid camelCase input", () => {
  const contract = parseContract(validContract());
  expect(contract.analysisId).toBe("test-001");
  expect(contract.rules).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// TEST-014: fromWireFormat maps snake_case to camelCase
// ---------------------------------------------------------------------------
it("TEST-014: fromWireFormat maps snake_case wire object to camelCase BehavioralContract", () => {
  const wire = BehavioralContractWireSchema.parse(validWireContract());
  const contract = fromWireFormat(wire);
  expect(contract.analysisId).toBe("test-001");
  expect(contract.sourceFixture).toBe("demo/legacy-billing/src");
  expect(contract.rules[0].businessContext).toBe("Business context");
  expect(contract.rules[0].testCoverage).toBe("covered");
  expect(contract.rules[0].relatedSymbols).toEqual([]);
  expect(contract.rules[0].downstreamDependencies).toEqual([]);
  expect(contract.rules[0].riskIfChanged).toBe("High risk");
});

// ---------------------------------------------------------------------------
// TEST-015: Valid snake_case wire object passes BehavioralContractWireSchema
// ---------------------------------------------------------------------------
it("TEST-015: valid snake_case wire object passes BehavioralContractWireSchema.safeParse", () => {
  const result = BehavioralContractWireSchema.safeParse(validWireContract());
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-016: Evidence with valid line tuple [10, 25] passes
// ---------------------------------------------------------------------------
it("TEST-016: evidence with line [10, 25] passes BehavioralEvidenceSchema.safeParse", () => {
  const result = BehavioralEvidenceSchema.safeParse({
    file: "Foo.java",
    kind: "source",
    line: [10, 25],
  });
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-017: Evidence with line 0 (invalid 1-based) fails
// ---------------------------------------------------------------------------
it("TEST-017: evidence with line 0 fails BehavioralEvidenceSchema.safeParse", () => {
  const result = BehavioralEvidenceSchema.safeParse({
    file: "Foo.java",
    kind: "source",
    line: 0,
  });
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-018: Evidence missing kind fails
// ---------------------------------------------------------------------------
it("TEST-018: evidence missing kind fails BehavioralEvidenceSchema.safeParse", () => {
  const result = BehavioralEvidenceSchema.safeParse({ file: "Foo.java" });
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-019: Contract with invalid ISO 8601 generatedAt fails
// ---------------------------------------------------------------------------
it("TEST-019: contract with generatedAt 'not-a-date' fails BehavioralContractSchema.safeParse", () => {
  const result = BehavioralContractSchema.safeParse(
    validContract({ generatedAt: "not-a-date" })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-020: Evidence with line [25, 10] (end < start) fails
// ---------------------------------------------------------------------------
it("TEST-020: evidence with line [25, 10] (end < start) fails BehavioralEvidenceSchema.safeParse", () => {
  const result = BehavioralEvidenceSchema.safeParse({
    file: "Foo.java",
    kind: "source",
    line: [25, 10],
  });
  expect(result.success).toBe(false);
});
