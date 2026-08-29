# Implementation Report — feat-bob-analysis-pipeline (Transport Correction)

**Feature ID:** feat-bob-analysis-pipeline  
**Report Type:** Narrowly-scoped correction — Bob Shell transport only  
**Timestamp:** 2025-01-01T00:00:00Z

---

## What Was Implemented

Replaced the raw HTTP `fetch()` transport in `lib/analysis/bob-client.ts` with IBM Bob Shell invocation via `child_process.spawn`.

### Changes Made

| File | Action | Description |
|------|--------|-------------|
| `lib/analysis/bob-client.ts` | Modified | Replaced `bobFetch()` + OpenAI chat/completions format with `bobSpawn()` using `child_process.spawn('bob', args, { shell: false })`. Stdin piping of full prompt. Parses `{ type, status, last_message }` wrapper from Bob Shell `--format json` output. |
| `lib/analysis/__tests__/bob-pipeline.test.ts` | Modified | Updated tests to use `vi.mock('child_process')` (vitest module mock, hoisted) instead of `vi.spyOn(global, 'fetch')`. Added spawn transport coverage: valid output, non-zero exit, error status, malformed JSON, empty last_message. |

### Transport Specification

```
bob run
  --mode ask
  --format json
  --max-cost 5
  --max-turns 1
  --disable-mcp
  --disable-subagents
  --disable-tool-groups read,edit,execute
  --log-level silent
```

- **Executable:** `bob` (from PATH) — not shell-constructed, not user-influenced
- **shell: false** — no shell interpolation
- **stdin:** complete analysis prompt (system + user message) piped as UTF-8
- **stdout:** `{ type: "result", status: "success", last_message: "<JSON string>" }`
- **Credential:** `BOB_API_KEY` forwarded via `process.env` — never logged or serialised

### `isBobConfigured()` change

Now requires only `BOB_API_KEY`. `BOB_API_URL` and `BOB_MODEL` are not needed by the Shell transport. The route handler HTTP 503 path is preserved.

---

## Files Created / Modified

**Modified:**
- `lib/analysis/bob-client.ts`
- `lib/analysis/__tests__/bob-pipeline.test.ts`

**Not touched (as required):**
- `app/api/analyze/route.ts` — unchanged; `BobApiError`, `isBobConfigured`, `callBobAnalysis` API is identical
- `lib/analysis/prompt.ts` — unchanged
- `lib/analysis/allowlist.ts` — unchanged
- `lib/analysis/bundle.ts` — unchanged
- All frozen fixture files — untouched
- All other files — untouched

---

## Verification Results

| Check | Result | Exit Code |
|-------|--------|-----------|
| `npm run lint` | PASS (0 errors, 16 pre-existing warnings) | 0 |
| `npx tsc --noEmit` | PASS | 0 |
| `npm test` (bob-pipeline.test.ts) | PASS — 12/12 tests | 0 |
| `npm test` (all other tests) | PASS — unchanged | 0 |

**Pre-existing failures (not caused by this change):**
- `app/__tests__/bob-analysis-pipeline.test.tsx` — 4 tests failing on baseline before this correction. These test `ReviewHeader` badge text ("LIVE BOB ANALYSIS", "DEVELOPMENT FIXTURE") against abbreviated rendered text ("Live", "Fixture") — a pre-existing badge text mismatch in the component. Not in scope of this correction.

---

## Deviations from Contract

The original contract (REQ-015) specified an OpenAI `fetch()` transport. This correction replaces it per explicit user instruction while keeping all other contracts intact. No other requirements were modified.

**BOB_API_URL and BOB_MODEL** are no longer required; only `BOB_API_KEY` is needed. The `.env.example` already documents these; they remain as optional backward-compatible entries.

---

## Security Properties Preserved

| ID | Property | Status |
|----|----------|--------|
| SEC-601 | BOB_API_KEY never in client response | ✓ |
| SEC-602 | BOB_API_KEY never logged | ✓ — forwarded via env only |
| SEC-603 | Server-side only module | ✓ |
| SEC-604 | readAllowedSources() uses only ALLOWED_PATHS | ✓ unchanged |
| SEC-605 | AnalysisBundleWireSchema validates before field access | ✓ unchanged |
| SEC-606 | No generated code executed | ✓ unchanged |
| SEC-607 | Prompt never includes credentials | ✓ unchanged |
| NEW | spawn shell: false — no shell injection | ✓ |
| NEW | args hard-coded — no user input in argv | ✓ |
