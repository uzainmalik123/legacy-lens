---
name: feature
description: '# /feature — Plan a New Feature'
metadata:
  user-invocable: true
  disable-model-invocation: true
---

# /feature — Plan a New Feature

Research the repository, produce a complete implementation plan and machine-readable
contract, challenge the plan with grill-me questioning, and stop for human approval.

**This command never implements code. No changes are made to application source.**

---

## Steps

### 1. Acknowledge

Acknowledge the feature request in one or two sentences. If the request is ambiguous,
use `ask_followup_question` to clarify before proceeding. Ask about:
- The problem being solved
- Success criteria from the user's perspective
- Known constraints (performance, compatibility, timeline)

### 2. Update Workflow State → PLANNING

Read `.agent/state/workflow.json`. Update:
- `feature_id` = generated slug (e.g. `feat-<short-name>`)
- `state = "PLANNING"`
- `plan_approved = false`
- `iteration = 0`
- `scope_status = null`
- `verification_status = null`
- `security_status = null`
- `last_updated = <current ISO 8601>`

### 3. Activate feature-planner Skill

Activate the `feature-planner` skill:
- Inspect the repository (architecture, conventions, affected files, dependencies,
  existing tests, existing contracts and approvals in `.agent/state/`).
- Identify files to create, modify, and that must not be touched.
- Identify risks (technical, security, scope, testing gaps).
- Write `.agent/plans/plan-<feature-id>.md`.
- Write `.agent/contracts/contract-<feature-id>.json` (status: `"draft"`).

### 4. Update Workflow State → GRILLING

Update `.agent/state/workflow.json`: `state = "GRILLING"`, `last_updated = <now>`.

### 5. Activate grill-me Skill

Activate the `grill-me` skill immediately after the plan is produced:
- Challenge every requirement for ambiguity and completeness.
- Identify missing edge cases, error paths, and security risks.
- Identify testing gaps.
- Ask the user clarifying questions using `ask_followup_question`.
- Revise the plan and contract based on user answers.
- Update contract `status` to `"grilled"`.
- Write `.agent/reports/grill.md`.

### 6. Update Workflow State → AWAITING_APPROVAL

Update `.agent/state/workflow.json`:
- `state = "AWAITING_APPROVAL"`
- `last_updated = <now>`

### 7. Present Final Plan

Stop and present the final plan to the user:
- Summary of objective, requirements, non-requirements.
- Files to be created/modified.
- Test requirements.
- Security requirements.
- Change budget.
- Key risks.

### 8. Inform the User

Tell the user:
- "Review the plan at `.agent/plans/plan-<feature-id>.md`."
- "Review the contract at `.agent/contracts/contract-<feature-id>.json`."
- "Run `/grill` again at any time to re-challenge the plan."
- "Run `/approve-plan` when you are satisfied to unlock implementation."
- "Run `/run-approved` after approval for the full autonomous pipeline."

---

**Gate:** Do not proceed to implementation. Do not write application code.
Do not create an approval token. Stop at AWAITING_APPROVAL.
