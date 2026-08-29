# Plan: feat-bob-analysis-pipeline

**Feature ID:** feat-bob-analysis-pipeline
**Status:** approved
**Created:** 2025-01-01
**Grill report:** `.agent/reports/grill-feat-bob-analysis-pipeline.md`

---

## Objective

Replace the static development-fixture data source with a real IBM Bob-powered
analysis pipeline that reads only the allowlisted Meridian source files, produces
structured output conforming to the existing Legacy Lens Zod schemas, and renders
live results through the existing Review Workspace — while keeping the fixture
fallback available and clearly labelled.

---

## Requirements

### REQ-001
A Next.js Route Handler (`app/api/analyze/route.ts`) executes the Bob analysis
server-side. It reads only the allowlisted source files via an explicit allowlist
function and returns a JSON `AnalysisBundle` containing all five contracts
(review, behavioral-contract, metadata, intent, guardrail-test).

### REQ-002
A pure TypeScript module (`lib/analysis/allowlist.ts`) defines and exports the
explicit set of allowed analysis paths. It MUST NOT include any forbidden paths
(`GROUND_TRUTH.md`, `LEGACY_FIXTURE_SPEC.md`, `ANALYSIS_SCOPE.md`,
`PROPOSED_CHANGE.md`, `target/**`). The function `readAllowedSources()` reads
these files from disk and returns their contents as a key–value map.
Forbidden paths must be rejected via an allowlist check at the function level
(not prompt-level filtering).

### REQ-003
A shared aggregate wire schema (`lib/analysis/bundle.ts`) defines
`AnalysisBundleWireSchema` — a `z.object` containing all five wire sub-schemas.
The route handler validates the raw Bob response through this schema before
returning any data to the client. If validation fails, the route returns
`{ error: "validation_failed", details: string }` with HTTP 422.

### REQ-004
The Bob prompt is a single structured request (one LLM call). It supplies the
full allowed source content and instructs Bob to return a JSON object matching
`AnalysisBundleWireSchema`. The prompt explicitly states that `GROUND_TRUTH.md`,
`LEGACY_FIXTURE_SPEC.md`, `ANALYSIS_SCOPE.md`, and `PROPOSED_CHANGE.md` are not
available. The prompt must not include the ground-truth answer (BR-01 = DOWN
is customer-protection), canonical expected conclusions, or any fixture data.

### REQ-005
Three LLM credentials are read exclusively from `process.env` server-side inside
the route handler: `BOB_API_KEY`, `BOB_API_URL`, `BOB_MODEL`. No credential is
passed to any client component, included in any source file, or logged. If
`BOB_API_URL` or `BOB_API_KEY` is absent the route returns HTTP 503
`{ error: "not_configured" }` rather than a cryptic fetch error.

### REQ-006
The home page (`app/page.tsx`) is a Server Component that calls
`getMeridianReviewSession()` and passes the result as an `initialSession` prop to
`<ReviewWorkspace>`. `ReviewWorkspace` is a Client Component that:
- Renders the fixture session immediately from `initialSession` (labelled **FIXTURE**).
- Exposes an **"ANALYZE CHANGE"** button in the header area.
- Disables the button and shows a loading indicator while a request is in-flight
  (prevents duplicate concurrent requests).
- On button click, calls `fetch('/api/analyze')` and shows four honest progress
  stages: `preparing → analyzing → validating → complete`.
- On success, replaces the displayed session data with the live result
  (labelled **LIVE**).
- On failure (network error, HTTP error, validation error, HTTP 503), shows a
  controlled error state — does NOT silently fall back to fixture and claim it is live.
- The fixture path remains available and is clearly labelled **DEVELOPMENT FIXTURE**.

### REQ-007
The review header (`app/components/ReviewHeader.tsx`) receives a new optional
`analysisMode` prop of type `"fixture" | "live"` and renders a visible badge:
- **LIVE BOB ANALYSIS** (accent color) for live mode.
- **DEVELOPMENT FIXTURE** (muted/warning color) for fixture mode.

### REQ-008
An honest pipeline-state component (`app/components/AnalysisProgress.tsx`)
renders the stages: `preparing | analyzing | validating | complete | error`.
Intermediate stages MUST NOT be fabricated. The "analyzing" stage copy reads
**"IBM Bob analyzing…"** verbatim. The fetch call has no application-level
`AbortController` timeout — the Bob inference endpoint's own timeout governs
response time.

### REQ-009
If the Bob response is structurally valid JSON but fails Zod schema validation,
the UI must display: "Analysis returned malformed data — results not displayed.
Use DEVELOPMENT FIXTURE mode." The fixture data must NOT be silently substituted.

### REQ-010
An `.env.example` file is created with three placeholder entries:
```
BOB_API_URL=https://api.us-east.bob.ibm.com/inference/v1
BOB_API_KEY=your_ibm_bob_api_key_here
BOB_MODEL=your_bob_model_id_here
```
No real credential appears anywhere in the repository.

### REQ-011
The route handler returns a `X-Analysis-Mode: live` response header so the client
can distinguish live results from fixture results without relying on response body
content alone.

### REQ-012
All new tests mock the external LLM call. No network request to any LLM API is
made during `npm test`. The mock returns either a valid `AnalysisBundleWire`
fixture or a deliberately invalid payload (for error-path tests).

### REQ-013
The existing `loader.ts` `getMeridianReviewSession()` function is preserved
unchanged. Fixture mode continues to use it directly.

### REQ-014
The `AnalysisBundleWireSchema` is the single validation gate. After validation,
each sub-schema (`BehavioralContractWireSchema`, `ReviewReportWireSchema`, etc.)
maps to its existing domain model via the existing `fromWireFormat` functions.
No new mapping logic is introduced beyond what is needed to split the bundle.

### REQ-015
`lib/analysis/bob-client.ts` exports a single `callBobAnalysis(sources)` function
using an isolated `bobFetch()` helper that constructs the
`Authorization: Bearer ${BOB_API_KEY}` header and
`POST {BOB_API_URL}/chat/completions` request in one place. All auth/header
details live exclusively in this helper so they can be adjusted for live
integration testing without touching any other file. The request body uses
OpenAI-compatible `messages` structure and includes
`response_format: { type: "json_object" }` where supported. The Bob endpoint
is `{BOB_API_URL}/chat/completions` — no auto-detection of provider from URL.
No IBM Cloud IAM token exchange. No watsonx.ai format.

### REQ-016
`AnalysisBundleWireSchema` in `lib/analysis/bundle.ts` includes `blast_radius`
as an optional field (`BlastRadiusResultWireSchema.optional()`). If present in
the Bob response it is parsed and stored in the live session state. No new UI
component renders it in this feature.

---

## Non-Requirements (explicit exclusions)

- No GitHub App, OAuth, PR API, or webhook integration.
- No database, persistent store, or session management.
- No authentication or multi-user support.
- No multi-agent swarm — one Bob call only.
- No MCP server, vector database, RAG, or embeddings.
- No new UI design system or layout changes beyond the badge and progress component.
- No automatic execution of the Bob-generated guardrail test code.
- No deployment pipeline changes.
- No redesign of existing UI components (FindingsPane, DiffPane, IntentPanel,
  GuardrailTestView, ReviewHeader structure).
- No changes to frozen Meridian fixture files
  (`demo/legacy-billing/src/**`, `demo/legacy-billing/pom.xml`,
  `demo/legacy-billing/proposed-change.patch`).
- No changes to existing fixture JSON files in `lib/analysis/fixtures/`.
- No removal of the fixture mode or existing tests.
- No server-side streaming or WebSocket support.

---

## Affected Files

### Created (new files)

| File | Purpose |
|------|---------|
| `lib/analysis/allowlist.ts` | Defines allowed paths, `readAllowedSources()` function |
| `lib/analysis/bundle.ts` | `AnalysisBundleWireSchema` + `AnalysisBundle` domain type |
| `lib/analysis/bob-client.ts` | Server-only LLM call wrapper (`callBobAnalysis(sources)`) |
| `lib/analysis/prompt.ts` | Builds the single structured Bob analysis prompt |
| `app/api/analyze/route.ts` | Next.js Route Handler (POST) — orchestrates the pipeline |
| `app/components/ReviewWorkspace.tsx` | Client Component — wraps the full workspace with ANALYZE button |
| `app/components/AnalysisProgress.tsx` | Honest pipeline stage progress indicator |
| `lib/analysis/__tests__/allowlist.test.ts` | Tests for allowlist enforcement |
| `lib/analysis/__tests__/bundle.test.ts` | Tests for AnalysisBundleWireSchema validation |
| `lib/analysis/__tests__/bob-pipeline.test.ts` | Tests for API route (mocked LLM call) |
| `.env.example` | Placeholder credential template |

### Modified (existing files)

| File | Change |
|------|--------|
| `app/page.tsx` | Becomes thin shell — renders `<ReviewWorkspace />` with initial fixture session |
| `app/components/ReviewHeader.tsx` | Add `analysisMode?: "fixture" \| "live"` prop + mode badge |
| `app/components/FindingsPane.tsx` | Pass-through only: no logic change; accept `blastRadius` prop (optional, already typed) if needed |
| `vitest.config.ts` | Add `lib/analysis/__tests__/` to lib test project if not already covered |

### Forbidden (must not be touched)

```
demo/legacy-billing/GROUND_TRUTH.md
demo/legacy-billing/LEGACY_FIXTURE_SPEC.md
demo/legacy-billing/ANALYSIS_SCOPE.md
demo/legacy-billing/PROPOSED_CHANGE.md
demo/legacy-billing/target/**
demo/legacy-billing/src/**          (read-only analysis input — not modified)
demo/legacy-billing/pom.xml         (read-only analysis input — not modified)
demo/legacy-billing/proposed-change.patch  (read-only analysis input — not modified)
lib/analysis/fixtures/**            (fixture data preserved unchanged)
lib/analysis/types.ts               (frozen schema)
lib/analysis/parser.ts              (frozen schema)
lib/analysis/review.ts              (frozen schema)
lib/analysis/intent.ts              (frozen schema)
lib/analysis/blast-radius.ts        (frozen schema)
lib/analysis/guardrail-test.ts      (frozen schema)
lib/analysis/metadata.ts            (frozen schema)
lib/review-workspace/loader.ts      (frozen fixture loader)
lib/review-workspace/diff.ts        (frozen diff)
lib/review-workspace/confidence.ts  (frozen)
lib/review-workspace/evidence-format.ts (frozen)
.agent/contracts/**
.agent/plans/**
.agent/state/**
```

---

## Dependencies

### Runtime (new)

None. The LLM call uses the built-in Node.js `fetch` API (available in Next.js 16).
`zod` (already installed) handles all validation.

### Dev (new)

None. `vitest` and `@testing-library/*` are already installed.

---

## Architecture Notes

### LLM Integration Mechanism

The project has no installed LLM SDK. The implementation uses `fetch()` in a
Next.js Route Handler (server-side, never exposed to client bundle) against the
Bob inference endpoint using OpenAI-compatible chat completions format. Credentials:

```
process.env.BOB_API_URL   (Bob inference base URL, e.g. https://api.us-east.bob.ibm.com/inference/v1)
process.env.BOB_API_KEY   (Bob API key — Bearer token)
process.env.BOB_MODEL     (model ID to use)
```

Single endpoint: `POST {BOB_API_URL}/chat/completions`
Single auth pattern: `Authorization: Bearer {BOB_API_KEY}`
No IAM token exchange. No watsonx.ai format. No provider auto-detection.
All auth/header details isolated in `bobFetch()` inside `bob-client.ts`.

### Single Bob Call Strategy

All seven PRD §15 agent responsibilities are collapsed into one structured prompt
for cost efficiency. The prompt:

1. Provides the full Java source tree and test sources (from `readAllowedSources()`).
2. Provides the patch content (`proposed-change.patch`).
3. Instructs Bob to return a single JSON object conforming to
   `AnalysisBundleWireSchema`.
4. Explicitly states no ground-truth, spec, or scope documentation is available.
5. Instructs Bob to independently determine: changed code, business behavior,
   behavioral rules, affected rules, downstream dependencies, test gaps, business
   impact, and a guardrail test.
6. Instructs Bob NOT to include free-form prose outside the JSON structure.

### AnalysisBundleWireSchema

```typescript
{
  behavioral_contract: BehavioralContractWire,
  review: ReviewReportWire,
  metadata: AnalysisMetadataWire,
  intent: RevealIntentWire,
  guardrail_test: GuardrailTestWire | null,
  blast_radius?: BlastRadiusResultWire,  // optional — parsed but not rendered in this feature
}
```

`guardrail_test` is nullable because Bob may not always have enough evidence to
produce a complete test (graceful degradation — UI falls back to "not generated").
`blast_radius` is optional for forward compatibility — if present, stored in state
but no UI renders it in this feature.

### Analysis Pipeline Flow

```
[User clicks ANALYZE CHANGE]
  → ReviewWorkspace sets state: { stage: "preparing", mode: "live" }
  → fetch POST /api/analyze
    → [route.ts] readAllowedSources() → reads only allowlisted paths
    → [route.ts] callBobAnalysis(sources) → single LLM fetch() call
    → [route.ts] AnalysisBundleWireSchema.safeParse(rawResponse)
      → fail → HTTP 422 { error: "validation_failed", details }
      → pass → split into sub-objects → HTTP 200 { bundle }
  → ReviewWorkspace receives 200 → validates header X-Analysis-Mode: live
  → parse each sub-object through existing Wire schemas (defense in depth)
  → map through existing fromWireFormat functions
  → setState: { session: liveSession, mode: "live", stage: "complete" }
  → ReviewHeader shows LIVE BOB ANALYSIS badge
```

### Honest Progress Reporting

Because the Bob call is a single atomic HTTP request (no streaming in P0), the
progress states are:

| State | Trigger |
|-------|---------|
| `preparing` | Immediately on button click (button disabled) |
| `analyzing` | Immediately after `fetch()` is called — copy: "IBM Bob analyzing…" |
| `validating` | When `fetch()` resolves successfully (before Zod parse) |
| `complete` | When `AnalysisBundleWireSchema.safeParse()` returns success |
| `error` | On any failure (network, non-200 HTTP, 503, Zod failure) |

This is honest — `validating` is a real step (Zod parse). No fake sub-agent
activity is shown. The button remains disabled throughout; re-enabled only on
`complete` or `error`.

---

## Test Requirements

| ID | Description | Type | REQ |
|----|-------------|------|-----|
| TEST-601 | `readAllowedSources()` returns content for all allowlisted paths | unit | REQ-002 |
| TEST-602 | `readAllowedSources()` throws if any allowlisted file is missing | unit | REQ-002 |
| TEST-603 | `readAllowedSources()` does NOT include GROUND_TRUTH.md in returned keys | unit | REQ-002 |
| TEST-604 | `readAllowedSources()` does NOT include LEGACY_FIXTURE_SPEC.md in returned keys | unit | REQ-002 |
| TEST-605 | `readAllowedSources()` does NOT include ANALYSIS_SCOPE.md in returned keys | unit | REQ-002 |
| TEST-606 | `readAllowedSources()` does NOT include PROPOSED_CHANGE.md in returned keys | unit | REQ-002 |
| TEST-607 | `AnalysisBundleWireSchema.safeParse` passes for a valid bundle | unit | REQ-003 |
| TEST-608 | `AnalysisBundleWireSchema.safeParse` fails when `review` sub-object is missing | unit | REQ-003 |
| TEST-609 | `AnalysisBundleWireSchema.safeParse` fails when `behavioral_contract` has no rules | unit | REQ-003 |
| TEST-610 | `AnalysisBundleWireSchema` accepts `guardrail_test: null` | unit | REQ-003 |
| TEST-611 | Route handler returns HTTP 422 when Bob returns malformed JSON that fails Zod validation | integration | REQ-003 |
| TEST-612 | Route handler returns HTTP 200 with `X-Analysis-Mode: live` header on valid mock response | integration | REQ-011 |
| TEST-613 | `ALLOWED_PATHS` constant contains no path matching any forbidden filename | unit | REQ-002 |
| TEST-614 | ReviewHeader renders "LIVE BOB ANALYSIS" badge when `analysisMode="live"` | unit | REQ-007 |
| TEST-615 | ReviewHeader renders "DEVELOPMENT FIXTURE" badge when `analysisMode="fixture"` | unit | REQ-007 |
| TEST-616 | ReviewWorkspace renders "ANALYZE CHANGE" button in initial fixture state | unit | REQ-006 |
| TEST-617 | No real network fetch to any LLM API URL occurs during `npm test` (mocked fetch) | unit | REQ-012 |
| TEST-618 | ReviewWorkspace ANALYZE CHANGE button is disabled while an analysis is in-flight | unit | REQ-006 |
| TEST-619 | `AnalysisBundleWireSchema.safeParse` passes when `blast_radius` is absent | unit | REQ-016 |
| TEST-620 | Route handler returns HTTP 503 with `{ error: "not_configured" }` when `BOB_API_KEY` env var is absent | integration | REQ-005 |

---

## Security Requirements

| ID | Description | Category |
|----|-------------|----------|
| SEC-601 | `BOB_API_KEY` is never read in any client component or passed in fetch body to client | secret-exposure |
| SEC-602 | `BOB_API_KEY` is never logged, serialised, or included in HTTP response bodies | secret-exposure |
| SEC-603 | The route handler is `'use server'` context only — credential access is server-side | configuration |
| SEC-604 | `readAllowedSources()` only opens files from an explicit hard-coded allowlist — no dynamic path construction from user input | path-traversal |
| SEC-605 | Bob response is validated via `AnalysisBundleWireSchema.safeParse()` before any field is accessed | input-validation |
| SEC-606 | No generated code from Bob is executed — guardrail test code is display data only | injection |
| SEC-607 | The LLM prompt never includes `.env` contents, credentials, or file system layout beyond allowed paths | secret-exposure |

---

## Acceptance Criteria

| ID | Description | Automated |
|----|-------------|-----------|
| AC-601 | Clicking "ANALYZE CHANGE" triggers a real analysis — a network call to `/api/analyze` is made | true |
| AC-602 | Only files in the explicit allowlist are included in the analysis context — `GROUND_TRUTH.md` and `LEGACY_FIXTURE_SPEC.md` are never opened | true |
| AC-603 | The Bob API response is validated through `AnalysisBundleWireSchema.safeParse()` before any data is displayed | true |
| AC-604 | A valid live response causes the Review Workspace to display the live result labelled "LIVE BOB ANALYSIS" | true |
| AC-605 | An invalid (malformed) Bob response causes the UI to display an error message — not silently show fixture data | true |
| AC-606 | The fixture mode still loads and displays "DEVELOPMENT FIXTURE" correctly | true |
| AC-607 | `BOB_API_KEY` does not appear in any client bundle, response header, or server log output | false |
| AC-608 | `npm test` passes without any real LLM network request | true |
| AC-609 | `npm run lint` passes with no new errors | true |
| AC-610 | `tsc --noEmit` passes with no new type errors | true |
| AC-611 | The existing TEST-201 through TEST-414 suite continues to pass | true |
| AC-612 | The four honest progress stages appear sequentially during a live analysis run | false |
| AC-613 | When the live analysis returns `guardrail_test: null`, the guardrail UI shows "not generated" rather than crashing | true |

---

## Estimated Change Budget

| Metric | Estimate |
|--------|---------|
| New files | 11 |
| Modified files | 3 |
| Lines added | ~600 |
| Lines removed | ~15 (page.tsx simplified) |

---

## Risks

### R-1: No LLM SDK installed — fetch complexity
**Likelihood:** High | **Impact:** Medium  
**Mitigation:** Use raw `fetch()` with OpenAI-compatible request format. This is
straightforward with Next.js 16 Node runtime. Tested via mock in unit tests.

### R-2: Bob returns valid JSON but schema mismatch
**Likelihood:** Medium | **Impact:** Medium  
**Mitigation:** `AnalysisBundleWireSchema` uses `.passthrough()` on leaf schemas
(already done in existing wire schemas) so minor extra fields are tolerated.
Zod `safeParse` returns structured error details to surface what failed.

### R-3: Large prompt exceeds context window
**Likelihood:** Low-Medium | **Impact:** High  
**Mitigation:** The Meridian source is small (~14 Java files, ~2000 LOC total).
Prompt should fit well within any modern model context. Include only allowed
source — no additional context injection.

### R-4: Bob generates wrong analysis (misidentifies changed behavior)
**Likelihood:** Low | **Impact:** Medium  
**Mitigation:** This is an evaluation risk, not a code risk. The implementation
correctly supplies allowed inputs; the quality of analysis depends on the model.
The UI labels it LIVE BOB ANALYSIS, which is accurate. The fixture fallback
remains available for demo recovery.

### R-5: Page.tsx refactor breaks existing component tests
**Likelihood:** Low | **Impact:** High  
**Mitigation:** TEST-201 through TEST-414 test individual components directly —
they do not test `page.tsx`. The `ReviewWorkspace` wrapper passes the same props.
`getMeridianReviewSession()` remains the fixture source unchanged.

### R-6: Credential accidentally logged
**Likelihood:** Low | **Impact:** Critical  
**Mitigation:** SEC-602 explicitly forbids logging the key. `bob-client.ts` must
never log the key. The route handler catches errors and returns sanitised messages.
Code review step in verification catches this.

### R-7: FindingsPane test (TEST-205) breaks due to prop change
**Likelihood:** Low | **Impact:** Low  
**Mitigation:** `FindingsPane` signature is not changed. The `ReviewWorkspace`
wrapper passes the same `intent` and `guardrailTest` props that `page.tsx`
currently passes.

---

## Implementation Notes

1. **`vitest.config.ts` already covers `lib/**/__tests__/**/*.test.ts`** — new
   tests in `lib/analysis/__tests__/` are automatically picked up.

2. **`zod` v4.4.3 is installed** — use `.safeParse()` throughout. Do not use
   `parse()` on untrusted Bob output.

3. **`'use server'` vs Route Handler** — the implementation uses a Route Handler
   (`app/api/analyze/route.ts`) rather than a Server Action. This avoids any
   ambiguity about client-side invocation and allows explicit HTTP status codes
   for error communication. The existing page uses Server Components — the new
   client wrapper is the minimal required change.

4. **Bob prompt format** — the prompt instructs Bob to return ONLY a JSON object
   (no prose wrapper). The response is parsed with `JSON.parse()` guarded by
   `try/catch`. Raw text is not trusted.

5. **Bob API URL pattern** — If `BOB_API_URL` starts with
   `https://us-south.ml.cloud.ibm.com`, use IBM watsonx format. Otherwise use
   OpenAI `chat/completions` format. Both return JSON in the `choices[0].message.content`
   path. This is resolved at implementation time.

6. **`app/page.tsx` refactor scope** — The page becomes a very thin server
   component that passes the fixture session as initial props to `<ReviewWorkspace>`.
   The component test for `ReviewHeader` renders it directly (no page dependency),
   so existing tests are unaffected.
