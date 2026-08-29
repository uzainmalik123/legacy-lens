# Plan: feat-data-foundation

**Feature ID:** `feat-data-foundation`  
**Date:** 2026-08-29  
**Status:** Approved

---

## Objective

Complete the remaining canonical data contracts (Review, Intent, Blast Radius, Analysis
Metadata) required by the P0 Legacy Lens product so that subsequent UI and
analysis-pipeline features can depend on stable, validated, snake_case → camelCase typed
data.

---

## Background / PRD Mapping

This feature implements the remainder of **Phase B — Analysis Contract** from PRD §30.
Feature 1 (`feat-behavioral-contract-model`) established the architecture that this
feature replicates exactly. The following PRD sections are directly satisfied:

| PRD Reference | Coverage |
|---|---|
| FR-007 — Risk Finding Generation | `ReviewFinding` / `ReviewReport` types + wire schema |
| FR-004 — Intent Extraction | `RevealIntent` types + wire schema |
| FR-017 — Blast Radius Visualization | `BlastRadius` graph types + wire schema |
| FR-014 — Analysis Metadata | `AnalysisMetadata` types + wire schema |
| §20.2 — Data Contract: `review.json` | Wire schema enforces minimum shape |
| §20.3 — Data Contract: `analysis-metadata.json` | Wire schema enforces minimum shape |
| §21 — State Model | `AnalysisStage` enum values |
| §18 — Risk Model / Severity Guidance | `Severity` enum (critical / high / medium / low / info) |
| §25.1 — Product Unit Tests P0 | Focused unit tests covering all new contracts |

---

## Requirements

### REQ-001 — ReviewFinding domain type
Define `ReviewFinding` with:
- `id` (string, required)
- `severity` (`Severity` enum — `"critical" | "high" | "medium" | "low" | "info"`, required)
- `title` (string, required)
- `summary` (string, required)
- `behaviorRuleIds` (string[], required)
- `changedFile` (string, optional)
- `changedLines` (optional — same `number | [number, number]` tuple type as `BehavioralEvidence.line`)
- `businessImpact` (string, required)
- `evidence` (`BehavioralEvidence[]`, required, min 0 — findings may have empty evidence before
  validation passes; use `z.array(BehavioralEvidenceSchema)`)
- `confidence` (number 0–1, required)
- `testCoverage` (`TestCoverageStatus`, required)
- `recommendedAction` (string, required)

Export `SeveritySchema`, `Severity`, `ReviewFindingSchema`, `ReviewFinding` from
`lib/analysis/review.ts`.

### REQ-002 — ReviewReport domain type
Define `ReviewReport` with:
- `analysisId` (string, required)
- `overallRisk` (`Severity`, required)
- `riskScore` (number, optional — `z.number().int().min(0).max(100)`)
- `findings` (`ReviewFinding[]`, required, min 0)
- `affectedBehaviorRuleIds` (string[], required)

Export `ReviewReportSchema`, `ReviewReport`, and `ReviewReportWire` from
`lib/analysis/review.ts`.

### REQ-003 — ReviewReport wire schema + mapper
Define and export `ReviewReportWireSchema` (snake_case, `.passthrough()`) and
`reviewFromWireFormat(wire: ReviewReportWire): ReviewReport` from
`lib/analysis/review.ts`.

Wire snake_case equivalents:
- `analysis_id`, `overall_risk`, `risk_score`, `affected_behavior_rule_ids`
- Finding fields: `behavior_rule_ids`, `changed_file`, `changed_lines`,
  `business_impact`, `test_coverage`, `recommended_action`

### REQ-004 — RevealIntent domain type
Define `RevealIntent` with:
- `analysisId` (string, required)
- `targetSymbol` (string, required — the function/method being described)
- `targetFile` (string, required)
- `businessRole` (string, required)
- `summary` (string, required)
- `invariants` (string[], required)
- `relatedBehaviorRuleIds` (string[], required)
- `dependencies` (string[], required — symbols this function calls or uses)
- `evidence` (`BehavioralEvidence[]`, required)
- `confidence` (number 0–1, required)

Export `RevealIntentSchema`, `RevealIntent`, and `RevealIntentWire` from
`lib/analysis/intent.ts`.

### REQ-005 — RevealIntent wire schema + mapper
Define and export `RevealIntentWireSchema` (snake_case, `.passthrough()`) and
`intentFromWireFormat(wire: RevealIntentWire): RevealIntent` from
`lib/analysis/intent.ts`.

Wire snake_case equivalents:
- `analysis_id`, `target_symbol`, `target_file`, `business_role`,
  `related_behavior_rule_ids`

### REQ-006 — BlastRadiusNode domain type
Define `BlastRadiusNodeKind` as `"changed_symbol" | "behavior_rule" | "function" | "service" | "test"`.

Define `BlastRadiusNode` with:
- `id` (string, required)
- `label` (string, required)
- `kind` (`BlastRadiusNodeKind`, required)
- `file` (string, optional)
- `symbol` (string, optional)

Export `BlastRadiusNodeKindSchema`, `BlastRadiusNodeKind`, `BlastRadiusNodeSchema`,
`BlastRadiusNode` from `lib/analysis/blast-radius.ts`. (Wire type exported in REQ-008.)

### REQ-007 — BlastRadiusEdge domain type
Define `BlastRadiusRelationship` as
`"calls" | "implements" | "tested_by" | "affects_rule" | "downstream_of"`.

Define `BlastRadiusEdge` with:
- `source` (string — node id, required)
- `target` (string — node id, required)
- `relationship` (`BlastRadiusRelationship`, required)

Export `BlastRadiusRelationshipSchema`, `BlastRadiusRelationship`,
`BlastRadiusEdgeSchema`, `BlastRadiusEdge` from `lib/analysis/blast-radius.ts`.

### REQ-008 — BlastRadiusResult domain type + wire schema + mapper
Define `BlastRadiusResult` with:
- `analysisId` (string, required)
- `rootChange` (string, required — the changed symbol or file that is the root)
- `nodes` (`BlastRadiusNode[]`, required, min 1)
- `edges` (`BlastRadiusEdge[]`, required, min 0)
- `affectedBehaviorRuleIds` (string[], required)

Define and export `BlastRadiusResultWireSchema` (snake_case, `.passthrough()`) and
`blastRadiusFromWireFormat(wire: BlastRadiusResultWire): BlastRadiusResult` from
`lib/analysis/blast-radius.ts`.

Wire snake_case equivalents:
- `analysis_id`, `root_change`, `affected_behavior_rule_ids`
- Node fields: `kind` (same string literal), `file`, `symbol`
- Edge fields: `source`, `target`, `relationship` (same string literals)

Export `BlastRadiusResultSchema`, `BlastRadiusResult`, and `BlastRadiusResultWire` from
`lib/analysis/blast-radius.ts`.

### REQ-009 — AnalysisStage and AnalysisStatus enums
Define `AnalysisStage` as:
`"preparing" | "investigating" | "extracting_intent" | "analyzing_tests" |
"mapping_impact" | "reviewing_change" | "validating_evidence" | "generating_tests" |
"complete" | "failed"`

Define `AnalysisStatus` as: `"idle" | "running" | "complete" | "failed"`

Export `AnalysisStageSchema`, `AnalysisStage`, `AnalysisStatusSchema`, `AnalysisStatus`
from `lib/analysis/metadata.ts`.

### REQ-010 — AnalysisMetadata domain type
Define `AnalysisMetadata` with:
- `analysisId` (string, required)
- `repository` (string, required)
- `baseRevision` (string, required)
- `targetRevision` (string, required)
- `startedAt` (`z.string().datetime()`, required)
- `completedAt` (`z.string().datetime()`, optional)
- `durationMs` (`z.number().int().min(0)`, optional)
- `status` (`AnalysisStatus`, required)
- `currentStage` (`AnalysisStage`, optional)
- `filesInspected` (`z.number().int().min(0)`, required)
- `functionsTraced` (`z.number().int().min(0)`, required)
- `behaviorRulesDiscovered` (`z.number().int().min(0)`, required)
- `affectedBehaviorRules` (`z.number().int().min(0)`, required)
- `untestedAffectedRules` (`z.number().int().min(0)`, required)
- `highRiskFindings` (`z.number().int().min(0)`, required)
- `generatedTests` (`z.number().int().min(0)`, required)

Export `AnalysisMetadataSchema`, `AnalysisMetadata`, and `AnalysisMetadataWire` from
`lib/analysis/metadata.ts`.

### REQ-011 — AnalysisMetadata wire schema + mapper
Define and export `AnalysisMetadataWireSchema` (snake_case, `.passthrough()`) and
`metadataFromWireFormat(wire: AnalysisMetadataWire): AnalysisMetadata` from
`lib/analysis/metadata.ts`.

Wire snake_case equivalents:
- `analysis_id`, `base_revision`, `target_revision`, `started_at`, `completed_at`,
  `duration_ms`, `current_stage`, `files_inspected`, `functions_traced`,
  `behavior_rules_discovered`, `affected_behavior_rules`, `untested_affected_rules`,
  `high_risk_findings`, `generated_tests`

### REQ-012 — No runtime dependencies
No new runtime production dependencies. Zod 4.4.3 and vitest are already installed.
No other dependency may be added.

### REQ-013 — Frozen fixture must not be touched
The paths under `demo/legacy-billing/**` must not be modified.

### REQ-014 — Meridian review fixture
Produce `lib/analysis/fixtures/meridian-sample-review.json` — a development-only
snake_case fixture representing a `ReviewReport` for the Meridian scenario. Must:
- include `"_fixture_note"` key matching the Feature 1 convention
- reference `BR-01` as the primary affected behavior rule
- contain exactly one finding with id `F-001`, severity `"high"`,
  referencing the rounding change in `MoneyUtils.java`
- pass `ReviewReportWireSchema.safeParse()` in tests
- `analysis_id` must match `meridian-sample-contract.json`'s `analysis_id`

### REQ-015 — Meridian intent fixture
Produce `lib/analysis/fixtures/meridian-sample-intent.json` — a development-only
snake_case fixture for `RevealIntent` targeting `LateFeeService.calculateLateFee`.
Must:
- include `"_fixture_note"` key
- reference `BR-01` in `related_behavior_rule_ids`
- pass `RevealIntentWireSchema.safeParse()` in tests

### REQ-016 — Meridian blast-radius fixture
Produce `lib/analysis/fixtures/meridian-sample-blast-radius.json` — a development-only
snake_case fixture for `BlastRadiusResult` rooted at `MoneyUtils.roundLateFee`. Must:
- include `"_fixture_note"` key
- contain at least 4 nodes and at least 3 edges
- reference `BR-01` in `affected_behavior_rule_ids`
- pass `BlastRadiusResultWireSchema.safeParse()` in tests

### REQ-017 — Meridian metadata fixture
Produce `lib/analysis/fixtures/meridian-sample-metadata.json` — a development-only
snake_case fixture for `AnalysisMetadata`. Must:
- include `"_fixture_note"` key
- status `"complete"`, stage `"complete"`
- `analysis_id` matches the other Meridian fixtures
- pass `AnalysisMetadataWireSchema.safeParse()` in tests

### REQ-018 — Unit tests
Write unit tests in `lib/analysis/__tests__/data-foundation.test.ts` covering:
- TEST-101 — valid `ReviewReport` passes `ReviewReportSchema.safeParse()`
- TEST-102 — `ReviewFinding` with invalid severity fails
- TEST-103 — `ReviewReport` missing `findings` array fails
- TEST-104 — `ReviewReport` missing `analysisId` fails
- TEST-105 — `reviewFromWireFormat()` maps snake_case → camelCase correctly
- TEST-106 — valid wire-format review passes `ReviewReportWireSchema.safeParse()`
- TEST-107 — `meridian-sample-review.json` passes `ReviewReportWireSchema.safeParse()`
- TEST-108 — valid `RevealIntent` passes `RevealIntentSchema.safeParse()`
- TEST-109 — `RevealIntent` missing `targetSymbol` fails
- TEST-110 — `intentFromWireFormat()` maps snake_case → camelCase correctly
- TEST-111 — `meridian-sample-intent.json` passes `RevealIntentWireSchema.safeParse()`
- TEST-112 — valid `BlastRadiusResult` passes `BlastRadiusResultSchema.safeParse()`
- TEST-113 — `BlastRadiusResult` missing `nodes` fails
- TEST-114 — `BlastRadiusEdge` with invalid `relationship` fails
- TEST-115 — `blastRadiusFromWireFormat()` maps snake_case → camelCase correctly
- TEST-116 — `meridian-sample-blast-radius.json` passes `BlastRadiusResultWireSchema.safeParse()`
- TEST-117 — valid `AnalysisMetadata` passes `AnalysisMetadataSchema.safeParse()`
- TEST-118 — `AnalysisMetadata` with negative `filesInspected` fails
- TEST-119 — `AnalysisMetadata` with invalid `status` fails
- TEST-120 — `AnalysisMetadata` with invalid `currentStage` fails
- TEST-121 — `metadataFromWireFormat()` maps snake_case → camelCase correctly
- TEST-122 — `meridian-sample-metadata.json` passes `AnalysisMetadataWireSchema.safeParse()`
- TEST-123 — `SeveritySchema` rejects invalid value `"urgent"`
- TEST-124 — `AnalysisStageSchema` rejects invalid value `"scanning"`
- TEST-125 — blast-radius fixture edges reference only declared node IDs

---

## Non-Requirements (Explicit Exclusions)

- No UI components, pages, or Next.js routes.
- No API routes.
- No database persistence.
- No analysis pipeline, diff parsing, or Java source parsing.
- No git integration.
- No authentication.
- No risk scoring engine implementation.
- No graph library.
- No generated guardrail test types (separate feature).
- Fixtures are **development fixture data only** — not analysis agent output.
- Do not modify or extend `lib/analysis/types.ts` or `lib/analysis/parser.ts` beyond
  what is needed to reuse existing exported types.
- Do not re-implement `BehavioralEvidence`, `ConfidenceLevel`, `TestCoverageStatus` —
  import from `lib/analysis/types.ts`.
- No schema version fields (deferred).
- No `riskScore` calculation logic (just the schema field accepting a value).
- No `lib/analysis/index.ts` barrel file (not requested; adds scope).

---

## Affected Files

### Created (new files)

| File | Purpose |
|---|---|
| `lib/analysis/review.ts` | `Severity`, `ReviewFinding`, `ReviewReport`, wire schema, `reviewFromWireFormat()` |
| `lib/analysis/intent.ts` | `RevealIntent`, wire schema, `intentFromWireFormat()` |
| `lib/analysis/blast-radius.ts` | `BlastRadiusNode`, `BlastRadiusEdge`, `BlastRadiusResult`, wire schema, `blastRadiusFromWireFormat()` |
| `lib/analysis/metadata.ts` | `AnalysisStage`, `AnalysisStatus`, `AnalysisMetadata`, wire schema, `metadataFromWireFormat()` |
| `lib/analysis/fixtures/meridian-sample-review.json` | Dev fixture: ReviewReport for Meridian scenario |
| `lib/analysis/fixtures/meridian-sample-intent.json` | Dev fixture: RevealIntent for `LateFeeService.calculateLateFee` |
| `lib/analysis/fixtures/meridian-sample-blast-radius.json` | Dev fixture: BlastRadiusResult rooted at `MoneyUtils.roundLateFee` |
| `lib/analysis/fixtures/meridian-sample-metadata.json` | Dev fixture: AnalysisMetadata for Meridian analysis run |
| `lib/analysis/__tests__/data-foundation.test.ts` | 25 Vitest unit tests TEST-101 through TEST-125 |

### Modified (existing files)

None. `types.ts`, `parser.ts`, and existing test file are untouched.

### Forbidden — must not be touched

```
demo/legacy-billing/src/**
demo/legacy-billing/pom.xml
demo/legacy-billing/proposed-change.patch
demo/legacy-billing/PROPOSED_CHANGE.md
demo/legacy-billing/LEGACY_FIXTURE_SPEC.md
demo/legacy-billing/GROUND_TRUTH.md
demo/legacy-billing/ANALYSIS_SCOPE.md
app/**
lib/analysis/types.ts        (existing — do not modify)
lib/analysis/parser.ts       (existing — do not modify)
lib/analysis/__tests__/behavioral-contract.test.ts  (existing — do not modify)
lib/analysis/fixtures/meridian-sample-contract.json (existing — do not modify)
```

---

## Dependencies Required

No new dependencies. Existing:
- `zod` 4.4.3 — already installed
- `vitest` ^4.1.11 — already installed (Feature 1)
- `typescript` — already installed

---

## Architecture Decisions

### Reuse Feature 1's exact pattern

Every new module follows the same structure:

```
snake_case wire schema (.passthrough())
  → exported WireSchema + Wire type
  → fromWireFormat() mapper
  → camelCase domain type (z.infer<...Schema>)
  → exported Schema + type
```

### Imports from `lib/analysis/types.ts`

`BehavioralEvidenceSchema`, `BehavioralEvidence`, `TestCoverageStatus`,
`TestCoverageStatusSchema`, `ConfidenceLevel`, `confidenceLabel` are imported from
`lib/analysis/types.ts`. They are not re-exported from new modules to avoid
re-declaration confusion.

### `ReviewFinding.evidence` allows empty array

Review findings at early analysis stages may have zero evidence items; the evidence
auditor adds items. Contrast with `BehavioralRule.evidence` (min 1). Both are intentional.

### `BlastRadiusResult.edges` allows empty array

A single-node root may have no outgoing edges. Minimum of 1 node is enforced.

### `riskScore` is optional integer 0–100

PRD §20.2 includes it; PRD §FR-008 notes the exact formula may remain simple. The
schema accepts it but does not validate the computation.

### Analysis stage literals match PRD §21 exactly

`"preparing" | "investigating" | "extracting_intent" | "analyzing_tests" |
"mapping_impact" | "reviewing_change" | "validating_evidence" | "generating_tests" |
"complete" | "failed"` — `"idle"` is NOT included in `AnalysisStage` (it is an
`AnalysisStatus`, not a pipeline stage). The Meridian metadata fixture uses
`status: "complete"` and `current_stage: "complete"`.

### Fixture `analysis_id` consistency

All four Meridian fixtures use `analysis_id: "meridian-sample-20260829"`, matching the
existing `meridian-sample-contract.json`.

### `changedLines` reuses the existing line range type

Rather than duplicating the line-range logic, `ReviewFinding.changedLines` uses the same
`z.union([z.number().int().min(1), ...tuple...])` inline, validated with the same start
≤ end refinement.

---

## Test Requirements

| ID | Type | Description | Req ref |
|---|---|---|---|
| TEST-101 | unit | Valid `ReviewReport` passes `ReviewReportSchema.safeParse()` with success: true | REQ-001/002 |
| TEST-102 | unit | `ReviewFinding` with severity `"urgent"` fails `ReviewFindingSchema.safeParse()` | REQ-001 |
| TEST-103 | unit | `ReviewReport` missing `findings` fails `ReviewReportSchema.safeParse()` | REQ-002 |
| TEST-104 | unit | `ReviewReport` missing `analysisId` fails `ReviewReportSchema.safeParse()` | REQ-002 |
| TEST-105 | unit | `reviewFromWireFormat()` maps snake_case → camelCase (e.g. `analysis_id` → `analysisId`, `behavior_rule_ids` → `behaviorRuleIds`) | REQ-003 |
| TEST-106 | unit | Valid snake_case wire review object passes `ReviewReportWireSchema.safeParse()` | REQ-003 |
| TEST-107 | unit | `meridian-sample-review.json` passes `ReviewReportWireSchema.safeParse()` | REQ-014 |
| TEST-108 | unit | Valid `RevealIntent` passes `RevealIntentSchema.safeParse()` | REQ-004 |
| TEST-109 | unit | `RevealIntent` missing `targetSymbol` fails `RevealIntentSchema.safeParse()` | REQ-004 |
| TEST-110 | unit | `intentFromWireFormat()` maps snake_case → camelCase | REQ-005 |
| TEST-111 | unit | `meridian-sample-intent.json` passes `RevealIntentWireSchema.safeParse()` | REQ-015 |
| TEST-112 | unit | Valid `BlastRadiusResult` passes `BlastRadiusResultSchema.safeParse()` | REQ-008 |
| TEST-113 | unit | `BlastRadiusResult` missing `nodes` fails `BlastRadiusResultSchema.safeParse()` | REQ-008 |
| TEST-114 | unit | `BlastRadiusEdge` with relationship `"related_to"` fails `BlastRadiusEdgeSchema.safeParse()` | REQ-007 |
| TEST-115 | unit | `blastRadiusFromWireFormat()` maps snake_case → camelCase | REQ-008 |
| TEST-116 | unit | `meridian-sample-blast-radius.json` passes `BlastRadiusResultWireSchema.safeParse()` | REQ-016 |
| TEST-117 | unit | Valid `AnalysisMetadata` passes `AnalysisMetadataSchema.safeParse()` | REQ-010 |
| TEST-118 | unit | `AnalysisMetadata` with `filesInspected: -1` fails `AnalysisMetadataSchema.safeParse()` | REQ-010 |
| TEST-119 | unit | `AnalysisMetadata` with `status: "pending"` fails `AnalysisMetadataSchema.safeParse()` | REQ-010 |
| TEST-120 | unit | `AnalysisMetadata` with `currentStage: "scanning"` fails `AnalysisMetadataSchema.safeParse()` | REQ-009 |
| TEST-121 | unit | `metadataFromWireFormat()` maps snake_case → camelCase | REQ-011 |
| TEST-122 | unit | `meridian-sample-metadata.json` passes `AnalysisMetadataWireSchema.safeParse()` | REQ-017 |
| TEST-123 | unit | `SeveritySchema.safeParse("urgent")` returns success: false | REQ-001 |
| TEST-124 | unit | `AnalysisStageSchema.safeParse("scanning")` returns success: false | REQ-009 |
| TEST-125 | unit | Every edge `source` and `target` in `meridian-sample-blast-radius.json` references a node `id` that exists in the fixture's `nodes` array | REQ-016 |

---

## Security Requirements

| ID | Category | Description |
|---|---|---|
| SEC-001 | input-validation | All runtime input passed to `fromWireFormat()` functions must first be validated by the corresponding `WireSchema.safeParse()` or `.parse()` before any field is accessed. No raw `as` type assertions on untrusted input are permitted. |
| SEC-002 | configuration | No `.env` files or credentials are read by any file in this feature. This feature is pure data modeling with no I/O beyond in-memory validation. |

---

## Acceptance Criteria

| ID | Automated | Description |
|---|---|---|
| AC-001 | true | `npm test` (vitest run) exits 0 with all tests passing — including all 20 existing Feature 1 tests and all 25 new tests (TEST-101 through TEST-125). |
| AC-002 | true | `npm run lint` exits 0 with no new lint errors. |
| AC-003 | true | `tsc --noEmit` exits 0 with no new type errors. |
| AC-004 | true | `npm run build` exits 0. |
| AC-005 | true | `SeveritySchema`, `Severity`, `ReviewFindingSchema`, `ReviewFinding`, `ReviewReportSchema`, `ReviewReport`, `ReviewReportWire`, `ReviewReportWireSchema`, and `reviewFromWireFormat` are named exports of `lib/analysis/review.ts`. |
| AC-006 | true | `RevealIntentSchema`, `RevealIntent`, `RevealIntentWire`, `RevealIntentWireSchema`, and `intentFromWireFormat` are named exports of `lib/analysis/intent.ts`. |
| AC-007 | true | `BlastRadiusNodeKindSchema`, `BlastRadiusNodeKind`, `BlastRadiusNodeSchema`, `BlastRadiusNode`, `BlastRadiusRelationshipSchema`, `BlastRadiusRelationship`, `BlastRadiusEdgeSchema`, `BlastRadiusEdge`, `BlastRadiusResultSchema`, `BlastRadiusResult`, `BlastRadiusResultWire`, `BlastRadiusResultWireSchema`, and `blastRadiusFromWireFormat` are named exports of `lib/analysis/blast-radius.ts`. |
| AC-008 | true | `AnalysisStageSchema`, `AnalysisStage`, `AnalysisStatusSchema`, `AnalysisStatus`, `AnalysisMetadataSchema`, `AnalysisMetadata`, `AnalysisMetadataWire`, `AnalysisMetadataWireSchema`, and `metadataFromWireFormat` are named exports of `lib/analysis/metadata.ts`. |
| AC-009 | true | All four Meridian fixtures exist and are valid JSON files with `_fixture_note` keys. |
| AC-010 | true | `meridian-sample-review.json` has exactly 1 finding with `id: "F-001"`, `severity: "high"`, and `behavior_rule_ids` containing `"BR-01"`. |
| AC-011 | true | All fixture `analysis_id` values are `"meridian-sample-20260829"`. |
| AC-012 | true | `git diff --name-only` shows no files modified under `demo/legacy-billing/`. |
| AC-013 | true | `lib/analysis/types.ts`, `lib/analysis/parser.ts`, `lib/analysis/__tests__/behavioral-contract.test.ts`, and `lib/analysis/fixtures/meridian-sample-contract.json` are not modified (git diff shows no changes to these files). |

---

## Estimated Change Budget

| Metric | Estimate |
|---|---|
| Files created | 9 |
| Files modified | 0 |
| Lines added | ~750 |
| Lines removed | 0 |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Feature 1 `BehavioralEvidence.kind` enum discrepancy: `types.ts` has `"source" \| "test" \| "dependency" \| "change"` but the Feature 1 contract specified `"source" \| "test" \| "comment" \| "constant" \| "caller" \| "document"`. The fixture uses `"dependency"` and `"change"`. | Medium | This feature does NOT modify `types.ts`. New modules import `BehavioralEvidenceSchema` as-is. The discrepancy is pre-existing; fixing it is out of scope for this feature and would break Feature 1 tests. |
| Fixture `kind` values (`"dependency"`, `"change"`) are used in existing `meridian-sample-contract.json` but are not in the Feature 1 contract spec's `kind` enum. The new review/intent/blast-radius fixtures should use only `"source" \| "test" \| "dependency" \| "change"` — the values accepted by the current `BehavioralEvidenceSchema`. | Low | New fixtures must use only enum values currently accepted by `BehavioralEvidenceSchema` in `types.ts`. |
| Blast-radius edge validity: TEST-125 verifies all edge endpoints reference declared node IDs. This is a runtime invariant, not a Zod invariant, since Zod cannot cross-reference IDs within the schema. | Low | Verified in TEST-125 via a fixture-specific data integrity test. Not enforced at the schema level (would require a superfluous refinement that cannot hold generically). |
| `riskScore` as optional integer 0–100: PRD §20.2 includes it but the computation is out of scope. Schema accepts but does not validate provenance. | Low | Documented as a schema field only. |
| Analysis metadata counters do not enforce `untestedAffectedRules <= affectedBehaviorRules` cross-field invariant. | Low | Schema only enforces non-negative integers. Cross-field logic is outside data-contracts scope; the analysis pipeline is responsible for producing valid values. |
| Future UI feature imports from new modules; any breaking change to exports would require UI update. | Low | Exports are carefully named. Wire types and domain types are separate. No barrel file means no implicit re-export chain to break. |
