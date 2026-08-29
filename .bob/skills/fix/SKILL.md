---
name: fix
description: '# /fix — Fix Verification Failures'
metadata:
  user-invocable: true
  disable-model-invocation: true
---

# /fix — Fix Verification Failures

Read the latest verification report, independently reproduce each finding, apply
targeted fixes within approved scope, and re-run verification.

**Never suppresses failures. Never touches files outside the approved contract.**

---

## Steps

### 1. Gate Check — Verification Report

Read `.agent/reports/latest.json`. If it does not exist:
> "No verification report found. Run `/verify` first." — stop.

Extract all findings with `status: "open"`.

### 2. Gate Check — Approved Contract

Read `.agent/state/workflow.json` for `feature_id`.
Find `.agent/state/approval-<feature-id>.json`. If no approved contract exists:
> "No approved scope is active. Fixes must stay within an approved contract.
> Run `/approve-plan` or `/feature` first." — stop.

Load `.agent/contracts/contract-<feature-id>.json`. Confirm `status === "approved"`.

### 3. Check Iteration Limit

Read `iteration` from `.agent/state/workflow.json`.
If `iteration >= max_iterations`:
> "Maximum iterations (N) reached. Human intervention required. Review
> `.agent/reports/latest.md` for open findings." — stop.

### 4. Update Workflow State → FIXING

Update `.agent/state/workflow.json`:
- `state = "FIXING"`
- `last_updated = <now>`

### 5. Activate fixer Skill

Activate the `fixer` skill:
- Load open findings from the latest report.
- Independently reproduce each finding before fixing.
- Apply minimal, targeted fixes within `allowed_paths`.
- Add regression tests for each confirmed fix.
- Run `bash scripts/verification/verify.sh`.
- Update `.agent/reports/latest.json` and `.agent/reports/latest.md`.
- Archive to `.agent/reports/history/`.
- Increment the iteration counter in `.agent/state/fix-iterations.json`.

**The fixer must never:**
- Suppress or skip a check to get a pass.
- Touch files outside `allowed_paths`.
- Expand scope beyond the contract.

### 6. Increment Iteration

Update `.agent/state/workflow.json`:
- `iteration = iteration + 1`
- `last_updated = <now>`

### 7. Evaluate Post-Fix Verification

If all checks pass:
- Update `verification_status = "passed"`, `state = "VERIFYING"`.

If checks still fail:
- Update `verification_status = "failed"`.

### 8. Report to the User

Tell the user:
- What was fixed vs. identified as a false positive.
- Regression tests added.
- Post-fix verification result.
- Current iteration count: "Iteration N of max_iterations."
- Next step:
  - Still failing → "Run `/fix` again or review `.agent/reports/latest.md`."
  - Passing → "Run `/verify` for a clean independent pass, then `/security`."
