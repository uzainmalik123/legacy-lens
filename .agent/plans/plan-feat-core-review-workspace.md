# Plan: Feature 3 — Core Review Workspace

**Feature ID:** `feat-core-review-workspace`  
**Status:** draft  
**Author:** Feature Planner  
**Date:** 2026-08-29

---

## Objective

Build the primary Legacy Lens review screen that renders the canonical Meridian proposed
change alongside its behavior-aware risk findings, using the deterministic fixture data
from Features 1 and 2. This feature is UI + presentation only. No Bob analysis pipeline.

---

## Requirements

### REQ-001 — App layout and metadata
Replace the default Next.js boilerplate in `app/layout.tsx` with a Legacy Lens product
layout: correct `<title>` and `<meta>` description, retain font loading (`--font-geist-sans`,
`--font-geist-mono`), ensure `min-h-screen` structure so the workspace fills the viewport.

### REQ-002 — Global CSS
Extend `app/globals.css` to add CSS custom properties for the Legacy Lens design system:
risk-level semantic colors (`--risk-critical`, `--risk-high`, `--risk-medium`, `--risk-low`,
`--risk-info`), surface tokens (`--surface-1`, `--surface-2`), and border token. Register
them in the `@theme inline` block for Tailwind token access. Dark-mode variants for all tokens.

### REQ-003 — Fixture loader module
Create `lib/review-workspace/loader.ts` — a pure module (no Next.js I/O, no `fetch`) that
imports the four Meridian fixtures as JSON, runs each through the appropriate wire-format
schema (`ReviewReportWireSchema`, `BehavioralContractWireSchema`, `AnalysisMetadataWireSchema`),
maps them to domain models via the existing `reviewFromWireFormat`, `fromWireFormat`,
`metadataFromWireFormat` functions, and exports a single `getMeridianReviewSession()` function
returning `{ report: ReviewReport, contract: BehavioralContract, metadata: AnalysisMetadata }`.

**This is the only file that may import fixtures directly. All UI components receive typed
domain models — no raw JSON, no re-parsing.**

### REQ-004 — Deterministic diff data module
Create `lib/review-workspace/diff.ts` — a pure module exporting the deterministic
`MeridianDiff` constant that encodes the MoneyUtils.java rounding change as a typed
`DiffFile` structure. This module must NOT read the patch file from disk; the diff content
is embedded as deterministic fixture data derived from the known fixture content.

The `DiffFile` type must include:
- `filename: string` — the Java source path
- `hunks: DiffHunk[]` — one or more hunks, each with:
  - `header: string` — the `@@ ... @@` hunk header
  - `lines: DiffLine[]` — each line having:
    - `type: "context" | "added" | "removed"`
    - `lineNumber: { before?: number, after?: number }` — 1-based
    - `content: string` — the source line (without leading `+`/`-`)

The diff must include:
- `RoundingMode.DOWN` as a removed line (line 18 before, no after)
- `RoundingMode.HALF_UP` as an added line (no before, line 18 after)
- Enough surrounding context lines (≥ 4 context lines each side) for the change to be
  understood without reading the file

### REQ-005 — Review workspace page
Replace `app/page.tsx` with the Legacy Lens review workspace. The page is a **Server
Component** (no `"use client"` at the page level). It loads the Meridian session via
`getMeridianReviewSession()` and passes typed props to client components where interactivity
is needed.

Page structure:
```
<ReviewWorkspaceLayout>
  <ReviewHeader />          ← server-rendered, compact
  <main: split-pane>
    <DiffPane />            ← left pane
    <FindingsPane />        ← right pane, client component for selection state
  </main>
</ReviewWorkspaceLayout>
```

### REQ-006 — ReviewHeader component
Create `app/components/ReviewHeader.tsx` (Server Component).

Must render:
- Legacy Lens wordmark/name (text, not image — to avoid SVG/image complexity)
- Repository: `demo/legacy-billing`
- Change target: `proposed-change` (from metadata `targetRevision`)
- Affected file: `MoneyUtils.java` (shortened filename)
- Overall risk badge: severity level with semantic color
- Analysis status indicator

Must NOT be a landing-page hero. Must be compact (≤ 48px tall on desktop).

### REQ-007 — DiffPane component
Create `app/components/DiffPane.tsx` (Server Component).

Must render:
- Filename label (full relative Java path)
- Hunk header
- All diff lines with:
  - Line number column(s) — before and after, greyed out context / absent for add/remove
  - Removed lines: styled with red left-border accent, slightly dimmed red background tint
  - Added lines: styled with green left-border accent, slightly dimmed green background tint
  - Context lines: neutral, clearly secondary
  - Inline token highlighting for `RoundingMode.DOWN` (removed) and `RoundingMode.HALF_UP`
    (added) — bold weight or contrasting text, to make the one-token change visually obvious
- Code rendered in monospace font (`--font-geist-mono`)
- No external diff library

The diff must feel like serious developer tooling — tight line-height, dense, code-oriented.

### REQ-008 — FindingsPane component
Create `app/components/FindingsPane.tsx` (`"use client"` — needs selection state).

Must render:
- Finding list (from `ReviewReport.findings`)
- Default selected finding: index 0 (F-001, the BR-01 rounding finding)
- Selected finding detail panel showing:
  - Severity badge (semantic color, `high`)
  - Title
  - Affected behavior rule ID(s) — linked to rule title from `BehavioralContract.rules`
  - Summary
  - Business impact
  - Confidence: numeric % + `confidenceLabel()` band (high/medium/low) — must use the
    shared `confidenceLabel()` from `lib/analysis/types.ts`, not re-implement
  - Test coverage status — `uncovered` must be visually prominent and labeled clearly as
    "No characterization test" or equivalent — this is a key demo beat
  - Evidence list (each item shows: source filename, symbol when present, line range when
    present, kind badge when useful, excerpt when present)
  - Recommended action

### REQ-009 — Confidence display utility
Create `lib/review-workspace/confidence.ts` — a thin UI utility exporting:
- `formatConfidencePct(score: number): string` — e.g. `"96%"`
- `confidenceBandLabel(level: ConfidenceLevel): string` — e.g. `"High confidence"`

This module must import and use `confidenceLabel()` from `lib/analysis/types.ts`. It must
not duplicate the threshold logic. No new threshold definitions allowed.

### REQ-010 — Finding–rule cross-reference
`FindingsPane` must look up the `BehavioralRule` for each `behaviorRuleId` in the finding
from the passed `BehavioralContract`. When the rule is found, its `title` must be displayed
alongside the rule ID. Neither the finding title nor the rule title may be hardcoded inside
the component — they come from domain model props.

### REQ-011 — Evidence rendering
For each `BehavioralEvidence` item in the active finding, render a compact evidence row:
- Source path (last two path segments shown, full path in `title` attribute for hover)
- Symbol name when present
- Line or line range when present (format: `L17–19` or `L51`)
- Kind indicator (`source`, `test`, `change`, `dependency`) — use a text tag, not an
  icon-only badge
- Excerpt when present — rendered in monospace, max 3 lines visible, no truncation of the
  critical `DOWN` / `HALF_UP` lines

### REQ-012 — Test coverage status rendering
`testCoverage: "uncovered"` must be rendered in a visually distinct state:
- Use the risk amber/red palette to signal danger
- Label must read as "No characterization test" or "Uncovered" with a clear explanatory
  note (e.g. "Existing tests do not catch this regression")
- Do NOT render a "Generate Guardrail Test" button — that is Feature 4

### REQ-013 — Vitest configuration update
Extend `vitest.config.ts` to also cover `app/**/__tests__/**/*.test.tsx` (or `.test.ts`)
with a `jsdom` environment. Keep the existing node-environment tests for `lib/**` unaffected.
Use workspace projects or environment override annotations.

### REQ-014 — Dev dependencies for component testing
Add to `devDependencies`:
- `@testing-library/react` (^16)
- `@testing-library/jest-dom` (^6)
- `@vitest/browser` is NOT required — use jsdom/happy-dom
- `jsdom` or `happy-dom` (whichever is smaller / simpler)
- `vitest` is already installed

These are the **only** new dev dependencies permitted. No runtime dependencies may be added.

### REQ-015 — UI component tests
Create `app/__tests__/review-workspace.test.tsx` with focused tests:

- **TEST-201**: `ReviewHeader` renders repository name `demo/legacy-billing`
- **TEST-202**: `ReviewHeader` renders risk level `high`
- **TEST-203**: `DiffPane` renders `RoundingMode.DOWN` (removed line)
- **TEST-204**: `DiffPane` renders `RoundingMode.HALF_UP` (added line)
- **TEST-205**: `FindingsPane` renders finding title for F-001
- **TEST-206**: `FindingsPane` renders severity `high` label
- **TEST-207**: `FindingsPane` confidence label uses `confidenceLabel()` — renders "High confidence" (not hardcoded)
- **TEST-208**: `FindingsPane` renders `uncovered` / missing test coverage indicator
- **TEST-209**: `FindingsPane` renders evidence path containing `MoneyUtils.java`
- **TEST-210**: `FindingsPane` renders BR-01 rule ID

Test architecture: render components in isolation with deterministic props derived from
fixture data (not re-parsed from JSON inside tests). Tests import domain-model fixtures
from `loader.ts` helpers or construct minimal valid objects.

---

## Non-Requirements (Explicit Exclusions)

- No real Bob analysis pipeline
- No repository scanning or Java source parsing
- No diff generation from git — diff is deterministic fixture data
- No `git` commands at runtime
- No "Generate Guardrail Test" button or action
- No Reveal Intent panel (Feature later)
- No Behavior Map or graph visualization
- No blast-radius visualization
- No loading/analysis-progress UI (data is synchronous fixture)
- No chat, comments, authentication, collaboration, settings, notifications
- No filter system, search, or complex keyboard shortcuts
- No API routes
- No database persistence
- No production deployment
- Do not modify demo/legacy-billing/src/**, pom.xml, proposed-change.patch, PROPOSED_CHANGE.md
- Do not modify lib/analysis/types.ts, parser.ts, behavioral-contract.test.ts, or meridian-sample-contract.json
- Do not modify lib/analysis/review.ts, intent.ts, blast-radius.ts, metadata.ts, or any fixture JSON
- Do not add runtime npm dependencies
- Do not add a second confidence threshold implementation

---

## Affected Files

### Created (new files)
```
app/components/ReviewHeader.tsx
app/components/DiffPane.tsx
app/components/FindingsPane.tsx
lib/review-workspace/loader.ts
lib/review-workspace/diff.ts
lib/review-workspace/confidence.ts
app/__tests__/review-workspace.test.tsx
```

### Modified (existing files)
```
app/page.tsx                 — replace boilerplate with review workspace
app/layout.tsx               — update metadata title/description
app/globals.css              — add Legacy Lens CSS design tokens
vitest.config.ts             — add jsdom environment for app/__tests__
package.json                 — add @testing-library/react, @testing-library/jest-dom, jsdom or happy-dom
```

### Forbidden (must not touch)
```
demo/legacy-billing/src/**
demo/legacy-billing/pom.xml
demo/legacy-billing/proposed-change.patch
demo/legacy-billing/PROPOSED_CHANGE.md
lib/analysis/types.ts
lib/analysis/parser.ts
lib/analysis/__tests__/behavioral-contract.test.ts
lib/analysis/fixtures/meridian-sample-contract.json
lib/analysis/review.ts
lib/analysis/intent.ts
lib/analysis/blast-radius.ts
lib/analysis/metadata.ts
lib/analysis/fixtures/meridian-sample-review.json
lib/analysis/fixtures/meridian-sample-intent.json
lib/analysis/fixtures/meridian-sample-blast-radius.json
lib/analysis/fixtures/meridian-sample-metadata.json
lib/analysis/__tests__/data-foundation.test.ts
.env
.env.*
```

---

## Design System Decisions (resolved by planner)

### Color palette
Applied per legacy-lens-design skill § Step 4:
- Background: `#0d0f11` (dark, near-black — forensic engineering workspace)
- Surface-1: `#131619` (slightly lighter — panel background)
- Surface-2: `#1a1e22` (slightly lighter — code background)
- Border: `#2a2e34`
- Text primary: `#e2e6eb`
- Text muted: `#7a8490`
- Risk high: `#e05252` (warm red)
- Risk medium: `#d97b20` (amber)
- Risk low: `#4a90c4` (muted blue)
- Risk info: `#6b7280` (neutral)
- Added line bg: `rgba(40, 100, 50, 0.25)` — subtle green tint
- Removed line bg: `rgba(120, 40, 40, 0.25)` — subtle red tint

### Layout
- Full-height split pane: left 50% diff, right 50% findings
- Header: `48px` compact bar fixed at top
- Both panes independently scrollable
- No hero section, no marketing grid

### Diff rendering
- Built from `lib/review-workspace/diff.ts` deterministic data
- No external diff library (none in repo, no clear value for one-hunk static diff)
- Monospace, `0.875rem`, `1.5` line-height

### Test environment
- `@testing-library/react` + `happy-dom` (lighter than jsdom, sufficient for React component rendering)
- Vitest workspace projects: `lib` tests keep `node` env; `app` tests use `happy-dom`

---

## Dependencies

### New dev dependencies
| Package | Version | Reason |
|---|---|---|
| `@testing-library/react` | `^16` | Component rendering in vitest |
| `@testing-library/jest-dom` | `^6` | `toBeInTheDocument()` etc. |
| `happy-dom` | `^15` | Lightweight DOM environment for vitest |

### No new runtime dependencies

---

## Security Requirements

### SEC-001 (inherited)
All fixture data flows through `WireSchema.safeParse()` before reaching UI. The loader
module enforces this. Components receive typed domain models only.

### SEC-002
No user input is rendered. All content is from deterministic fixture JSON.

### SEC-003
No external URLs, no API calls, no network I/O in any component.

---

## Test Requirements

| ID | Type | Requirement |
|---|---|---|
| TEST-201 | component | ReviewHeader renders `demo/legacy-billing` |
| TEST-202 | component | ReviewHeader renders risk level `high` |
| TEST-203 | component | DiffPane renders `RoundingMode.DOWN` (removed) |
| TEST-204 | component | DiffPane renders `RoundingMode.HALF_UP` (added) |
| TEST-205 | component | FindingsPane renders F-001 finding title |
| TEST-206 | component | FindingsPane renders severity `high` |
| TEST-207 | component | FindingsPane confidence label uses `confidenceLabel()` — output is "High confidence" |
| TEST-208 | component | FindingsPane renders missing test-coverage indicator |
| TEST-209 | component | FindingsPane renders evidence path containing `MoneyUtils.java` |
| TEST-210 | component | FindingsPane renders `BR-01` rule ID |

All existing Feature 1/2 tests (TEST-001 through TEST-125) must continue passing.

---

## Acceptance Criteria

| ID | Verifiable | Description |
|---|---|---|
| AC-001 | automated | `npm test` exits 0: all prior tests pass + TEST-201–210 pass |
| AC-002 | automated | `npm run lint` exits 0 with no new errors |
| AC-003 | automated | `tsc --noEmit` exits 0 |
| AC-004 | automated | `npm run build` exits 0 |
| AC-005 | visual | Review workspace renders at `localhost:3000` with header, split diff pane, findings pane |
| AC-006 | visual | Diff shows `RoundingMode.DOWN` as removed line and `RoundingMode.HALF_UP` as added line with line numbers |
| AC-007 | visual | BR-01 finding is the default-selected finding with severity `high` |
| AC-008 | visual | Business impact text is rendered (mentions overcharge / $0.01 / billing cycle) |
| AC-009 | visual | Confidence displays as `96%` with "High confidence" label |
| AC-010 | visual | Test coverage state renders "Uncovered" or "No characterization test" in a visually prominent danger state |
| AC-011 | visual | Evidence items are visible with filename, symbol, line range for at least the MoneyUtils.java source item |
| AC-012 | automated | `git diff --name-only` shows no changes to `demo/legacy-billing/**` |
| AC-013 | automated | `git diff --name-only` shows no changes to `lib/analysis/types.ts`, `parser.ts`, `behavioral-contract.test.ts`, `meridian-sample-contract.json` |
| AC-014 | automated | `confidenceLabel()` from `lib/analysis/types.ts` is used (not re-implemented) |

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| React Compiler conflicts with manually-written memoization | Medium | Do not use `useMemo`/`useCallback` anywhere (AGENTS.md rule) |
| Tailwind v4 CSS token syntax errors | Low | Use `@theme inline` block, test with build |
| `happy-dom` React 19 compatibility | Medium | Pin `@testing-library/react` to `^16` which targets React 19; check peer deps before install |
| vitest workspace config breaking existing lib tests | Medium | Use `projects` array with explicit `include` patterns and per-project `environment` |
| Server Component importing `"use client"` boundary violation | Low | Keep `FindingsPane` as sole client component; `DiffPane` and `ReviewHeader` are server |
| Fixture loader calling `fromWireFormat` before schema parse | Low | Enforce parse-before-map pattern in loader; blocked by existing SEC-001 contract |

---

## Change Budget

| Metric | Estimate |
|---|---|
| Files created | 7 |
| Files modified | 5 |
| Lines added | ~650 |
| Lines removed | ~65 (page.tsx boilerplate) |

---

## Implementation Order (for implementer)

1. Install dev dependencies (`@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`)
2. Update `vitest.config.ts` with workspace projects
3. Add Legacy Lens CSS design tokens to `app/globals.css`
4. Update `app/layout.tsx` metadata
5. Create `lib/review-workspace/diff.ts`
6. Create `lib/review-workspace/confidence.ts`
7. Create `lib/review-workspace/loader.ts`
8. Create `app/components/ReviewHeader.tsx`
9. Create `app/components/DiffPane.tsx`
10. Create `app/components/FindingsPane.tsx`
11. Replace `app/page.tsx`
12. Create `app/__tests__/review-workspace.test.tsx`
13. Run `npm test`, `npm run lint`, `tsc --noEmit`, `npm run build`
14. Fix any issues
