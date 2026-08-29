# Plan: feat-behavioral-contract-model

**Feature ID:** `feat-behavioral-contract-model`  
**Date:** 2025-08-29  
**Status:** Draft — grilled; awaiting human approval  
**Grill report:** `.agent/reports/grill.md`

---

## Objective

Define the canonical TypeScript types and Zod runtime-validation schemas for the
Behavioral Contract data model, including a snake_case wire-format schema and mapper,
and produce a deterministic sample JSON contract seeded with BR-01 through BR-06 from
the frozen Meridian fixture.

---

## Background / PRD Mapping

This feature implements **Phase B — Analysis Contract** from PRD §30.
It directly satisfies:

| PRD Reference | Coverage |
|---|---|
| FR-005 — Behavioral Contract Generation | Types + schemas for `behavior-contract.json` |
| §20.1 — Data Contract: `behavior-contract.json` | Wire schema enforces the minimum shape |
| §17.1 — Rule Quality Requirements | `invariant` field; `title`/`description` distinction |
| §17.2 — Evidence Requirements | `BehavioralEvidence` structure with required `kind` |
| §17.3 — Confidence | Numeric `confidence` (0–1); `ConfidenceLevel` as UI display utility |
| §25.1 — Product Unit Tests P0 | 20 unit tests covering schema and parser |
| §25.4 — Analysis Validation P0 | Sample JSON fixture validates against wire schema |

---

## Requirements

| ID | Priority | Description |
|---|---|---|
| REQ-001 | must | Define `ConfidenceLevel` as a TypeScript union type (`"high" \| "medium" \| "low"`) derived from a Zod enum schema. This type is a **UI display utility only** — it is NOT a field in `BehavioralRule`. Export `ConfidenceLevelSchema` and `ConfidenceLevel` from `lib/analysis/types.ts`. |
| REQ-002 | must | Define `TestCoverageStatus` as a TypeScript union type (`"covered" \| "partial" \| "uncovered" \| "unknown"`) derived from a Zod enum schema. Export `TestCoverageStatusSchema` and `TestCoverageStatus` from `lib/analysis/types.ts`. |
| REQ-003 | must | Define `BehavioralEvidence` with: `file` (string, required), `symbol` (string, optional), `line` (optional — `number` \| `[number, number]` tuple; line numbers are 1-based integers; tuple must satisfy `start <= end`), `excerpt` (string, optional), `kind` (required discriminator: `"source" \| "test" \| "comment" \| "constant" \| "caller" \| "document"`). The Zod schema uses `z.union([z.number().int().min(1), z.tuple([z.number().int().min(1), z.number().int().min(1)])])` for `line`, with a refinement ensuring `end >= start` for the tuple case. |
| REQ-004 | must | Define `BehavioralRule` with required fields: `id` (string), `title` (string), `description` (string), `businessContext` (string), `invariant` (string), `evidence` (array of `BehavioralEvidence`, min 1 item), `confidence` (number, `z.number().min(0).max(1)`), `testCoverage` (TestCoverageStatus), `relatedSymbols` (string[]), `downstreamDependencies` (string[]), `riskIfChanged` (string). |
| REQ-005 | must | Define `BehavioralContract` with required fields: `analysisId` (string), `generatedAt` (`z.string().datetime()` — strict ISO 8601 with timezone), `sourceFixture` (string), `rules` (array of `BehavioralRule`, min 1 item). |
| REQ-006 | must | Export from `lib/analysis/types.ts`: Zod schemas `BehavioralEvidenceSchema`, `BehavioralRuleSchema`, `BehavioralContractSchema`, `ConfidenceLevelSchema`, `TestCoverageStatusSchema`; TypeScript types `BehavioralEvidence`, `BehavioralRule`, `BehavioralContract`, `ConfidenceLevel`, `TestCoverageStatus` (all via `z.infer`). Use Zod **v4** APIs. |
| REQ-007 | must | Produce a development-only sample fixture at `lib/analysis/fixtures/meridian-sample-contract.json`. The fixture must: (a) be valid snake_case JSON matching the PRD §20.1 wire format; (b) contain exactly 6 rules with ids `BR-01` through `BR-06`; (c) include a top-level `"_fixture_note"` key with value `"DEVELOPMENT FIXTURE — not analysis agent output. Do not use as pipeline output."`; (d) be authored by reading `demo/legacy-billing/src/` Java source files only — `GROUND_TRUTH.md`, `LEGACY_FIXTURE_SPEC.md`, `ANALYSIS_SCOPE.md`, and `PROPOSED_CHANGE.md` must not be read during fixture authoring. |
| REQ-008 | must | Add `vitest` to `devDependencies` in `package.json` at the latest stable version compatible with the project's existing Node and frontend toolchain. Do not upgrade Node, Next.js, or other framework dependencies solely to accommodate Vitest. Selected version: **4.1.11** (`vitest@latest`; engines `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0`, satisfied by Node 26.1.0). Add `"test": "vitest run"` to the `scripts` block. |
| REQ-009 | must | Write 20 unit tests in `lib/analysis/__tests__/behavioral-contract.test.ts`. Test IDs TEST-001 through TEST-020 as specified in the Test Requirements section. |
| REQ-010 | should | Export from `lib/analysis/parser.ts`: (a) `parseContract(input: unknown): BehavioralContract` — uses `BehavioralContractSchema.safeParse()`; throws `ContractValidationError` on failure with Zod error details in message; (b) `ContractValidationError` — custom `Error` subclass; (c) `BehavioralContractWireSchema` — Zod schema for the snake_case JSON wire format matching PRD §20.1; uses `.passthrough()` to allow unknown keys (e.g. `_fixture_note`); (d) `fromWireFormat(wire: BehavioralContractWire): BehavioralContract` — maps snake_case keys to camelCase fields. |
| REQ-011 | must | No new runtime production dependencies. Zod is already installed at 4.4.3. |
| REQ-012 | must | The frozen fixture paths listed below must not be modified. |
| REQ-013 | must | Export `confidenceLabel(score: number): ConfidenceLevel` from `lib/analysis/types.ts`. Must implement: `>= 0.80 → "high"`, `0.50–0.79 → "medium"`, `< 0.50 → "low"` (matching PRD §17.3 thresholds). |
| REQ-014 | must | `BehavioralEvidenceSchema` must apply a Zod refinement on the `line` field that rejects tuples where `end < start`. |

---

## Non-Requirements (Explicit Exclusions)

- No UI components or pages.
- No API routes.
- No database persistence.
- No analysis pipeline, diff parsing, or intent extraction.
- No `review.json` or `analysis-metadata.json` schemas (separate feature).
- No Java parsing or source analysis tooling.
- No git integration.
- No authentication.
- No risk scoring engine.
- No Reveal Intent, Behavior Map, or Blast Radius visualization.
- No test generation or guardrail test execution.
- The sample contract fixture is **development fixture data only** — not analysis agent output.
- `GROUND_TRUTH.md` and `LEGACY_FIXTURE_SPEC.md` must not be read during fixture authoring.
- No `tags` or `category` field on `BehavioralRule` (out of scope).
- No schema version field on `BehavioralContract` (deferred).

---

## Affected Files

### Created (new files)

| File | Purpose |
|---|---|
| `lib/analysis/types.ts` | Zod schemas + inferred types + `confidenceLabel()` helper |
| `lib/analysis/parser.ts` | `parseContract()`, `ContractValidationError`, `fromWireFormat()`, `BehavioralContractWireSchema` |
| `lib/analysis/fixtures/meridian-sample-contract.json` | Dev fixture: snake_case, 6 rules, `_fixture_note` field |
| `lib/analysis/__tests__/behavioral-contract.test.ts` | 20 vitest unit tests |
| `vitest.config.ts` | Minimal vitest config for module resolution compatibility with Next.js tsconfig |

### Modified (existing files)

| File | Change |
|---|---|
| `package.json` | Add `vitest ^4.1.11` to devDependencies; add `"test": "vitest run"` script |
| `package-lock.json` | Auto-updated by `npm install` |

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
```

---

## Dependencies Required

### New dev dependency

| Package | Version | Justification |
|---|---|---|
| `vitest` | `^4.1.11` | No test runner is currently installed. `vitest@latest` is **4.1.11** (engine: `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0`, satisfied by Node 26.1.0). This is the latest stable release; `^3.0.0` is superseded. Vitest is zero-config for TypeScript, works with the existing `tsconfig.json` without additional transformers, and the verification harness (`verify.sh`) discovers the `test` script automatically. Node's built-in `node:test` would require `tsx` (also not installed) for TypeScript — no net dependency reduction. Version selected after `npm info vitest dist-tags` inspection confirmed `latest: 4.1.11`. |

### Existing dependencies used (no new additions)

- `zod` 4.4.3 — schema validation (already installed)
- `typescript` — type checking (already installed)

---

## Architecture Decisions

### camelCase TypeScript + snake_case wire format

The TypeScript domain model uses camelCase (`analysisId`, `businessContext`, etc.).
The Zod wire-format schema (`BehavioralContractWireSchema`) accepts snake_case JSON
matching PRD §20.1 (`analysis_id`, `business_context`, etc.).
`fromWireFormat()` maps between them in `parser.ts`.

This removes the hidden seam identified in the grill: both formats are validated
and tested in this same feature.

### `confidence` as number only

PRD §17.3 uses numeric thresholds for range boundaries. `confidence` in `BehavioralRule`
is `number` (0.0–1.0). `ConfidenceLevel` is a UI utility type derived by `confidenceLabel()`.

### Wire schema uses `.passthrough()`

PRD §20.1 says "minimum shape," implying additional fields are allowed.
The wire schema uses `.passthrough()` so the `_fixture_note` metadata key in the fixture
does not cause validation failure. This also allows the analysis pipeline to include
additional fields in future versions.

### Fixture as `.json`, validated at test time

The fixture is a raw `.json` file in snake_case wire format. It is validated at test time
by `BehavioralContractWireSchema`. This makes it maximally realistic and directly usable
as a reference for the future analysis pipeline output format.

### Fixture authoring constraint

REQ-007 imposes a strict allowlist: the implementation agent must read only
`demo/legacy-billing/src/main/java/` and `demo/legacy-billing/src/test/java/` when
authoring the sample fixture. `GROUND_TRUTH.md` and `LEGACY_FIXTURE_SPEC.md` are
forbidden inputs.

---

## Test Requirements

| ID | Type | Description | Req ref |
|---|---|---|---|
| TEST-001 | unit | A fully valid `BehavioralContract` with all required fields (including `confidence: 0.0`, `confidence: 1.0` boundary values tested) passes `BehavioralContractSchema.safeParse()` with `success: true`. | REQ-006 |
| TEST-002 | unit | A contract where a rule's `evidence` array is empty (`[]`) fails `BehavioralContractSchema.safeParse()` with `success: false`. | REQ-004 |
| TEST-003 | unit | A contract where `confidence` is `1.1` fails parsing with `success: false`. | REQ-004 |
| TEST-004 | unit | A contract where `confidence` is `-0.1` fails parsing with `success: false`. | REQ-004 |
| TEST-005 | unit | A contract missing the top-level `rules` array fails parsing with `success: false`. | REQ-005 |
| TEST-006 | unit | A rule missing `id` fails parsing with `success: false`. | REQ-004 |
| TEST-007 | unit | A rule missing `title` fails parsing with `success: false`. | REQ-004 |
| TEST-008 | unit | An evidence item missing `file` fails parsing with `success: false`. | REQ-003 |
| TEST-009 | unit | An invalid `ConfidenceLevel` string (e.g. `"very-high"`) fails `ConfidenceLevelSchema.safeParse()` with `success: false`. | REQ-001 |
| TEST-010 | unit | An invalid `TestCoverageStatus` string (e.g. `"fully-covered"`) fails `TestCoverageStatusSchema.safeParse()` with `success: false`. | REQ-002 |
| TEST-011 | unit | The `meridian-sample-contract.json` fixture parses correctly and passes `BehavioralContractWireSchema.safeParse()` with `success: true`. | REQ-007 |
| TEST-012 | unit | `parseContract()` throws `ContractValidationError` when called with an empty object `{}`. | REQ-010 |
| TEST-013 | unit | `parseContract()` returns a typed `BehavioralContract` when called with a valid camelCase contract object. | REQ-010 |
| TEST-014 | unit | `fromWireFormat()` successfully maps a valid snake_case wire object to a `BehavioralContract` with camelCase fields. | REQ-010 |
| TEST-015 | unit | A valid snake_case wire-format object passes `BehavioralContractWireSchema.safeParse()` with `success: true`. | REQ-010 |
| TEST-016 | unit | An evidence item with `line: [10, 25]` (valid range tuple) passes `BehavioralEvidenceSchema.safeParse()` with `success: true`. | REQ-003 |
| TEST-017 | unit | An evidence item with `line: 0` (invalid — 0 is not a valid 1-based line number) fails `BehavioralEvidenceSchema.safeParse()` with `success: false`. | REQ-003 |
| TEST-018 | unit | An evidence item missing the required `kind` field fails `BehavioralEvidenceSchema.safeParse()` with `success: false`. | REQ-003 |
| TEST-019 | unit | A contract with `generatedAt: "not-a-date"` (invalid ISO 8601) fails `BehavioralContractSchema.safeParse()` with `success: false`. | REQ-005 |
| TEST-020 | unit | An evidence item with `line: [25, 10]` (end < start — invalid range) fails `BehavioralEvidenceSchema.safeParse()` with `success: false`. | REQ-014 |

---

## Security Requirements

| ID | Category | Description |
|---|---|---|
| SEC-001 | input-validation | All runtime input to `parseContract()` passes through Zod schema validation before any field is accessed. No raw `as` type assertions on untrusted input are permitted. |
| SEC-002 | configuration | No `.env` files read. No credentials involved. This feature is pure data modeling with no I/O beyond in-memory validation. |

---

## Acceptance Criteria

| ID | Automated | Description |
|---|---|---|
| AC-001 | true | `npm test` (vitest run) exits 0 with **all 20 tests** passing — no failures, no skipped tests. |
| AC-002 | true | `npm run lint` exits 0 with no new lint errors introduced by this feature. |
| AC-003 | true | `tsc --noEmit` exits 0 — all TypeScript types in the new files are valid with no type errors. |
| AC-004 | true | `BehavioralContractSchema`, `BehavioralRuleSchema`, `BehavioralEvidenceSchema`, `ConfidenceLevelSchema`, `TestCoverageStatusSchema` are named exports of `lib/analysis/types.ts`. |
| AC-005 | true | TypeScript types `BehavioralContract`, `BehavioralRule`, `BehavioralEvidence`, `ConfidenceLevel`, `TestCoverageStatus` are named exports of `lib/analysis/types.ts`. |
| AC-006 | true | `parseContract`, `ContractValidationError`, `fromWireFormat`, and `BehavioralContractWireSchema` are named exports of `lib/analysis/parser.ts`. |
| AC-007 | true | `lib/analysis/fixtures/meridian-sample-contract.json` is a valid JSON file whose top-level `rules` array has exactly 6 items with ids `"BR-01"` through `"BR-06"` in order. |
| AC-008 | true | `git diff --name-only` shows no files modified under `demo/legacy-billing/`. |
| AC-009 | false | Human review: each of the 6 sample rules has a plausible business description, at least one evidence item whose `file` field references a real Java source path under `demo/legacy-billing/src/`, and the rule was derived by reading source code — not from `GROUND_TRUTH.md`. |
| AC-010 | true | A valid snake_case wire-format object passes `BehavioralContractWireSchema.safeParse()` with `success: true` (verified in TEST-015). |
| AC-011 | true | `fromWireFormat` is exported from `lib/analysis/parser.ts` and maps snake_case fields to camelCase (verified in TEST-014). |
| AC-012 | true | `confidenceLabel(0.85)` returns `"high"`, `confidenceLabel(0.65)` returns `"medium"`, `confidenceLabel(0.40)` returns `"low"` (verified via assertions in TEST-001 or a dedicated test). |

---

## Estimated Change Budget

| Metric | Estimate |
|---|---|
| Files created | 5 |
| Files modified | 2 (package.json + lock) |
| Lines added | ~500 |
| Lines removed | 0 |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Fixture authoring from GROUND_TRUTH.md contamination | High | REQ-007 explicitly forbids reading GROUND_TRUTH.md. Plan contract marks it as forbidden path. Implementation agent must use Java source allowlist only. |
| Vitest module resolution conflict with `moduleResolution: "bundler"` | Low | `vitest.config.ts` included in expected files. Implementer handles at setup time. |
| Wire schema `.passthrough()` allowing silent field drift | Low | Documented as intentional. Future analysis pipeline feature can tighten if needed. |
| `ContractValidationError` message leaking to UI | Low | Noted as future concern; not a risk for this feature (no UI). |
| Zod v4 API differences from v3 | Low | REQ-006 explicitly requires Zod v4 APIs. |
| `meridian-sample-contract.json` mistaken for real analysis output | Medium | `_fixture_note` field + README note in `lib/analysis/fixtures/`. |

---

## Open Items for Human Review

1. Wire schema uses `.passthrough()` for forward compatibility and `_fixture_note` support.
   Confirm this is acceptable (vs. strict schema rejection of unknown fields).
2. AC-009 is the only non-automated criterion. The implementer must self-certify that
   the 6 rules were derived from Java source only.
