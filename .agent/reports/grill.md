# Grill Report — feat-data-foundation

**Date:** 2026-08-29  
**Plan:** `.agent/plans/plan-feat-data-foundation.md`  
**Contract:** `.agent/contracts/contract-feat-data-foundation.json`  
**Mode:** Hackathon fast mode (max 2 blocking questions)

---

## Summary of Original Plan

Feature 2 of the Legacy Lens data-foundation layer. Defines four new TypeScript/Zod
modules — `review.ts`, `intent.ts`, `blast-radius.ts`, `metadata.ts` — each following
the Feature 1 architecture: snake_case wire schema → `.passthrough()` → mapper →
camelCase domain type. Produces four deterministic Meridian JSON fixtures and 25 unit
tests (TEST-101 – TEST-125). Zero new dependencies; zero modifications to existing files.

---

## Challenges Raised

### C-001 — Wire types not listed as exports (MATERIAL)

**Challenge:** REQ-001/002/003 require `reviewFromWireFormat(wire: ReviewReportWire):
ReviewReport`. The type `ReviewReportWire` is `z.infer<typeof ReviewReportWireSchema>`.
Callers (UI, pipeline) need to import this type. Neither the requirements nor AC-005/006/
007/008 list the Wire types as named exports. An implementer could legitimately define
them internally (`type ReviewReportWire = ...`) without exporting.

**Resolution:** Self-resolved. Plan and contract updated to explicitly list Wire types
as required named exports. Specifically:
- `ReviewReportWire` — `lib/analysis/review.ts`
- `RevealIntentWire` — `lib/analysis/intent.ts`
- `BlastRadiusResultWire` — `lib/analysis/blast-radius.ts`
- `AnalysisMetadataWire` — `lib/analysis/metadata.ts`

AC-005 through AC-008 updated to include Wire types.

**User answer:** N/A (self-resolved).

---

### C-002 — `ReviewFinding.evidence` allows empty array (noted risk)

**Challenge:** PRD §FR-009 says "before a high/critical finding is surfaced, evidence
must support the behavior claim." The plan allows `evidence: []` in `ReviewFinding`. A
UI reading a `severity: "critical"` finding with `evidence: []` could display a
misleading result.

**Resolution:** Self-resolved as intentional. The schema layer is descriptive. The
analysis pipeline (not the schema) enforces FR-009. The plan's Architecture Decisions
section already explains this. No schema change warranted.

**User answer:** N/A (self-resolved).

---

### C-003 — `changedLines` duplicates `LineNumberSchema` from types.ts (minor divergence risk)

**Challenge:** `LineNumberSchema` is defined in `lib/analysis/types.ts` (not exported,
internal). The plan marks `types.ts` as forbidden to modify. `review.ts` must define
the same line-range schema inline, creating a copy. If one copy drifts, validation
behaviour diverges.

**Resolution:** Self-resolved as acceptable. The constraint is narrow (same tuple
semantics, same refinement). Both copies are covered by their respective test suites.
The alternative (exporting `LineNumberSchema` from `types.ts`) would modify a frozen
file. Duplicate inline definition is the correct call.

**User answer:** N/A (self-resolved).

---

### C-004 — `findingsBySeverity` breakdown absent (potential future gap)

**Challenge:** PRD §FR-014 mentions "findings count by severity" (plural). The plan
includes only `highRiskFindings` in `AnalysisMetadata`. A full per-severity breakdown
(`criticalFindings`, `mediumFindings`, etc.) is absent.

**Resolution:** Self-resolved. PRD §20.3 minimum wire shape shows only `high_risk_findings`.
Minimum shape determines scope for this data-foundation feature. The analysis pipeline
can extend the schema. No requirement added.

**User answer:** N/A (self-resolved).

---

### C-005 — AC-010 not verified by any test assertion (minor)

**Challenge:** AC-010 requires `meridian-sample-review.json` to have `id: "F-001"`,
`severity: "high"`, and `behavior_rule_ids` containing `"BR-01"`. TEST-107 only checks
that the fixture parses — it doesn't assert these specific field values.

**Resolution:** The fixture content is controlled by the implementer and is static.
AC-010 is verifiable by human inspection of the fixture, consistent with how Feature 1
handled AC-009 (human review of fixture content). No additional test required.

**User answer:** N/A (self-resolved).

---

### C-006 — AC-011 (consistent `analysis_id`) not covered by any automated test (minor)

**Challenge:** Four fixtures must all have `analysis_id: "meridian-sample-20260829"`.
No test explicitly asserts this. An implementer typo would only be caught by manual review.

**Resolution:** Self-resolved. This is a fixture authoring constraint, not a schema
constraint. The implementer self-certifies it and it is verifiable by inspection. Consistent
with Feature 1's AC-009 (also non-automated). No test added.

**User answer:** N/A (self-resolved).

---

## Blocking User Questions Asked

**None.** All issues were self-resolvable from PRD + Feature 1 conventions.

---

## Revised Requirements (from self-resolution)

The only material change is adding Wire types as explicit named exports.

### Updated REQ-003 (was: ReviewReport wire schema + mapper)
Add: Export `ReviewReportWire` (the `z.infer` type of `ReviewReportWireSchema`) as a
named export from `lib/analysis/review.ts`.

### Updated REQ-005 (was: RevealIntent wire schema + mapper)
Add: Export `RevealIntentWire` as a named export from `lib/analysis/intent.ts`.

### Updated REQ-008 (was: BlastRadiusResult domain type + wire schema + mapper)
Add: Export `BlastRadiusResultWire` as a named export from
`lib/analysis/blast-radius.ts`.

### Updated REQ-011 (was: AnalysisMetadata wire schema + mapper)
Add: Export `AnalysisMetadataWire` as a named export from `lib/analysis/metadata.ts`.

---

## Acceptance Criteria Additions / Changes

### Updated AC-005
Add `ReviewReportWire` to the named exports list for `lib/analysis/review.ts`.

### Updated AC-006
Add `RevealIntentWire` to the named exports list for `lib/analysis/intent.ts`.

### Updated AC-007
Add `BlastRadiusResultWire` to the named exports list for
`lib/analysis/blast-radius.ts`.

### Updated AC-008
Add `AnalysisMetadataWire` to the named exports list for
`lib/analysis/metadata.ts`.

---

## Unresolved Risks for Human Attention

1. **Pre-existing `BehavioralEvidence.kind` discrepancy** — `lib/analysis/types.ts`
   exports `kind: "source" | "test" | "dependency" | "change"`, but the Feature 1
   contract specification listed `"source" | "test" | "comment" | "constant" | "caller"
   | "document"`. This feature cannot fix it (types.ts is frozen). The discrepancy
   should be addressed in a dedicated scope-limited fix before or alongside UI
   implementation. New fixtures authored in Feature 2 will use `"source"`, `"test"`,
   and `"dependency"` only — the safe intersection.

---

## Go / No-Go Recommendation

**GO** — with the Wire type export additions applied to the contract and plan.

No blocking questions were needed. The plan is well-specified, architecturally
consistent with Feature 1, appropriately scoped, and the single material gap (Wire
type exports) is a straightforward addition. Frozen fixture is not touched. No new
dependencies. Test coverage is sufficient for a data-contracts feature.
