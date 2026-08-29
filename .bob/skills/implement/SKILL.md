---
name: implement
description: '# /implement — Implement the Approved Plan (Manual)'
metadata:
  user-invocable: true
  disable-model-invocation: true
---

# /implement — Implement the Approved Plan (Manual)

Execute the approved contract by implementing the required changes, writing tests,
and verifying the result step by step.

**Requires an approved contract. Will not proceed without it.**

> Prefer `/run-approved` for the full autonomous pipeline. Use `/implement` when you
> want manual control over each stage.

---

## Steps

### 1. Gate Check

Read `.agent/state/workflow.json`. Check:
- `plan_approved === true`
- `state` is `"APPROVED"` or `"IMPLEMENTING"`

If either fails:
> "No approved plan found. Run `/approve-plan` first." — stop.

Find `.agent/state/approval-<feature-id>.json`. Verify `status === "approved"`.
If not found:
> "Approval token missing. Run `/approve-plan` first." — stop.

Load `.agent/contracts/contract-<feature-id>.json`. Confirm `status === "approved"`.

### 2. Update Workflow State → IMPLEMENTING

Update `.agent/state/workflow.json`:
- `state = "IMPLEMENTING"`
- `last_updated = <now>`

### 3. Activate implementation Skill

Activate the `implementation` skill:
- Verify the pre-implementation checklist (allowed_paths, forbidden_paths,
  expected_files, dependencies, test_requirements, security_requirements).
- Implement each requirement as a discrete step.
- Write required tests.

### 4. Ensure Tests

Confirm every item in the contract's `test_requirements` is covered by a test file.
If any are missing, write them within `allowed_paths`.

### 5. Scope Check

Update `.agent/state/workflow.json`: `state = "SCOPE_CHECK"`.

Activate the `scope-guard` skill.

If scope FAILS:
- Update `state = "BLOCKED"`, `scope_status = "failed"`.
- Report all violations.
- **STOP.** Do not expand scope automatically.

If scope PASSES:
- Update `scope_status = "passed"`.

### 6. Run Verification

Update `.agent/state/workflow.json`: `state = "VERIFYING"`.

Execute `bash scripts/verification/verify.sh`.

Write `.agent/reports/latest.json` and `.agent/reports/latest.md`.
Archive to `.agent/reports/history/`.

If verification fails:
- Increment `iteration`.
- If `iteration >= max_iterations`: set `state = "FAILED"`, stop.
- Otherwise: activate `fixer` skill, then re-run verification.

### 7. Report to the User

Tell the user:
- Files created and modified.
- Tests written.
- Scope guard verdict.
- Verification result (pass/fail, iteration N of max_iterations).
- "Run `/verify` for an independent verification pass."
- "Run `/security` for the security review."
- "Or run `/run-approved` to execute the full pipeline autonomously."
