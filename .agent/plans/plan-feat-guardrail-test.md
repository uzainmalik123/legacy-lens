# Plan: Feature 5 — Test Gap + Generate Guardrail Test

**Feature ID:** `feat-guardrail-test`  
**Status:** Draft  
**PRD references:** US-006, US-007, FR-010, FR-011, FR-019, §8 Demo Story Steps 6–7, §19.8, §30 Phase E

---

## Objective

Extend the existing BR-01 finding detail in `FindingsPane` so the user sees an explicit "Test Gap"
section with a prominent "Generate Guardrail Test" action; activating it shows a structured
generated JUnit 5 characterization-test view sourced from a new development fixture —
without modifying the frozen Meridian Java fixture or invoking any real analysis pipeline.

---

## Background and Key Observations

### Why the test gap exists

The existing `meridian-sample-contract.json` marks BR-01 with `"test_coverage": "covered"`,
because `LateFeeServiceTest` does test the late-fee path. However, as the existing
`meridian-sample-review.json` F-001 finding says:

> "All existing LateFeeServiceTest assertions use values where DOWN and HALF_UP produce the
>  same result (8.23, 23.23), so the tests would not catch this regression."

The review finding itself carries `"test_coverage": "uncovered"`. The `FindingsPane` already
renders "No characterization test" for this case. This feature builds on that existing signal
by adding (a) an explicit gap explanation and (b) a generate action.

The contract fixture's `test_coverage: covered` for BR-01 is **correct at the contract level**
(some test coverage exists). The review finding's `test_coverage: uncovered` is **correct at the
finding level** (no test catches *this specific regression*). The Test Gap section must be precise:
the claim is "no existing test distinguishes DOWN from HALF_UP for BR-01", not
"the repository has no tests."

### Characterization test semantics

The generated test captures the **current observable behavior** (12.34 with DOWN), not the
proposed change. It is a CHARACTERIZATION test: its purpose is to force any future change to
DOWN→HALF_UP to be explicit (the assertion would fail at 12.345 input after the patch). The UI
must not claim this is the objectively correct business behavior.

---

## Requirements

**REQ-001** — Test Gap section in the existing finding detail  
The `FindingDetail` view inside `FindingsPane` must display a "Test Gap" section below the
existing test-coverage block when `testCoverage === "uncovered"`. The section must clearly state:
- What behavior is unprotected: "No existing test distinguishes `RoundingMode.DOWN` from
  `RoundingMode.HALF_UP` for BR-01."
- The evidence from existing tests (drawn from the finding's evidence items of kind "test").
- A "Generate Guardrail Test" button.

The section must use `--risk-high`/`--risk-high-bg` color tokens (consistent with the existing
"No characterization test" treatment) to make the gap visually prominent.

**REQ-002** — Guardrail test development fixture  
Create a new development fixture file:
`lib/analysis/fixtures/meridian-sample-guardrail-test.json`

The fixture must include a `_fixture_note: "DEVELOPMENT FIXTURE — not analysis agent output.
Do not use as pipeline output."` top-level field.

It must contain:
- `id`: string (e.g. "GT-001")
- `behavior_rule_id`: "BR-01"
- `analysis_id`: "meridian-sample-20260829" (matches existing session)
- `filename`: "LateFeeRoundingCharacterizationTest.java"
- `framework`: "JUnit 5"
- `language`: "Java"
- `code`: the canonical JUnit 5 characterization test targeting the 12.345→12.34 scenario
  (see §Canonical Test Body below)
- `rationale`: concise explanation of what invariant the test preserves
- `status`: "generated"
- `protected_behavior`: human-readable summary of the current invariant
- `boundary_scenario`: object with fields `balance`, `rate`, `raw_fee`, `current_result`,
  `proposed_result` containing the 1500.00/0.00823/12.345/12.34/12.35 values
- `detection_note`: string explaining what the test would detect if the proposed change were merged

**REQ-003** — GuardrailTest domain model and wire schema
Create `lib/analysis/guardrail-test.ts` following the established pattern:
- `GuardrailTestSchema` (Zod, camelCase domain model)
- `GuardrailTestWireSchema` (Zod, snake_case, `.passthrough()`)
- `guardrailTestFromWireFormat(wire)` mapper function
- SEC-001 note: caller must parse through `GuardrailTestWireSchema` before calling mapper

Domain type fields (camelCase):
- `id`, `behaviorRuleId`, `analysisId`, `filename`, `framework`, `language`,
  `code`, `rationale`, `status`, `protectedBehavior`, `boundaryScenario`,
  `detectionNote`
- `boundaryScenario`: object with `balance`, `rate`, `rawFee`, `currentResult`, `proposedResult`
  (all strings, preserving decimal precision)
- `status`: Zod type must be `z.literal("generated")` for the domain schema and wire schema,
  so Feature 6 can extend it to `z.enum(["generated", "applied", "failed"])` without breaking
  existing validated data

**REQ-004** — Loader extended  
`lib/review-workspace/loader.ts` must import `meridian-sample-guardrail-test.json`, parse it
through `GuardrailTestWireSchema`, and map it via `guardrailTestFromWireFormat`. The result
must be added to `MeridianReviewSession` as `guardrailTest: GuardrailTest`.

**REQ-005** — Page passes guardrailTest  
`app/page.tsx` must destructure `guardrailTest` from `getMeridianReviewSession()` and pass it
to `FindingsPane` as `guardrailTest={guardrailTest}`.

**REQ-006** — FindingsPane props extension  
`FindingsPane` must accept `guardrailTest?: GuardrailTest`. When absent the component renders
identically to its Feature 4 state.

**REQ-007** — Test Gap section content  
When `testCoverage === "uncovered"` and `guardrailTest` is present (and
`guardrailTest.behaviorRuleId` matches a rule referenced by the current finding), the Test Gap
section must display:
- A header "TEST GAP" using `--risk-high` color and the existing pane label conventions
- The text "No existing characterization test protects the current late-fee rounding behavior."
- Below: the existing test evidence (the fixture already provides this: LateFeeServiceTest
  evidence item of kind "test" with the misleading balance=1000 scenario)
- A "Generate Guardrail Test" button, styled as a secondary action button

**REQ-008** — Generate Guardrail Test action and transition  
Clicking "Generate Guardrail Test" must trigger a brief deterministic loading transition
(managed by local React state):
1. "Preparing characterization test…" (≥ 400 ms)
2. "Building boundary scenario…" (≥ 400 ms)
3. Transition to the `GuardrailTestView` component

Timing uses `setTimeout` in the client component. Exact durations: stage 1 at 0 ms (immediate
first message), stage 2 after 450 ms, view appears after 900 ms total. No fake token streaming.
No `setInterval`. Total wall-clock time ≤ 1.5 s.

**REQ-009** — GuardrailTestView component  
Create `app/components/GuardrailTestView.tsx` as a Client Component that accepts
`guardrailTest: GuardrailTest`. It must display:
- Header: "GUARDRAIL TEST" label + `guardrailTest.filename` in monospace
- "Coverage target" section: `guardrailTest.behaviorRuleId` pill + `guardrailTest.protectedBehavior`
- "Boundary scenario" section: a compact table or definition list showing
  `balance`, `rate`, `rawFee`, `currentResult`, `proposedResult`
- "Behavior baseline" section showing:
  - current behavior: `12.345 → 12.34` (RoundingMode.DOWN)
  - proposed behavior: `12.345 → 12.35` (RoundingMode.HALF_UP)
  - detection note text from `guardrailTest.detectionNote`
- "Generated test" section: read-only syntax-highlighted code block with the Java code
  from `guardrailTest.code`; a "Copy" button (clipboard API)
- "Rationale" section: `guardrailTest.rationale`
- Status row: `FIXTURE-DRIVEN` badge (not "AI generated"); clearly labeled as a development
  fixture, not live Bob output

No inline hardcoding of Java code in JSX — all content sourced from the domain model prop.

**REQ-010** — Copy button  
The "Copy" button in `GuardrailTestView` uses the `navigator.clipboard.writeText` API.
It must toggle its label to "Copied" for 2 seconds after success and must not throw if
the clipboard API is unavailable (silently catch).

**REQ-011** — No fake execution result  
The UI must NOT display "Test passed" or "Test failed". The detection note section must be
labeled "Expected detection" (not "Execution result"). No Maven invocation occurs.

**REQ-012** — Design language  
All new UI must follow the established Legacy Lens design language:
- Dark surfaces using `--surface-1` / `--surface-2` / `--surface-3`
- Border using `--border-subtle` / `--border-muted`
- Text using `--text-primary` / `--text-secondary` / `--text-muted`
- Labels: `text-xs uppercase tracking-widest font-medium`
- Monospace code in `font-mono text-xs` with `--text-code`
- No gradients, no animations beyond the transition defined in REQ-008, no emojis,
  no sparkle effects, no giant success cards
- The "Generate Guardrail Test" button is styled consistently with "Reveal Intent"
  (same height, same border treatment, same weight)
- After generation, the view is appended below the Test Gap section (not a modal, not
  a new page) — same inline-expansion pattern as `IntentPanel`

**REQ-013** — Fixture data integrity  
The fixture `meridian-sample-guardrail-test.json` must contain valid Java/JUnit 5 code
that is syntactically plausible for the frozen Meridian project's existing test conventions
(class structure mirrors LateFeeServiceTest; uses Mockito; asserts `lateFeeCharged` is
`new BigDecimal("12.34")`). It must use the 1500.00 balance, 0.00823 rate scenario.

**REQ-014** — Data flow  
Data flow must follow the established project pattern:
```
development fixture (JSON)
  → GuardrailTestWireSchema.parse()       [in loader.ts]
  → guardrailTestFromWireFormat()          [mapper]
  → GuardrailTest (domain model)           [domain type]
  → FindingsPane → GuardrailTestView       [UI]
```
No raw fixture JSON must reach any UI component.

**REQ-015** — Feature 6 migration path  
Feature 6 will replace the fixture with real Bob output. To enable this, `loader.ts` must
only import the fixture by path, and `GuardrailTestWireSchema` / `guardrailTestFromWireFormat`
must be re-usable. The UI components must only accept the domain type `GuardrailTest`.

---

## Canonical Test Body (fixture `code` field)

The Java/JUnit 5 characterization test in the fixture must be equivalent to:

```java
package com.meridian.billing;

import com.meridian.billing.billing.LateFeeService;
import com.meridian.billing.model.BillingAccount;
import com.meridian.billing.model.Customer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

/**
 * Characterization test — captures the current observable rounding behavior for BR-01.
 *
 * Scenario: balance=1500.00, rate=0.00823 → raw fee=12.345
 * Current behavior (RoundingMode.DOWN): lateFeeCharged == 12.34
 *
 * This test does NOT assert that 12.34 is the correct business value.
 * It asserts that the CURRENT behavior produces 12.34, so any future change
 * that alters this result will be detected explicitly rather than silently.
 *
 * Generated by Legacy Lens · BR-01 · Development fixture (not live Bob output)
 */
@ExtendWith(MockitoExtension.class)
class LateFeeRoundingCharacterizationTest {

    @Mock
    private BillingAccount account;

    @Mock
    private Customer customer;

    @InjectMocks
    private LateFeeService lateFeeService;

    @Test
    void br01_roundingDown_balance1500_distinguishesDownFromHalfUp() {
        // Arrange — balance=1500.00, 15 days late, no grace period, no hardship
        when(account.getOutstandingBalance()).thenReturn(new BigDecimal("1500.00"));
        when(account.getRawDaysLate()).thenReturn(15);
        when(account.isGraceEligible()).thenReturn(false);
        when(account.getCustomer()).thenReturn(customer);
        when(customer.isHardshipPlanActive()).thenReturn(false);

        // Act
        BigDecimal lateFeeCharged = lateFeeService.calculateLateFee(account);

        // Assert — 1500.00 × 0.00823 = 12.345 → RoundingMode.DOWN → 12.34
        // If RoundingMode.HALF_UP were applied instead, the result would be 12.35
        assertEquals(new BigDecimal("12.34"), lateFeeCharged,
            "BR-01 invariant: RoundingMode.DOWN must truncate 12.345 to 12.34, not round to 12.35");
    }
}
```

This is stored verbatim as the `code` string in the fixture (with `\n` escapes).

---

## Non-Requirements

- No real IBM Bob API invocation or live analysis pipeline.
- No modification of `demo/legacy-billing/**` (frozen fixture).
- No adding the characterization test to `demo/legacy-billing/src/test/**`.
- No Maven execution from the UI.
- No code editor widget (read-only display only).
- No tab navigation redesign.
- No Behavior Map implementation.
- No GitHub integration.
- No database or authentication.
- No fake token streaming or fake AI stage progression beyond the two-message transition.
- Do not display "Test passed" or "Test failed" (no execution occurs).
- No redesign of the existing DiffPane, ReviewHeader, or IntentPanel.
- Do not modify `lib/analysis/types.ts`, `parser.ts`, `review.ts`, `intent.ts`,
  `blast-radius.ts`, or `metadata.ts`.
- Do not modify any existing fixture JSON files.
- Do not modify Feature 1–4 tests.
- No new npm runtime dependencies.
- No `zod` import changes — `zod` is already in scope via existing code; re-use it.

---

## Affected Files

### Created (new files)

| File | Purpose |
|---|---|
| `lib/analysis/guardrail-test.ts` | Zod schemas, domain type `GuardrailTest`, wire schema, mapper |
| `lib/analysis/fixtures/meridian-sample-guardrail-test.json` | Development fixture for the generated characterization test |
| `app/components/GuardrailTestView.tsx` | Client Component — displays the generated test, boundary scenario, rationale |
| `app/__tests__/guardrail-test.test.tsx` | Vitest + Testing Library tests (TEST-401–TEST-414) |

### Modified (existing files)

| File | Change |
|---|---|
| `lib/review-workspace/loader.ts` | Import fixture + add `guardrailTest: GuardrailTest` to `MeridianReviewSession` |
| `app/page.tsx` | Destructure `guardrailTest` and pass to `FindingsPane` |
| `app/components/FindingsPane.tsx` | Accept `guardrailTest?` prop; render Test Gap section + Generate action; embed `GuardrailTestView` inline |

### Forbidden (must not be touched)

- `demo/legacy-billing/src/**`
- `demo/legacy-billing/pom.xml`
- `demo/legacy-billing/proposed-change.patch`
- `demo/legacy-billing/PROPOSED_CHANGE.md`
- `lib/analysis/types.ts`
- `lib/analysis/parser.ts`
- `lib/analysis/review.ts`
- `lib/analysis/intent.ts`
- `lib/analysis/blast-radius.ts`
- `lib/analysis/metadata.ts`
- `lib/analysis/__tests__/behavioral-contract.test.ts`
- `lib/analysis/__tests__/data-foundation.test.ts`
- `lib/analysis/fixtures/meridian-sample-review.json`
- `lib/analysis/fixtures/meridian-sample-contract.json`
- `lib/analysis/fixtures/meridian-sample-intent.json`
- `lib/analysis/fixtures/meridian-sample-metadata.json`
- `lib/analysis/fixtures/meridian-sample-blast-radius.json`
- `app/__tests__/review-workspace.test.tsx`
- `app/__tests__/reveal-intent.test.tsx`
- `.env` / `.env.*`

---

## Dependencies

No new npm dependencies. All required types and utilities already exist:
- `zod` — already in use in every `lib/analysis/*.ts` file
- `@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`, `vitest`
  — all in `devDependencies`
- `navigator.clipboard` — browser API, no dependency needed

---

## Test Requirements

All tests live in `app/__tests__/guardrail-test.test.tsx` and run in the Vitest happy-dom
environment. They use the real Meridian fixture data (including the new guardrail-test
fixture) via `getMeridianReviewSession()`.

| ID | Description | Type | REQ ref |
|---|---|---|---|
| TEST-401 | `GuardrailTestWireSchema.safeParse` passes on a valid wire object | unit | REQ-003 |
| TEST-402 | `GuardrailTestWireSchema.safeParse` fails when `behavior_rule_id` is missing | unit | REQ-003 |
| TEST-403 | `guardrailTestFromWireFormat` maps `behavior_rule_id` → `behaviorRuleId` (snake→camelCase) | unit | REQ-003 |
| TEST-404 | `meridian-sample-guardrail-test.json` passes `GuardrailTestWireSchema.safeParse` | unit | REQ-002 |
| TEST-405 | `getMeridianReviewSession()` returns a `guardrailTest` with `behaviorRuleId === "BR-01"` | integration | REQ-004 |
| TEST-406 | `FindingsPane` with `testCoverage: "uncovered"` and `guardrailTest` renders "TEST GAP" | component | REQ-007 |
| TEST-407 | `FindingsPane` renders a "Generate Guardrail Test" button when `guardrailTest` is provided | component | REQ-007 |
| TEST-408 | Clicking "Generate Guardrail Test" shows a loading/transition message | component | REQ-008 |
| TEST-409 | After transition completes, `GuardrailTestView` is rendered in the DOM | component | REQ-008, REQ-009 |
| TEST-410 | `GuardrailTestView` renders `guardrailTest.filename` | component | REQ-009 |
| TEST-411 | `GuardrailTestView` renders "BR-01" | component | REQ-009 |
| TEST-412 | `GuardrailTestView` code block contains "1500.00" (canonical scenario) | component | REQ-009, REQ-013 |
| TEST-413 | `GuardrailTestView` code block contains "12.34" (protected assertion) | component | REQ-009, REQ-013 |
| TEST-414 | `GuardrailTestView` does NOT render any text matching "Test passed" or "Test failed" | component | REQ-011 |

---

## Security Requirements

| ID | Description | Category |
|---|---|---|
| SEC-401 | `guardrailTest` data flows through `GuardrailTestWireSchema.parse()` in `loader.ts` before reaching any UI component | input-validation |
| SEC-402 | `GuardrailTestView` renders only typed `GuardrailTest` domain model fields — no raw JSON, no `dangerouslySetInnerHTML` | input-validation |
| SEC-403 | Copy button uses `navigator.clipboard.writeText` only; clipboard errors are silently caught; no side effects | configuration |
| SEC-404 | No external URLs, network I/O, or API calls introduced by this feature | configuration |

---

## Acceptance Criteria

| ID | Description | Auto |
|---|---|---|
| AC-501 | `npm test` exits 0: all prior tests (TEST-001–TEST-308) still pass; new tests TEST-401–414 pass | ✓ |
| AC-502 | `npm run lint` exits 0 with no new errors | ✓ |
| AC-503 | `tsc --noEmit` exits 0 | ✓ |
| AC-504 | `npm run build` exits 0 | ✓ |
| AC-505 | BR-01 finding detail shows "TEST GAP" section with "Generate Guardrail Test" button visible without scrolling | manual |
| AC-506 | Clicking "Generate Guardrail Test" shows at least one transitional message before the test view appears | manual |
| AC-507 | Generated test view shows `LateFeeRoundingCharacterizationTest.java` filename | manual |
| AC-508 | Generated test code block contains `balance=1500.00`, `rate=0.00823`, `12.345`, `12.34` | manual |
| AC-509 | Generated test view shows proposed behavior `12.35` and detection note | manual |
| AC-510 | UI does not display "Test passed" or "Test failed" | manual |
| AC-511 | The test view is labeled as a fixture-driven artifact (e.g. "FIXTURE-DRIVEN" badge) | manual |
| AC-512 | Existing "Reveal Intent" interaction remains functional | manual |
| AC-513 | DiffPane, ReviewHeader remain visually unchanged | manual |
| AC-514 | `git diff --name-only` shows no changes to `demo/legacy-billing/**` | ✓ |
| AC-515 | `guardrailTest` flows through `GuardrailTestWireSchema.parse()` (verifiable by code inspection of `loader.ts`) | ✓ |
| AC-516 | `GuardrailTestView` has no `dangerouslySetInnerHTML` usage | ✓ |

---

## Estimated Change Budget

| Measure | Estimate |
|---|---|
| Files created | 4 (`guardrail-test.ts`, `meridian-sample-guardrail-test.json`, `GuardrailTestView.tsx`, `guardrail-test.test.tsx`) |
| Files modified | 3 (`loader.ts`, `page.tsx`, `FindingsPane.tsx`) |
| Lines added | ~450 |
| Lines removed | ~0 (no existing code removed) |

---

## Risks

### R-1 — Timer-based transition in tests (Medium)

`REQ-008` requires `setTimeout` for the loading transition. Vitest + happy-dom can handle
fake timers (`vi.useFakeTimers()`) but the test for TEST-409 (view appears after transition)
must use `vi.advanceTimersByTime()` and then wait for re-render. If not handled carefully
the test will either see the pre-transition state or time out.

**Mitigation:** Use `vi.useFakeTimers()` + `vi.runAllTimersAsync()` or
`vi.advanceTimersByTime(1000)` + `await screen.findByText(...)` in TEST-408/409.
Add `vi.useRealTimers()` in `afterEach`.

### R-2 — `navigator.clipboard` unavailable in happy-dom (Low)

The copy button uses `navigator.clipboard.writeText`. happy-dom may not implement this.
The implementation must silently catch errors. No test need verify the clipboard actually
writes — only that the button renders and clicking it does not throw.

**Mitigation:** Wrap in `try/catch`; no test exercises the clipboard write itself.

### R-3 — BR-01 `test_coverage: "covered"` in contract fixture vs. "uncovered" in finding (Low)

The contract marks BR-01 `test_coverage: covered`; the review finding marks it `uncovered`.
The Test Gap section must be triggered by the **finding's** `testCoverage` field, not the
contract rule's field. This is already how `FindingDetail` works. No fixture changes needed.

**Mitigation:** Test Gap render condition: `finding.testCoverage === "uncovered"`.

### R-4 — GuardrailTestView inline vs. modal layout (Low)

Inline expansion (matching IntentPanel's `max-height` transition) is the correct pattern.
A modal would require z-index management and break the established design pattern.

**Mitigation:** Non-requirements section and REQ-012 explicitly mandate the inline pattern.

### R-5 — Scope creep: real execution or file-write (Low)

The Generate action must not attempt to write to `demo/legacy-billing/` or invoke Maven.

**Mitigation:** REQ-011 explicitly prohibits fake/real execution results. Forbidden paths
in the contract prevent touching the Java fixture.

### R-6 — Java code string in JSON (Low)

The `code` field will contain multi-line Java with `\n` escape sequences. JSON serialization
is standard; no special handling needed. The `<pre>` / `<code>` block in React renders
newlines correctly.

**Mitigation:** Test TEST-412/TEST-413 verify the specific strings appear in the rendered DOM.

---

## Implementation Notes

### Where the Test Gap section lives in FindingsPane

The Test Gap section replaces/expands the existing "No characterization test" block inside
`FindingDetail`. Currently the finding detail shows a 2-column grid with Confidence and Test
Coverage cards. The Test Gap section will be inserted **below** this grid (not replacing it),
so the coverage card still shows "No characterization test" but the Test Gap section provides
the deeper explanation and action.

### GuardrailTestView placement

The `GuardrailTestView` is appended after the Test Gap section (inline in the `FindingDetail`
scroll area), using the same CSS `max-height` transition pattern as `IntentPanel`. No modal,
no new page, no tab.

### `FindingsPane` state additions

Two new pieces of local state are needed in `FindingsPane` (or optionally in `FindingDetail`
sub-component):
1. `showGuardrailTest: boolean` — whether the test view is rendered
2. `guardRailGenerating: 'idle' | 'stage1' | 'stage2' | 'done'` — transition state

The transition messages are:
- `stage1`: "Preparing characterization test…"
- `stage2`: "Building boundary scenario…"
- `done`: renders `GuardrailTestView`

Since `FindingDetail` already receives `showIntent` / `onToggleIntent` as props, the
same pattern applies: `showGuardrailTest`, `onGenerateGuardrailTest` can be passed down.
Alternatively, since the timer state is localized to the action, it can live entirely
inside `FindingDetail` itself (no prop needed for the state machine — only `guardrailTest`
needs to be passed down as data). This is the preferred approach as it avoids additional
prop-drilling.

### Data consistency note for the fixture

The `boundary_scenario.balance` must be `"1500.00"` (not `1500`), to preserve decimal
precision as strings. All scenario values should be strings, not numbers, to avoid
floating-point ambiguity in JSON display.

### `analysis_id` alignment

The new fixture uses `analysis_id: "meridian-sample-20260829"` matching all other fixtures
so that Feature 6 can correlate generated tests to analysis runs.
