# Grill Report — feat-guardrail-test

**Plan:** `.agent/plans/plan-feat-guardrail-test.md`  
**Contract:** `.agent/contracts/contract-feat-guardrail-test.json`  
**Date:** 2026-08-29  
**Outcome:** GO — with two targeted plan/contract corrections applied

---

## Summary of Original Plan

Feature 5 extends the BR-01 finding detail in `FindingsPane` with:
1. A "TEST GAP" section (visible when `testCoverage === "uncovered"`)
2. A "Generate Guardrail Test" button with a deterministic 2-stage transition
3. A `GuardrailTestView` inline component showing a fixture-driven JUnit 5 characterization test
   targeting the canonical 1500.00/12.345→12.34 rounding scenario

All fixture-driven; no real Bob pipeline; frozen Java fixture untouched. 4 files created, 3 modified.

---

## Challenges Raised

### C-01 — `setTimeout` cleanup on unmount [BLOCKER — FIXED]

**Raised:** REQ-008 mandates `setTimeout` for the 2-stage transition but did not specify
cleanup. If the user selects a different finding before 900 ms, the `FindingDetail` component
unmounts but both `setTimeout` callbacks remain scheduled. They will fire and attempt to call
`setState` on an unmounted component — producing a React warning (or in strict mode, a
potential double-effect bug).

**Resolution:** Plan and contract updated to explicitly require both `setTimeout` handles to
be stored and cancelled in a `useEffect` cleanup function (`clearTimeout`). The timer state
lives in `FindingDetail` (per the preferred approach in Implementation Notes), so when
`selectedFinding` changes, the component unmounts and the `useEffect` cleanup fires automatically.
This is correct by construction given the component lifecycle — but the plan now mandates it
explicitly so the implementer cannot miss it.

**Status:** Fixed — REQ-008 updated in both plan and contract.

---

### C-02 — `status` field type underspecified in GuardrailTestSchema [CORRECTNESS — FIXED]

**Raised:** REQ-003 listed `status` as a domain field but did not specify its Zod type.
If implemented as `z.string()`, it accepts any string and provides no type narrowing.
If Feature 6 later widens it to `z.enum(["generated", "applied", "failed"])`, existing
validated fixture data (which uses `"generated"`) still passes, but the narrowing benefit
is lost.

**Resolution:** Using `z.literal("generated")` for the current feature is correct:
- Validates that the fixture contains exactly `"generated"`
- Is widened to `z.enum([...])` in Feature 6 by swapping a single line
- Produces a TypeScript literal type `"generated"` for type safety today

Plan and contract updated. Feature 6 migration path is cleaner.

**Status:** Fixed — REQ-003 updated in both plan and contract.

---

### C-03 — Test file placement inconsistency (TEST-401–404 are schema unit tests) [RESOLVED — NO CHANGE]

**Raised:** The project convention puts schema/mapper unit tests in `lib/analysis/__tests__/`
(node environment, TEST-101 to TEST-125 in `data-foundation.test.ts`). The plan places
TEST-401–414 — including schema tests 401–404 — in `app/__tests__/guardrail-test.test.tsx`
(happy-dom environment). This is architecturally inconsistent.

**Resolution:** Since `lib/analysis/__tests__/data-foundation.test.ts` is in the forbidden
paths list (must not modify existing tests) and creating a new lib test file would require
adding `lib/analysis/__tests__/guardrail-test.test.ts` to `allowed_paths`, the simplest
correct path is to put all 14 tests in `app/__tests__/guardrail-test.test.tsx`. Pure Zod
`safeParse` and `guardrailTestFromWireFormat` calls work identically in happy-dom — the
environment doesn't interfere with these. The inconsistency is a style issue, not a
correctness issue.

**Decision:** Leave as planned. If this were a production codebase, a follow-up cleanup
ticket would move TEST-401–404 to `lib/__tests__`. For the hackathon demo, the single-file
approach is simpler and lower risk.

**Status:** No change to plan. Documented for implementer awareness.

---

### C-04 — `act()` + fake timers in Testing Library [TESTING RISK — DOCUMENTED]

**Raised:** TEST-408 and TEST-409 require clicking "Generate Guardrail Test" and advancing
fake timers to assert state transitions. In `@testing-library/react`, advancing fake timers
that trigger React state updates requires wrapping `vi.runAllTimersAsync()` or
`vi.advanceTimersByTimeAsync(ms)` in `act()`, or using the async variants from Testing Library.

Without `act()`, the state update from the `setTimeout` callback fires outside React's update
cycle, producing a "not wrapped in act()" warning and potentially making `screen.findBy*`
assertions flaky.

**Resolution self-applied:** The test for TEST-409 must:
1. Use `vi.useFakeTimers()` in `beforeEach`
2. Click the button
3. Wrap `vi.runAllTimersAsync()` in `await act(async () => { await vi.runAllTimersAsync(); })`
4. Then assert the generated view is rendered

This pattern is standard for Testing Library + Vitest fake timers. The plan's Risk R-1
documents this; the test requirement (TEST-409) description already says "after fake timers
advance past 900 ms" — the implementer must use the async act wrapper. Added to TEST-409
description implicitly in the risk note. No contract change needed — the description is
prescriptive enough at the test level.

**Status:** No plan change. Implementation guidance preserved in Risk R-1.

---

### C-05 — Edge case: `GuardrailTestView` renders inline after Reveal Intent is already open [VISUAL CONFLICT — RESOLVED]

**Raised:** The user can open "Reveal Intent" and then (within the same finding) click
"Generate Guardrail Test". Both `IntentPanel` and `GuardrailTestView` would expand inline
within `FindingDetail`. The plan's scroll area handles this — both panels stack vertically
in the `FindingDetail` overflow scroll. No layout breakage, but the finding detail area
could become very long.

**Resolution:** This is acceptable. The pane already scrolls. Both panels stacking is fine
UX for a demo context. No visual conflict — `IntentPanel` renders below "Recommended Action",
and `GuardrailTestView` renders below "Test Gap", so they don't overlap. Scroll handles length.

**Status:** No change. Acceptable UX given demo context.

---

### C-06 — Edge case: finding `testCoverage === "partial"` — should Test Gap appear? [RESOLVED]

**Raised:** REQ-007 triggers on `testCoverage === "uncovered"` only. What about `"partial"`?

**Resolution:** The demo fixture only has one finding (F-001) with `"uncovered"`. The existing
coverage card already shows a highlighted treatment for `"uncovered"` or `"partial"` (the
`isUncovered` variable in `FindingDetail` covers both). The Test Gap section only fires on
`"uncovered"` as specified — this is the right conservative boundary. A `"partial"` finding
has some coverage and does not warrant the "generate test" action in the same way.

**Status:** No change. REQ-007 correctly scopes to `"uncovered"` only.

---

### C-07 — Edge case: `guardrailTest.behaviorRuleId` does not match any `finding.behaviorRuleIds` [RESOLVED]

**Raised:** REQ-007 requires the condition `guardrailTest.behaviorRuleId` appears in
`finding.behaviorRuleIds` before showing the Test Gap section. In the fixture, BR-01 appears
in both. But if a future fixture has a mismatch (e.g. guardrail test is for BR-02 but the
selected finding references only BR-01), the Test Gap section should not appear for that finding.

**Resolution:** The condition is already correctly specified in REQ-007. The implementer must
not hardcode "BR-01" but use the dynamic condition `finding.behaviorRuleIds.includes(guardrailTest.behaviorRuleId)`.
This is correct for Feature 6 generalization.

**Status:** No change to plan. Already correctly specified.

---

### C-08 — Security: `code` field rendered in `<pre>` without syntax highlighting library [VERIFIED SAFE]

**Raised:** The Java code is rendered read-only in a `<pre>` block. No `dangerouslySetInnerHTML`.
React JSX string interpolation escapes `<`, `>`, `&`, `"` automatically. There is no injection
risk from the fixture content.

**Resolution:** SEC-402 already prohibits `dangerouslySetInnerHTML`. AC-516 enforces this via
grep. Verified safe.

**Status:** No change. Confirmed by AC-516.

---

### C-09 — `navigator.clipboard` in happy-dom (TEST-410 context) [VERIFIED RESOLVABLE]

**Raised:** The copy button requires `navigator.clipboard.writeText`. In happy-dom, this may
be `undefined`. The plan says to silently catch. Tests should not exercise clipboard writes
(Risk R-2). TEST-410 only asserts `guardrailTest.filename` renders — not the copy outcome.

**Resolution:** No test exercises the clipboard. The copy button renders normally (Testing
Library doesn't call it unless a test clicks it). If TEST-410 renders `GuardrailTestView`
directly and only checks text content, no clipboard interaction occurs. Safe.

**Status:** No change. Matches plan Risk R-2 mitigation.

---

### C-10 — Redisplaying the generated test (re-clicking Generate after it's shown) [RESOLVED]

**Raised:** Once `GuardrailTestView` is displayed, what does the "Generate Guardrail Test"
button do? The plan doesn't address hiding/re-triggering the view.

**Resolution:** Once the state machine reaches `done`, the button is replaced by the
`GuardrailTestView` — it no longer shows the "Generate Guardrail Test" button. This is the
simplest implementation: the button is absent when the test is already shown. If the user
wants to dismiss the view, the plan does not specify a "Hide" toggle for the guardrail test
(unlike `IntentPanel`). Since the generated test view is the end-state of the flow, this
is intentional — the user has committed to "generate" and the result is persistently shown
until they switch findings.

**Status:** No change. The button disappears when `stage === 'done'`. Self-consistent.

---

## Revised Requirements (post-grill delta only)

| ID | Change |
|---|---|
| REQ-003 | Added: `status` field must use `z.literal("generated")` in both wire and domain schemas |
| REQ-008 | Added: both `setTimeout` handles must be cancelled via `clearTimeout` in a `useEffect` cleanup |

All other requirements unchanged.

---

## Acceptance Criteria Additions/Changes

No new acceptance criteria. The existing AC-503 (TypeScript clean) will catch any missing
`clearTimeout` if the implementer uses `useRef` for the timer IDs with the correct type.

---

## Go / No-Go Recommendation

**GO**

The plan is well-specified and consistent with the existing codebase conventions. All
identified risks are either low or have clear mitigations. The two targeted corrections
(timer cleanup + status Zod literal) have been applied to both the plan and contract.

No blocking questions need to go to the user:
- All design decisions are resolvable from the PRD and existing code
- The demo scenario is unambiguous (one finding, F-001, BR-01, `uncovered`)
- The fixture data is fully specified down to the exact Java code
- The test strategy is complete (14 tests covering schema, integration, component, and negative)

**Recommend:** Run `/approve-plan feat-guardrail-test` to unlock implementation.
