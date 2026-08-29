# Plan: Feature 4 — Reveal Intent

**Feature ID:** `feat-reveal-intent`  
**Status:** Draft  
**PRD references:** FR-004, FR-016, US-008, §8 Demo Story Step 4, §19.6

---

## Objective

Add a "Reveal Intent" interaction to the existing Core Review Workspace (FindingsPane right
pane) that, when activated from the selected BR-01 finding, expands a structured intent panel
showing business role, behavioral invariants, related rules, dependencies, evidence, and
confidence — sourced from the existing `meridian-sample-intent.json` development fixture via
the established fixture→Zod→mapper→domain-model→UI pipeline.

---

## Requirements

**REQ-001** — Reveal Intent trigger  
The `FindingsPane` must contain a visually prominent "Reveal Intent" button/action. It must be
discoverable on the F-001 finding detail without scrolling on a 1280 px viewport.

**REQ-002** — Intent loading in `loader.ts`  
`lib/review-workspace/loader.ts` must be extended to load `meridian-sample-intent.json`,
parse it through `RevealIntentWireSchema`, and map it via `intentFromWireFormat`.
The resulting `RevealIntent` domain object must be exported as part of
`MeridianReviewSession`. No raw JSON access beyond the parse step.

**REQ-003** — Propagate `intent` through page  
`app/page.tsx` must pass `intent` (type `RevealIntent`) as a prop to `FindingsPane`.

**REQ-004** — `FindingsPane` props extension  
`FindingsPane` must accept an optional `intent?: RevealIntent` prop. When `intent` is
absent the component renders identically to the current Feature 3 state.

**REQ-005** — Reveal Intent panel (new `IntentPanel` component)  
Create `app/components/IntentPanel.tsx` as a Client Component. Rendered inside
`FindingsPane` when the user activates the "Reveal Intent" action and `intent` is
present. Must display:
  - **Business Role** — `intent.businessRole` (prose)
  - **Intent Summary** — `intent.summary` (prose)
  - **Behavioral Invariants** — `intent.invariants` (bullet list)
  - **Behavioral Rules** — `intent.relatedBehaviorRuleIds` (pill list with short labels
    resolved from `contract.rules`)
  - **Dependencies** — `intent.dependencies` (compact list)
  - **Confidence** — formatted via `formatConfidence()` (existing shared utility)
  - **Evidence** — `intent.evidence` items rendered with the same pattern as
    `EvidenceList` in `FindingsPane`: file, symbol, line range, kind, excerpt  
  No section may hardcode domain text; all content comes from the domain model.

**REQ-006** — Observed / inferred distinction  
The IntentPanel must visibly distinguish:
  - **Observed** facts (invariants, evidence items from source/test/dependency kind)
  - **Inferred** elements (intent summary, business role label with a small "inferred"
    badge)  
  Use a subtle inline label such as `INFERRED` next to the summary and business-role
  value. Do not suppress either kind; distinguish them visually.

**REQ-007** — Toggle behaviour  
The "Reveal Intent" action is a toggle. A second activation collapses the panel.
The button label must change from "Reveal Intent" to "Hide Intent" when the panel is
open. Panel open/closed state is local React state inside `FindingsPane`.

**REQ-008** — Transition  
Reveal Intent is called out in the PRD as the demo "wow" moment. The panel entry must
use a smooth CSS-transition-based reveal (e.g. `max-height` or `opacity+translateY`).
Motion must be:
  - entry ≤ 250 ms ease-out
  - exit ≤ 150 ms ease-in
  - no JavaScript animation libraries; CSS transitions only
  - no layout shift in the diff or header area

**REQ-009** — Tests (TEST-301 through TEST-308)  
See Test Requirements section below.

**REQ-010** — BR-01 specific rounding information  
The IntentPanel must surface the following BR-01 specific facts when the intent fixture
data is present:  
  - The business role of `LateFeeService.calculateLateFee` (from `intent.businessRole`)  
  - At minimum the first behavioral invariant (from `intent.invariants[0]`)  
  - Confidence rendered via `formatConfidence()` using `intent.confidence`  
  - Evidence for `MoneyUtils.roundLateFee` (file path + symbol visible)  
  - Related rule ID "BR-01" visible  
  All of these are satisfied by REQ-005 as long as the fixture data is present; no
  special-casing for BR-01 in the component code.

---

## Non-requirements

- No real Bob analysis pipeline.
- No repository scanning, Java parsing, or git-diff generation.
- No redesign of the Core Review Workspace layout.
- No Behavior Map, graph library, or blast-radius visualization in this feature.
- No chat interface.
- No Generate Guardrail Test button.
- No new npm runtime dependencies.
- No API routes or database.
- No multi-intent support (UI handles one RevealIntent per workspace session).
- Do not modify `lib/analysis/types.ts`, `parser.ts`, `blast-radius.ts`, `review.ts`,
  `intent.ts`, or `metadata.ts`.
- Do not modify any `lib/analysis/fixtures/*.json` file.
- Do not modify `demo/legacy-billing/**`.
- Do not modify existing Feature 1/2 tests.
- Do not rebuild `EvidenceList` — share logic by extracting it or copying the
  minimal-render pattern into `IntentPanel`.
- No loading/progress UI.
- No Behavior Map tab implementation.
- No before/after behavior comparison.
- No filter system.

---

## Affected Files

### Created (new files)

| File | Purpose |
|---|---|
| `app/components/IntentPanel.tsx` | Client Component — structured intent panel content |
| `app/__tests__/reveal-intent.test.tsx` | Vitest+Testing Library tests (TEST-301–308) |

### Modified (existing files)

| File | Change |
|---|---|
| `lib/review-workspace/loader.ts` | Add `intent` field to `MeridianReviewSession`; load and parse `meridian-sample-intent.json` |
| `app/page.tsx` | Pass `intent` prop to `FindingsPane` |
| `app/components/FindingsPane.tsx` | Accept `intent?` prop; render "Reveal Intent" toggle; render `IntentPanel` conditionally |

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
- `lib/analysis/fixtures/*.json`
- `.env` / `.env.*`

---

## Dependencies

No new npm dependencies. All required types and utilities already exist:
- `RevealIntent`, `RevealIntentWireSchema`, `intentFromWireFormat` — `lib/analysis/intent.ts`
- `formatConfidence` — `lib/review-workspace/confidence.ts`
- `BehavioralContract` — `lib/analysis/types.ts`
- Testing: `@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`,
  `vitest` — all already in `devDependencies`

---

## Implementation Notes (Resolved Design Decisions)

### Pattern choice: Expanding panel inside FindingsPane right column

The workspace is a fixed 50/50 split: `DiffPane` (left) and `FindingsPane` (right).
`FindingsPane` already has a vertically scrollable `FindingDetail` section. The
"Reveal Intent" panel will be inserted **inside** the `FindingDetail` scroll area,
below the finding's recommended action, within the right pane's existing layout.

Rationale:
- Does not move or resize the DiffPane
- Consistent with the existing "investigative layer over the workspace" direction
- The right pane already scrolls so a long intent panel does not break layout
- Avoids creating a floating side-sheet that requires z-index management

The IntentPanel is rendered inline (inside the `FindingDetail` scroll container),
activated by the toggle button.

### EvidenceList reuse

`EvidenceList` in `FindingsPane.tsx` is a private function. Rather than making it
public and cross-importing, `IntentPanel.tsx` will implement an `IntentEvidenceList`
using the same visual pattern (shared CSS token usage, same layout structure). The
shared logic (formatting functions: `shortFilePath`, `formatLineRange`) will be
extracted to `lib/review-workspace/evidence-format.ts` so both components import
from the same source without circular deps.

Alternative considered: keep them inline in each component separately — rejected
because it duplicates logic that tests verify.

Concretely:
- Extract `shortFilePath` and `formatLineRange` to `lib/review-workspace/evidence-format.ts`
- Update `FindingsPane.tsx` to import from there (replaces its private copies)
- `IntentPanel.tsx` also imports from there

This adds one extra created file. The overall approach stays minimal.

### Inferred vs. Observed distinction

- `businessRole` → labeled `INFERRED` with a muted pill/badge
- `summary` → labeled `INFERRED`
- `invariants` → labeled `OBSERVED` (these are extracted directly from source)
- `evidence` items → labeled by their `kind` field (source/test/dependency/change)

The labels use the existing muted-text convention from the design system.

### Confidence display

Reuse `formatConfidence()` from `lib/review-workspace/confidence.ts` identically to
how `FindingDetail` uses it. No new formatting logic.

### Tab nav — not implemented

The PRD §19.3 defines Review/Intent/Behavior Map/Tests tabs. Feature 3 only built
the Review tab content. Feature 4's "Reveal Intent" is an inline interaction within
the Review tab, not a separate tab navigation. The tab nav is out of scope for this
feature (it would require a layout redesign).

---

## Test Requirements

All tests live in `app/__tests__/reveal-intent.test.tsx` and run in the `app` Vitest
project (happy-dom environment). They use the real Meridian fixture data (loaded via
`getMeridianReviewSession()`).

| ID | Description | Type | REQ ref |
|---|---|---|---|
| TEST-301 | `FindingsPane` renders a "Reveal Intent" button when `intent` is provided | component | REQ-001 |
| TEST-302 | Activating "Reveal Intent" causes the intent panel to appear in the DOM | component | REQ-005, REQ-007 |
| TEST-303 | `IntentPanel` renders `intent.businessRole` text | component | REQ-005 |
| TEST-304 | `IntentPanel` renders at least the first behavioral invariant from `intent.invariants` | component | REQ-005 |
| TEST-305 | `IntentPanel` renders confidence using `formatConfidence()` — for score 0.95 output contains "95%" | component | REQ-005 |
| TEST-306 | `IntentPanel` renders an evidence item containing "MoneyUtils.java" | component | REQ-005 |
| TEST-307 | `IntentPanel` renders "BR-01" from `intent.relatedBehaviorRuleIds` | component | REQ-005 |
| TEST-308 | Activating "Reveal Intent" a second time removes the intent panel from the DOM (toggle) | component | REQ-007 |

---

## Security Requirements

| ID | Description | Category |
|---|---|---|
| SEC-301 | `intent` data flows through `RevealIntentWireSchema.parse()` in `loader.ts` before reaching any UI component | input-validation |
| SEC-302 | `IntentPanel` renders only typed `RevealIntent` domain model fields — no raw JSON or user input | input-validation |
| SEC-303 | No external URLs, network I/O, or API calls introduced by this feature | configuration |

---

## Acceptance Criteria

| ID | Description | Auto |
|---|---|---|
| AC-401 | `npm test` exits 0: all prior tests (TEST-001–TEST-210) still pass, new tests TEST-301–308 pass | ✓ |
| AC-402 | `npm run lint` exits 0 with no new errors | ✓ |
| AC-403 | `tsc --noEmit` exits 0 | ✓ |
| AC-404 | `npm run build` exits 0 | ✓ |
| AC-405 | "Reveal Intent" button is visible in the FindingsPane when F-001 is selected | manual |
| AC-406 | Clicking "Reveal Intent" reveals a panel with business role text from the fixture | manual |
| AC-407 | Panel shows at least one behavioral invariant | manual |
| AC-408 | Panel shows evidence with MoneyUtils.java path visible | manual |
| AC-409 | Panel shows related rule "BR-01" | manual |
| AC-410 | Confidence displays as 95% | manual |
| AC-411 | Button label changes from "Reveal Intent" to "Hide Intent" when panel is open | manual |
| AC-412 | Clicking "Hide Intent" collapses the panel | manual |
| AC-413 | Panel reveal uses a visible CSS transition ≤ 250 ms | manual |
| AC-414 | `git diff --name-only` shows no changes to `demo/legacy-billing/**` | ✓ |
| AC-415 | `intent` data flows through `RevealIntentWireSchema.parse()` (verifiable by code inspection in `loader.ts`) | ✓ |
| AC-416 | DiffPane and ReviewHeader remain visually unchanged after Reveal Intent is open | manual |

---

## Estimated Change Budget

| Measure | Estimate |
|---|---|
| Files created | 3 (`IntentPanel.tsx`, `reveal-intent.test.tsx`, `evidence-format.ts`) |
| Files modified | 3 (`loader.ts`, `page.tsx`, `FindingsPane.tsx`) |
| Lines added | ~380 |
| Lines removed | ~15 (private helpers moved out of `FindingsPane`) |

---

## Risks

### R-1 — Test coupling to toggle interaction (Medium)

The toggle test (TEST-302, TEST-308) must fire a `userEvent.click` and assert DOM
state change. In Vitest/happy-dom, CSS transitions do not execute — the DOM update
is immediate. This is acceptable but means the transition itself cannot be
automatically tested. Risk: tests assert presence/absence of the panel; visual
quality of the transition is manual-only.

**Mitigation:** Mark AC-413 as manual. Tests assert DOM mutation, not CSS.

### R-2 — `FindingsPane` client-component props growth (Low)

Adding `intent?` to `FindingsPane` props is backward-compatible (optional). The
parent `page.tsx` passes it from the session. Risk of prop-drilling is limited to
one additional field.

**Mitigation:** Keep `intent` optional so the component degrades correctly when
the fixture is absent.

### R-3 — EvidenceList helper extraction (Low)

Moving `shortFilePath` and `formatLineRange` out of `FindingsPane` into
`evidence-format.ts` modifies an existing file. Risk: breaking the currently-passing
TEST-209 (evidence path) or TEST-211.

**Mitigation:** The functions are pure (no side effects); moving them is a
safe refactor. Tests test rendered output, not import paths. Add regression test
TEST-301 before making any changes to FindingsPane to ensure baseline passes.

### R-4 — Scope creep: "Behavior Map" or tab nav (Medium)

The PRD mentions tabs and behavior map. This feature must not implement them.

**Mitigation:** Non-requirements section explicitly excludes tabs, behavior map,
blast-radius visualization. Contract `forbidden_paths` does not list new route files.

### R-5 — Inferred vs. observed distinction interpretation (Low)

The PRD requires distinguishing inferred intent from verified facts. The fixture
does not carry per-field epistemic labels. The plan resolves this by convention:
`businessRole` and `summary` are labeled INFERRED; `invariants` and evidence items
are labeled OBSERVED/by kind. Risk: reviewers may disagree.

**Mitigation:** This resolution is explicit in the plan and contract. The labels are
visual only; they do not affect data validation.
