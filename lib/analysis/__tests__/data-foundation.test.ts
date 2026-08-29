import { it, expect } from "vitest";
import {
  SeveritySchema,
  ReviewFindingSchema,
  ReviewReportSchema,
  ReviewReportWireSchema,
  reviewFromWireFormat,
} from "@/lib/analysis/review";
import {
  RevealIntentSchema,
  RevealIntentWireSchema,
  intentFromWireFormat,
} from "@/lib/analysis/intent";
import {
  BlastRadiusEdgeSchema,
  BlastRadiusResultSchema,
  BlastRadiusResultWireSchema,
  blastRadiusFromWireFormat,
} from "@/lib/analysis/blast-radius";
import {
  AnalysisStageSchema,
  AnalysisMetadataSchema,
  AnalysisMetadataWireSchema,
  metadataFromWireFormat,
} from "@/lib/analysis/metadata";
import reviewFixture from "@/lib/analysis/fixtures/meridian-sample-review.json";
import intentFixture from "@/lib/analysis/fixtures/meridian-sample-intent.json";
import blastRadiusFixture from "@/lib/analysis/fixtures/meridian-sample-blast-radius.json";
import metadataFixture from "@/lib/analysis/fixtures/meridian-sample-metadata.json";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function validFinding(overrides: Record<string, unknown> = {}) {
  return {
    id: "F-001",
    severity: "high" as const,
    title: "Some finding",
    summary: "A summary",
    behaviorRuleIds: ["BR-01"],
    businessImpact: "Some impact",
    evidence: [],
    confidence: 0.9,
    testCoverage: "uncovered" as const,
    recommendedAction: "Do something",
    ...overrides,
  };
}

function validReviewReport(overrides: Record<string, unknown> = {}) {
  return {
    analysisId: "test-001",
    overallRisk: "high" as const,
    findings: [validFinding()],
    affectedBehaviorRuleIds: ["BR-01"],
    ...overrides,
  };
}

function validWireFinding(overrides: Record<string, unknown> = {}) {
  return {
    id: "F-001",
    severity: "high" as const,
    title: "Some finding",
    summary: "A summary",
    behavior_rule_ids: ["BR-01"],
    business_impact: "Some impact",
    evidence: [],
    confidence: 0.9,
    test_coverage: "uncovered" as const,
    recommended_action: "Do something",
    ...overrides,
  };
}

function validWireReviewReport(overrides: Record<string, unknown> = {}) {
  return {
    analysis_id: "test-001",
    overall_risk: "high" as const,
    findings: [validWireFinding()],
    affected_behavior_rule_ids: ["BR-01"],
    ...overrides,
  };
}

function validIntent(overrides: Record<string, unknown> = {}) {
  return {
    analysisId: "test-001",
    targetSymbol: "Foo.bar",
    targetFile: "src/Foo.java",
    businessRole: "Does something important",
    summary: "A summary of intent",
    invariants: ["Invariant A"],
    relatedBehaviorRuleIds: ["BR-01"],
    dependencies: ["com.example.Dep"],
    evidence: [],
    confidence: 0.8,
    ...overrides,
  };
}

function validWireIntent(overrides: Record<string, unknown> = {}) {
  return {
    analysis_id: "test-001",
    target_symbol: "Foo.bar",
    target_file: "src/Foo.java",
    business_role: "Does something important",
    summary: "A summary of intent",
    invariants: ["Invariant A"],
    related_behavior_rule_ids: ["BR-01"],
    dependencies: ["com.example.Dep"],
    evidence: [],
    confidence: 0.8,
    ...overrides,
  };
}

function validNode(id: string, overrides: Record<string, unknown> = {}) {
  return { id, label: `Node ${id}`, kind: "function" as const, ...overrides };
}

function validEdge(
  source: string,
  target: string,
  relationship: "calls" | "implements" | "tested_by" | "affects_rule" | "downstream_of" = "calls"
) {
  return { source, target, relationship };
}

function validBlastRadius(overrides: Record<string, unknown> = {}) {
  return {
    analysisId: "test-001",
    rootChange: "Foo.bar",
    nodes: [validNode("n1"), validNode("n2")],
    edges: [validEdge("n1", "n2")],
    affectedBehaviorRuleIds: ["BR-01"],
    ...overrides,
  };
}

function validWireBlastRadius(overrides: Record<string, unknown> = {}) {
  return {
    analysis_id: "test-001",
    root_change: "Foo.bar",
    nodes: [validNode("n1"), validNode("n2")],
    edges: [validEdge("n1", "n2")],
    affected_behavior_rule_ids: ["BR-01"],
    ...overrides,
  };
}

function validMetadata(overrides: Record<string, unknown> = {}) {
  return {
    analysisId: "test-001",
    repository: "demo/legacy-billing",
    baseRevision: "main",
    targetRevision: "proposed-change",
    startedAt: "2026-08-29T00:00:00Z",
    status: "complete" as const,
    filesInspected: 14,
    functionsTraced: 23,
    behaviorRulesDiscovered: 6,
    affectedBehaviorRules: 1,
    untestedAffectedRules: 1,
    highRiskFindings: 1,
    generatedTests: 1,
    ...overrides,
  };
}

function validWireMetadata(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TEST-101: Valid ReviewReport passes safeParse
// ---------------------------------------------------------------------------
it("TEST-101: valid ReviewReport passes ReviewReportSchema.safeParse", () => {
  expect(ReviewReportSchema.safeParse(validReviewReport()).success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-102: ReviewFinding with invalid severity fails
// ---------------------------------------------------------------------------
it("TEST-102: ReviewFinding with severity 'urgent' fails safeParse", () => {
  const result = ReviewFindingSchema.safeParse(
    validFinding({ severity: "urgent" })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-103: ReviewReport missing findings array fails
// ---------------------------------------------------------------------------
it("TEST-103: ReviewReport missing findings fails safeParse", () => {
  const { findings: _findings, ...noFindings } = validReviewReport();
  expect(ReviewReportSchema.safeParse(noFindings).success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-104: ReviewReport missing analysisId fails
// ---------------------------------------------------------------------------
it("TEST-104: ReviewReport missing analysisId fails safeParse", () => {
  const { analysisId: _id, ...noId } = validReviewReport();
  expect(ReviewReportSchema.safeParse(noId).success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-105: reviewFromWireFormat maps snake_case -> camelCase
// ---------------------------------------------------------------------------
it("TEST-105: reviewFromWireFormat maps snake_case to camelCase correctly", () => {
  const wire = ReviewReportWireSchema.parse(validWireReviewReport());
  const report = reviewFromWireFormat(wire);
  expect(report.analysisId).toBe("test-001");
  expect(report.overallRisk).toBe("high");
  expect(report.affectedBehaviorRuleIds).toEqual(["BR-01"]);
  expect(report.findings[0].behaviorRuleIds).toEqual(["BR-01"]);
  expect(report.findings[0].businessImpact).toBe("Some impact");
  expect(report.findings[0].testCoverage).toBe("uncovered");
  expect(report.findings[0].recommendedAction).toBe("Do something");
});

// ---------------------------------------------------------------------------
// TEST-106: Valid snake_case wire review passes ReviewReportWireSchema
// ---------------------------------------------------------------------------
it("TEST-106: valid wire review object passes ReviewReportWireSchema.safeParse", () => {
  expect(ReviewReportWireSchema.safeParse(validWireReviewReport()).success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-107: meridian-sample-review.json passes ReviewReportWireSchema
// ---------------------------------------------------------------------------
it("TEST-107: meridian-sample-review.json passes ReviewReportWireSchema.safeParse", () => {
  const result = ReviewReportWireSchema.safeParse(reviewFixture);
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-108: Valid RevealIntent passes safeParse
// ---------------------------------------------------------------------------
it("TEST-108: valid RevealIntent passes RevealIntentSchema.safeParse", () => {
  expect(RevealIntentSchema.safeParse(validIntent()).success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-109: RevealIntent missing targetSymbol fails
// ---------------------------------------------------------------------------
it("TEST-109: RevealIntent missing targetSymbol fails safeParse", () => {
  const { targetSymbol: _ts, ...noSymbol } = validIntent();
  expect(RevealIntentSchema.safeParse(noSymbol).success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-110: intentFromWireFormat maps snake_case -> camelCase
// ---------------------------------------------------------------------------
it("TEST-110: intentFromWireFormat maps snake_case to camelCase correctly", () => {
  const wire = RevealIntentWireSchema.parse(validWireIntent());
  const intent = intentFromWireFormat(wire);
  expect(intent.analysisId).toBe("test-001");
  expect(intent.targetSymbol).toBe("Foo.bar");
  expect(intent.targetFile).toBe("src/Foo.java");
  expect(intent.businessRole).toBe("Does something important");
  expect(intent.relatedBehaviorRuleIds).toEqual(["BR-01"]);
});

// ---------------------------------------------------------------------------
// TEST-111: meridian-sample-intent.json passes RevealIntentWireSchema
// ---------------------------------------------------------------------------
it("TEST-111: meridian-sample-intent.json passes RevealIntentWireSchema.safeParse", () => {
  const result = RevealIntentWireSchema.safeParse(intentFixture);
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-112: Valid BlastRadiusResult passes safeParse
// ---------------------------------------------------------------------------
it("TEST-112: valid BlastRadiusResult passes BlastRadiusResultSchema.safeParse", () => {
  expect(BlastRadiusResultSchema.safeParse(validBlastRadius()).success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-113: BlastRadiusResult missing nodes fails
// ---------------------------------------------------------------------------
it("TEST-113: BlastRadiusResult missing nodes fails safeParse", () => {
  const { nodes: _nodes, ...noNodes } = validBlastRadius();
  expect(BlastRadiusResultSchema.safeParse(noNodes).success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-114: BlastRadiusEdge with invalid relationship fails
// ---------------------------------------------------------------------------
it("TEST-114: BlastRadiusEdge with relationship 'related_to' fails safeParse", () => {
  const result = BlastRadiusEdgeSchema.safeParse({
    source: "n1",
    target: "n2",
    relationship: "related_to",
  });
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-115: blastRadiusFromWireFormat maps snake_case -> camelCase
// ---------------------------------------------------------------------------
it("TEST-115: blastRadiusFromWireFormat maps snake_case to camelCase correctly", () => {
  const wire = BlastRadiusResultWireSchema.parse(validWireBlastRadius());
  const result = blastRadiusFromWireFormat(wire);
  expect(result.analysisId).toBe("test-001");
  expect(result.rootChange).toBe("Foo.bar");
  expect(result.affectedBehaviorRuleIds).toEqual(["BR-01"]);
  expect(result.nodes).toHaveLength(2);
  expect(result.edges[0].relationship).toBe("calls");
});

// ---------------------------------------------------------------------------
// TEST-116: meridian-sample-blast-radius.json passes BlastRadiusResultWireSchema
// ---------------------------------------------------------------------------
it("TEST-116: meridian-sample-blast-radius.json passes BlastRadiusResultWireSchema.safeParse", () => {
  const result = BlastRadiusResultWireSchema.safeParse(blastRadiusFixture);
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-117: Valid AnalysisMetadata passes safeParse
// ---------------------------------------------------------------------------
it("TEST-117: valid AnalysisMetadata passes AnalysisMetadataSchema.safeParse", () => {
  expect(AnalysisMetadataSchema.safeParse(validMetadata()).success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-118: AnalysisMetadata with filesInspected: -1 fails
// ---------------------------------------------------------------------------
it("TEST-118: AnalysisMetadata with filesInspected: -1 fails safeParse", () => {
  const result = AnalysisMetadataSchema.safeParse(
    validMetadata({ filesInspected: -1 })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-119: AnalysisMetadata with status: 'pending' fails
// ---------------------------------------------------------------------------
it("TEST-119: AnalysisMetadata with status 'pending' fails safeParse", () => {
  const result = AnalysisMetadataSchema.safeParse(
    validMetadata({ status: "pending" })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-120: AnalysisMetadata with currentStage: 'scanning' fails
// ---------------------------------------------------------------------------
it("TEST-120: AnalysisMetadata with currentStage 'scanning' fails safeParse", () => {
  const result = AnalysisMetadataSchema.safeParse(
    validMetadata({ currentStage: "scanning" })
  );
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-121: metadataFromWireFormat maps snake_case -> camelCase
// ---------------------------------------------------------------------------
it("TEST-121: metadataFromWireFormat maps snake_case to camelCase correctly", () => {
  const wire = AnalysisMetadataWireSchema.parse(validWireMetadata());
  const metadata = metadataFromWireFormat(wire);
  expect(metadata.analysisId).toBe("test-001");
  expect(metadata.baseRevision).toBe("main");
  expect(metadata.targetRevision).toBe("proposed-change");
  expect(metadata.filesInspected).toBe(14);
  expect(metadata.functionsTraced).toBe(23);
  expect(metadata.behaviorRulesDiscovered).toBe(6);
  expect(metadata.affectedBehaviorRules).toBe(1);
  expect(metadata.untestedAffectedRules).toBe(1);
  expect(metadata.highRiskFindings).toBe(1);
  expect(metadata.generatedTests).toBe(1);
});

// ---------------------------------------------------------------------------
// TEST-122: meridian-sample-metadata.json passes AnalysisMetadataWireSchema
// ---------------------------------------------------------------------------
it("TEST-122: meridian-sample-metadata.json passes AnalysisMetadataWireSchema.safeParse", () => {
  const result = AnalysisMetadataWireSchema.safeParse(metadataFixture);
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-123: SeveritySchema rejects 'urgent'
// ---------------------------------------------------------------------------
it("TEST-123: SeveritySchema.safeParse('urgent') returns success: false", () => {
  expect(SeveritySchema.safeParse("urgent").success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-124: AnalysisStageSchema rejects 'scanning'
// ---------------------------------------------------------------------------
it("TEST-124: AnalysisStageSchema.safeParse('scanning') returns success: false", () => {
  expect(AnalysisStageSchema.safeParse("scanning").success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-125: Blast-radius fixture edges reference only declared node IDs
// ---------------------------------------------------------------------------
it("TEST-125: blast-radius fixture edges all reference declared node IDs", () => {
  const nodeIds = new Set(
    (blastRadiusFixture as { nodes: { id: string }[] }).nodes.map((n) => n.id)
  );
  const edges = (
    blastRadiusFixture as { edges: { source: string; target: string }[] }
  ).edges;
  for (const edge of edges) {
    expect(nodeIds.has(edge.source)).toBe(true);
    expect(nodeIds.has(edge.target)).toBe(true);
  }
});
