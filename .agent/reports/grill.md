# Grill Report — feat-behavioral-contract-model

**Date:** 2025-08-29  
**Plan:** `.agent/plans/plan-feat-behavioral-contract-model.md`  
**Contract:** `.agent/contracts/contract-feat-behavioral-contract-model.json`  
**Grill result:** GO — with material changes incorporated below

---

## Summary of Original Plan

Foundational data-modeling feature. Defines TypeScript types + Zod schemas for
`BehavioralContract`, `BehavioralRule`, `BehavioralEvidence`, `ConfidenceLevel`, and
`TestCoverageStatus`. Produces a 6-rule sample fixture from the frozen Meridian Java
source. Adds `vitest` as the first test runner. No UI, no API, no analysis pipeline.

---

## Challenges Raised and User Answers

### C1 — camelCase vs. snake_case (BLOCKING)

**Challenge:** The PRD §20.1 wire format uses snake_case (`analysis_id`, `business_context`,
`test_coverage`, `risk_if_changed`). The plan proposed camelCase TypeScript types and deferred
the JSON mapping to a future feature. This creates a hidden seam: the analysis pipeline will
write snake_case JSON, but the TypeScript types would be camelCase. If the mapping layer is
never built, every field the UI reads will be `undefined`.

**User answer:** Use camelCase TypeScript **and** define a snake_case Zod schema for the JSON
wire format **in this same feature** — two schemas, one mapper, both validated now.

**Impact:** Material change.
- New Zod schema: `BehavioralContractWireSchema` (snake_case, matches PRD §20.1 exactly)
- New function: `fromWireFormat(wire: BehavioralContractWire): BehavioralContract`
- Exported from `lib/analysis/parser.ts`
- New test: TEST-014 — round-trip: parse JSON wire format, map to camelCase, fields match
- New test: TEST-015 — a valid snake_case wire JSON object passes `BehavioralContractWireSchema`

---

### C2 — `confidence` numeric vs. label vs. compound (BLOCKING)

**Challenge:** REQ-004 said `confidence (number 0–1 OR ConfidenceLevel label)` — ambiguous.
REQ-001 defines `ConfidenceLevel` as a standalone type with no defined relationship to the
numeric field. A `BehavioralRule` could satisfy the schema with `confidence: "high"` OR
`confidence: 0.93` — both valid, inconsistently.

**User answer:** `confidence` is a **number only** (0.0–1.0 inclusive). `ConfidenceLevel` is
a display-utility type only — the UI derives `"high" | "medium" | "low"` from the numeric
score at render time using the thresholds in PRD §17.3 (>= 0.80 = high, 0.50–0.79 = medium,
< 0.50 = low). No compound object.

**Impact:** Clarifying change.
- REQ-004 updated: `confidence` is `number` only, validated as `z.number().min(0).max(1)`
- REQ-001: `ConfidenceLevel` schema still exported but is now explicitly a UI utility type
- A helper `confidenceLabel(score: number): ConfidenceLevel` should be exported from
  `lib/analysis/types.ts` (added as REQ-013)

---

### C3 — `BehavioralEvidence.line` tuple vs. single number (BLOCKING)

**Challenge:** Plan typed `line` as `number | [number, number]`. JSON arrays don't distinguish
tuples from variable-length arrays — Zod must use `z.tuple([z.number(), z.number()])` explicitly.
Also: no specification of 1-based vs. 0-based.

**User answer:** `number | [number, number]` with `z.tuple([z.number().int().min(1), z.number().int().min(1)])`.
Line numbers are **1-based integers**.

**Impact:** Clarifying change — implementer must use `z.union([z.number().int().min(1), z.tuple([z.number().int().min(1), z.number().int().min(1)])])`.
Add test TEST-016: a line range tuple `[10, 25]` passes `BehavioralEvidenceSchema`.
Add test TEST-017: a line value of `0` (invalid 0-based) fails `BehavioralEvidenceSchema`.

---

### C4 — Sample fixture format: `.ts` or `.json` (BLOCKING)

**Challenge:** Plan proposed a `.ts` typed fixture. Q1 answer (snake_case wire schema in this
feature) makes a `.json` file more compelling — the fixture would be the actual wire format.

**User answer:** **`.json` file** in snake_case matching the PRD §20.1 wire format. Validated
at test time by `BehavioralContractWireSchema` (from Q1). No `.ts` typed fixture.

**Impact:** Material change.
- `lib/analysis/fixtures/meridian-sample-contract.ts` **replaced** by
  `lib/analysis/fixtures/meridian-sample-contract.json`
- File carries a `"_fixture_note"` key (or top-level comment in a wrapper) marking it as dev
  fixture data. Since pure JSON doesn't support comments, use a reserved metadata field:
  `"_fixture_note": "DEVELOPMENT FIXTURE — not analysis agent output. Do not use as pipeline output."`
- AC-007 updated to verify the `.json` file contains 6 rules with ids BR-01..BR-06
- TEST-011 updated to import and validate the `.json` file with `BehavioralContractWireSchema`

---

### C5 — Test runner version (BLOCKING)

**Challenge:** Plan specified `vitest ^3.0.0`. User confirmed vitest, but specified "latest
version compatible with the project's current Node/Vite versions."

**User answer:** Use `vitest` at the latest version compatible with the project's Node/Vite
stack. Project does not use Vite directly (it's a Next.js/Turbopack project), so compatibility
concern is with Node and TypeScript versions.

**Impact:** Minor clarifying change.
- REQ-008 updated: `"vitest": "^3.0.0"` — vitest 3.x requires Node >= 18, which is safe for
  a modern Next.js 16 project. Keep `^3.0.0`.

---

### C6 — `BehavioralEvidence.kind` optional vs. required (MEDIUM)

**Challenge:** `kind` was optional. Every downstream consumer branching on `kind` would need
null-checks. If optional, an analysis agent could omit it entirely and the schema would still
pass — but the contract says "discriminator," implying it should always be present.

**User answer:** **`kind` is required.** Every evidence item must declare its category.

**Impact:** Clarifying change — REQ-003 updated. Evidence without `kind` will now fail
validation. This is consistent with the "traceable source evidence" requirement in PRD §17.2.
Add test TEST-018: an evidence item missing `kind` fails `BehavioralEvidenceSchema`.

---

## Additional Challenges Not Escalated to User (Resolved by Inspection)

### C7 — `relatedSymbols` and `downstreamDependencies` unbounded string arrays

**Challenge:** Both are `string[]` with no format constraint. An analysis agent could write
Java fully-qualified class names (`com.meridian.billing.billing.LateFeeService`) or short
names (`LateFeeService`) or arbitrary strings. No test verifies the format.

**Resolution:** The data model is intentionally format-agnostic at the schema level (strings
only). Format convention will be defined in the analysis pipeline feature. No change required.

### C8 — `analysisId` format constraint

**Challenge:** `analysisId` is typed as `string` with no constraint. Should it match a pattern
like `LL-\d{3}` to match the PRD example (`"LL-001"`)? Or remain free-form?

**Resolution:** The PRD shows `"LL-001"` as an example only, not as a pattern requirement.
Keep as unconstrained string for maximum flexibility (the analysis pipeline assigns IDs).
No change required.

### C9 — `generatedAt` ISO 8601 format enforcement

**Challenge:** `generatedAt` is typed as `string` with a note "ISO 8601." But `z.string()` alone
does not validate ISO 8601 format. Zod has `z.string().datetime()` for strict ISO 8601 with
timezone.

**Resolution:** Use `z.string().datetime()` for `generatedAt` to enforce valid ISO 8601
timestamps. This is a clarifying addition — add to REQ-005. Add test TEST-019: a contract
with `generatedAt: "not-a-date"` fails parsing.

### C10 — `BehavioralRule.id` pattern constraint

**Challenge:** `id` is `string` with no pattern. PRD shows `BR-04`. Should the schema enforce
`BR-NN` format? Strict enforcement would break if the analysis agent uses different IDs.

**Resolution:** Keep `id` as unconstrained string. The `BR-NN` format is a convention, not a
schema constraint. Future: add a pattern to the wire schema if the analysis pipeline standardizes it.

### C11 — Zod 4.x vs. Zod 3.x API differences

**Challenge:** Zod 4.4.3 is installed. Zod v4 introduced breaking changes from v3 (`z.union` 
behavior, error message format changes, new `z.ZodError` structure). The implementer must use
Zod v4 APIs, not accidentally copy Zod v3 patterns.

**Resolution:** Add explicit note to REQ-006: "Use Zod v4 APIs. The installed version is 4.4.3.
Do not use deprecated v3 patterns." No new requirements but important implementation note.

### C12 — `vitest` and `tsconfig` compatibility

**Challenge:** The project `tsconfig.json` has `"module": "esnext"` and `"moduleResolution": "bundler"`.
Vitest by default resolves modules with Vite, but without a `vite.config.ts` in the project,
it falls back to Node resolution. The `moduleResolution: "bundler"` in tsconfig may conflict
with vitest's default Node resolver.

**Resolution:** Add a minimal `vitest.config.ts` to `lib/` or project root that sets
`resolve: { conditions: ["browser", "import", "module", "require", "default"] }` to match
the bundler resolution. Add `vitest.config.ts` to the allowed paths and expected files.

---

## Edge Cases Identified

| # | Trigger | Expected Behaviour | Covered? |
|---|---|---|---|
| EC-1 | `confidence: 1.0` (exact boundary) | PASS — 1.0 is valid | ✅ TEST-001 covers valid cases; boundary not explicit. Add note to TEST-001. |
| EC-2 | `confidence: 0.0` (zero boundary) | PASS — 0.0 is valid | Not explicit. Add boundary note to TEST-001. |
| EC-3 | `evidence` array has one item (minimum) | PASS — min 1 | Not explicit. TEST-001 should include a single-evidence rule. |
| EC-4 | `rules` array has one item (minimum) | PASS | Not explicit. TEST-001 should cover min-1 rule. |
| EC-5 | `line` tuple `[25, 10]` (end < start) | The schema should FAIL — range must be start <= end | ❌ Not covered. Add TEST-020. |
| EC-6 | `line: 0` (zero is not valid 1-based) | FAIL | ❌ Now covered by TEST-017 (added in C3). |
| EC-7 | `fromWireFormat` called with undefined field | FAIL gracefully — `parseContract` throws `ContractValidationError` | ❌ Partially covered by TEST-012. |
| EC-8 | JSON fixture `_fixture_note` field present | Wire schema must allow unknown/optional keys | ❌ Note: `_fixture_note` must be in the snake_case wire schema as optional, or the schema must permit extra keys via `.passthrough()` — otherwise TEST-011 would fail because the fixture contains a non-schema key. |
| EC-9 | `BehavioralContractWire` with extra unknown fields | Should fail if strict, pass if passthrough | Design decision needed: strict or passthrough? |
| EC-10 | Empty `relatedSymbols: []` | PASS — empty arrays are valid | ✅ Implied, not explicit. |

**EC-8 and EC-9 are blocking design decisions.** The `_fixture_note` metadata key in the JSON
fixture requires the wire schema to use `.passthrough()` (allow extra keys) or the fixture
test will fail. Alternatively, remove `_fixture_note` from the fixture and use a different
mechanism to mark it as a dev fixture (e.g., a README in the fixtures directory).

**Resolution of EC-8/EC-9 (resolved without escalating):** Use `.passthrough()` on the wire
schema so extra/unknown fields are allowed. This matches the "minimum shape" language in
PRD §20.1, which explicitly says "minimum shape" — implying additional fields are allowed.
Add to REQ-005-wire: wire schema uses `.passthrough()` for forward compatibility.

**Resolution of EC-5:** Add REQ-014: `BehavioralEvidenceSchema` must validate that for a line
range `[start, end]`, `start <= end`. Add TEST-020.

---

## Security Analysis

This feature has minimal security surface — pure data modeling with no I/O, no network, no
filesystem access at runtime. The grill found:

| ID | Category | Finding | Status |
|---|---|---|---|
| S-1 | input-validation | `parseContract()` wraps `safeParse` — no raw cast. SEC-001 is sound. | ✅ Satisfied |
| S-2 | secret-exposure | No `.env` access. SEC-002 is sound. | ✅ Satisfied |
| S-3 | injection | No shell commands, no template rendering, no SQL. Not applicable. | ✅ N/A |
| S-4 | path-traversal | No filesystem access in the schema/parser layer. Not applicable. | ✅ N/A |
| S-5 | input-validation | The `ContractValidationError` message includes Zod error details. Must not include untrusted user input verbatim if error is surfaced to a UI. For this feature (no UI), this is acceptable. The future UI feature must sanitize error messages before display. | ⚠ Note for future feature |
| S-6 | configuration | The `.json` fixture file `_fixture_note` key could be mistaken for a config entry. Passthrough schema means extra fields are silently accepted. This is intentional but should be documented. | ℹ Documented |

---

## Testing Gaps in Original Plan

| Gap | Severity | Resolution |
|---|---|---|
| AC-001 says "13 tests" but post-grill the count changes | Medium | AC-001 updated to reflect new test count (20 tests) |
| No test for `confidence: 0.0` and `confidence: 1.0` boundary values | Medium | Add explicit boundary assertions to TEST-001 |
| No test for the wire format round-trip | High | TEST-014, TEST-015 added |
| No test for line range `[end < start]` | Medium | TEST-020 added |
| No test for `line: 0` (invalid 0-based) | Medium | TEST-017 added |
| No test for `kind` required enforcement | Medium | TEST-018 added |
| No test for `generatedAt` non-date string | Medium | TEST-019 added |
| No test for `line` tuple `[10, 25]` (valid range) | Low | TEST-016 added |
| AC-007 references a `.ts` file export — now `.json` | High | AC-007 revised |

---

## Revised Requirements (incorporating all answers)

| ID | Change | Description |
|---|---|---|
| REQ-001 | Clarified | `ConfidenceLevel` is a display-utility type only. Not used in `BehavioralRule.confidence`. |
| REQ-003 | Updated | `kind` is **required** (not optional). `line` uses `z.union([z.number().int().min(1), z.tuple([...])])`. Line numbers are 1-based integers. |
| REQ-004 | Updated | `confidence` is `number` only (`z.number().min(0).max(1)`). No label variant. |
| REQ-005 | Updated | `generatedAt` validated with `z.string().datetime()`. |
| REQ-007 | Updated | Fixture is a `.json` file at `lib/analysis/fixtures/meridian-sample-contract.json`. Uses snake_case. Contains `"_fixture_note"` metadata key. Must be authored from Java source only. |
| REQ-008 | Confirmed | `vitest ^3.0.0` devDependency, `"test": "vitest run"` script. |
| REQ-009 | Updated | 20 tests (TEST-001 through TEST-020). |
| REQ-010 | Updated | `parser.ts` also exports `fromWireFormat(wire): BehavioralContract` and `BehavioralContractWireSchema`. |
| **REQ-013** | **NEW** | Export `confidenceLabel(score: number): ConfidenceLevel` from `lib/analysis/types.ts`. |
| **REQ-014** | **NEW** | `BehavioralEvidenceSchema` must validate that a line range tuple has `start <= end`. |
| REQ-011 | Confirmed | No new runtime production dependencies. |
| REQ-012 | Confirmed | Frozen fixture paths untouched. |

**New file:** `vitest.config.ts` at project root (or minimal config needed for module resolution).

---

## Revised Acceptance Criteria (delta only)

| ID | Change |
|---|---|
| AC-001 | Updated: "`npm test` exits 0 with **all 20 tests** passing." |
| AC-007 | Updated: "`lib/analysis/fixtures/meridian-sample-contract.json` is a valid JSON file whose `rules` array has exactly 6 items with ids `BR-01` through `BR-06`." |
| **AC-010** | **NEW**: "A valid snake_case wire-format object passes `BehavioralContractWireSchema.safeParse()` with `success: true`." |
| **AC-011** | **NEW**: "`fromWireFormat` is exported from `lib/analysis/parser.ts` and maps snake_case keys to camelCase fields." |
| **AC-012** | **NEW**: "`confidenceLabel(0.85)` returns `"high"`, `confidenceLabel(0.65)` returns `"medium"`, `confidenceLabel(0.40)` returns `"low"`." |

---

## Revised Expected Files

### Created

| File | Purpose |
|---|---|
| `lib/analysis/types.ts` | Zod schemas + inferred types + `confidenceLabel()` helper |
| `lib/analysis/parser.ts` | `parseContract()`, `ContractValidationError`, `fromWireFormat()`, `BehavioralContractWireSchema` |
| `lib/analysis/fixtures/meridian-sample-contract.json` | Dev fixture (snake_case, 6 rules, `_fixture_note` field) |
| `lib/analysis/__tests__/behavioral-contract.test.ts` | 20 vitest unit tests |
| `vitest.config.ts` | Minimal vitest config for module resolution compatibility |

### Modified

| File | Change |
|---|---|
| `package.json` | Add `vitest ^3.0.0` to devDependencies; add `"test": "vitest run"` script |
| `package-lock.json` | Auto-updated by `npm install` |

---

## Revised Change Budget

| Metric | Original Estimate | Revised Estimate |
|---|---|---|
| Files created | 4 | 5 |
| Files modified | 1 | 2 (package.json + lock) |
| Lines added | ~350 | ~500 |
| Lines removed | 0 | 0 |

---

## Go / No-Go Recommendation

**GO** — with the material changes incorporated.

All 6 blocking questions answered. All material changes have been reflected in the revised
requirements and acceptance criteria above.

No unresolved ambiguities remain that would block implementation.

The plan and contract will be updated to reflect this grill session. After review, the user
should run `/approve-plan` to unlock implementation.

---

## Open items for human review before approval

1. **EC-8/EC-9 resolution** — the wire schema uses `.passthrough()` to allow `_fixture_note`.
   If strict schema enforcement is preferred, the fixture metadata mechanism must change.
   Confirm this is acceptable.

2. **AC-009 (human review criterion)** — the 6 sample rules' quality can only be validated by
   a human reading the Java source. This is the only non-automated acceptance criterion.
   The grill cannot verify it — the implementer must flag this explicitly on completion.

3. **`vitest.config.ts`** — the exact configuration needed depends on whether vitest encounters
   resolution errors with `moduleResolution: "bundler"` at install time. The implementer should
   handle this during setup and may need a trivial config file.
