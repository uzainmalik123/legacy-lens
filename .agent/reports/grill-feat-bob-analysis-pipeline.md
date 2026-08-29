# Grill Report — feat-bob-analysis-pipeline

**Date:** 2025-01-01  
**Plan:** `.agent/plans/plan-feat-bob-analysis-pipeline.md`  
**Contract:** `.agent/contracts/contract-feat-bob-analysis-pipeline.json`  
**Status:** REVISED — ready for approval

---

## Summary of Original Plan

Replace development-fixture data source with a real IBM Bob-powered analysis
pipeline. One LLM call (OpenAI-compatible API) reads only allowlisted Meridian
source files, returns a structured `AnalysisBundle`, validated through existing
Zod wire schemas, rendered via the existing Review Workspace. Fixture fallback
preserved and clearly labelled. 11 new files, 2 modified, zero new dependencies.

---

## Challenges Raised

### C-01: Bob API endpoint format was unspecified — RESOLVED

**Challenge:** The plan deferred selection between IBM watsonx.ai and
OpenAI-compatible format to implementation time. Getting this wrong means the
entire feature doesn't work.

**User answer:**
> Use OpenAI-compatible format only. `POST {BOB_API_URL}/chat/completions`.
> Three env vars: `BOB_API_URL`, `BOB_API_KEY`, `BOB_MODEL`. No IAM token
> exchange. No watsonx.ai format. No auto-detection from URL prefix. Keep
> the HTTP adapter isolated so auth/header details can be adjusted in one place.

**Plan change:** REQ-005 updated to name three env vars explicitly. `bob-client.ts`
uses a single isolated adapter function. The `.env.example` lists all three.

---

### C-02: Route Handler timeout — RESOLVED

**Challenge:** A single Bob inference call over ~14 Java files + patch could take
60–180 seconds. An unspecified timeout could kill the demo at the worst moment.

**User answer:**
> Local development only (`npm run dev` / `npm start`). No platform timeout.
> Do NOT add Vercel `maxDuration`. Allow the fetch call enough time. Show clear
> "IBM Bob analyzing…" state during inference. Handle failure cleanly. Prevent
> duplicate Analyze requests while one is running.

**Plan changes added:**
- REQ-006: ReviewWorkspace disables the ANALYZE CHANGE button while a request is
  in-flight (no duplicate requests).
- REQ-008: The "analyzing" stage copy reads "IBM Bob analyzing…" explicitly.
- `bob-client.ts` uses `fetch()` without an artificial `AbortController` timeout
  (relies on the Bob inference endpoint's own timeout behaviour).
- No `export const maxDuration` added to the route.

---

### C-03: `blast_radius` absent from bundle schema — self-resolved

**Challenge:** The PRD §FR-017 and existing fixtures include `BlastRadiusResult`.
The plan's five-contract bundle omits it. Is this a gap?

**Self-resolution:** `BlastRadiusResult` is not currently rendered in the Review
Workspace UI. The `MeridianReviewSession` interface in `loader.ts` does not
include it. Adding a dedicated blast-radius view is out of scope per non-requirements.
Including it in the bundle schema as an optional field (`blast_radius?: BlastRadiusResultWire`)
lets the Bob prompt request it for future use without breaking validation if absent.

**Plan change:** `AnalysisBundleWireSchema` includes `blast_radius` as optional
(`.optional()`). If present, it is mapped and stored in the live session state but
not rendered by any existing component (no new UI). This is a zero-cost forward
compatibility inclusion.

---

### C-04: `.env.example` missing `BOB_API_URL` and `BOB_MODEL` — self-resolved

**Challenge:** The original plan listed only `BOB_API_KEY` in `.env.example`.

**Self-resolution:** All three env vars are needed. `.env.example` will list all
three with placeholders.

---

### C-05: `readAllowedSources()` base path not specified — self-resolved

**Challenge:** Which base directory do the allowlisted paths resolve against?

**Self-resolution:** Use `process.cwd()` (which equals the repository root when
running `next dev` / `next start`). Paths are the same relative strings as in
`ANALYSIS_SCOPE.md`. Tests mock `fs.promises.readFile` — they don't need the
actual files to exist.

---

### C-06: TEST-616 needs `ReviewWorkspace` to receive initial session — self-resolved

**Challenge:** `ReviewWorkspace` is a Client Component receiving `initialSession`
as a prop. Test must provide it.

**Self-resolution:** Tests import `getMeridianReviewSession()` from the fixture
loader and pass the result as `initialSession` prop. This is the same pattern
used in existing component tests.

---

### C-07: `response_format: { type: "json_object" }` support varies by model — self-resolved

**Challenge:** Not all OpenAI-compatible models support `response_format`.
Sending it to an unsupported endpoint may cause an error.

**Self-resolution:** Include `response_format: { type: "json_object" }` in the
request body but also instruct the model via the system prompt to return ONLY a
JSON object. If the model ignores `response_format`, the prompt instruction is
the fallback. The `JSON.parse()` wrapper in the route handler catches any non-JSON
response and returns HTTP 422 with a clear error.

---

## Security Findings

All seven SEC requirements from the original plan are confirmed adequate.
No new security risks introduced by the resolved questions.

Additional note: `bob-client.ts` must be marked with a comment warning that it
must not be imported from any `'use client'` module. TypeScript doesn't enforce
this automatically, but the route handler being the sole importer keeps it
server-side.

---

## Testing Gaps Addressed

| Gap | Resolution |
|-----|-----------|
| No test for disabled-button-during-inflight state | Added TEST-618 |
| No test for `blast_radius: null` / absent in bundle | Added TEST-619 |
| No test for three env vars present/absent | Route handler checks for `BOB_API_URL` and `BOB_API_KEY` at startup; missing key → HTTP 503 "Analysis not configured" |

---

## Revised Requirements (additions/changes only)

**REQ-005 revised:** Three env vars: `BOB_API_KEY`, `BOB_API_URL`, `BOB_MODEL`.
Route returns HTTP 503 with `{ error: "not_configured" }` if `BOB_API_URL` or
`BOB_API_KEY` is absent (avoids cryptic fetch errors in unconfigured environments).

**REQ-006 addition:** The ANALYZE CHANGE button is disabled and shows a loading
indicator while a request is in-flight. A second click while analyzing is a no-op.

**REQ-008 revised:** The "analyzing" stage copy reads "IBM Bob analyzing…"
(verbatim). No artificial sub-agent stages. `fetch()` has no application-level
timeout set.

**REQ-015 (new):** `bob-client.ts` exports a single `callBobAnalysis(sources)` 
function using an isolated `bobFetch()` helper that constructs the
`Authorization: Bearer ${BOB_API_KEY}` header and `POST {BOB_API_URL}/chat/completions`
request in one place. All auth/header details live exclusively in this helper.

**REQ-016 (new):** `AnalysisBundleWireSchema` includes `blast_radius` as an
optional field (`BlastRadiusResultWireSchema.optional()`). If present in the Bob
response it is parsed and stored in the live session state. No new UI component
renders it.

---

## Revised Acceptance Criteria (additions only)

**AC-614:** The ANALYZE CHANGE button is disabled while an analysis is in-flight
(no duplicate requests possible via the UI).

**AC-615:** When `BOB_API_URL` or `BOB_API_KEY` is not set in the environment,
POST /api/analyze returns HTTP 503 with `{ error: "not_configured" }` and the
UI displays "Analysis not configured — check environment variables."

---

## Go / No-Go Recommendation

**GO** — with the revisions above incorporated.

All blocking questions are answered. No unresolved architectural ambiguity.
Remaining decisions (key format, exact prompt wording, stage copy) are
implementation details within implementer authority.

**Key risks remaining (accepted):**
- R-4: Bob may produce a correct-looking but factually wrong analysis. Accepted — 
  evaluation risk, not an implementation defect.
- R-2: Bob may return schema-mismatched JSON. Mitigated by `.passthrough()` +
  `safeParse()`.

**Unresolved items requiring human attention after implementation:**
- SEC-607 (prompt never leaks credentials): requires code-review verification,
  not automated test.
- AC-607 (`BOB_API_KEY` not in any git-tracked file): requires grep verification.

---

*Grill complete. Revisions applied to plan and contract below.*
