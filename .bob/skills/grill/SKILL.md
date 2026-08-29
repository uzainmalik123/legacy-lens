---
name: grill
description: '# /grill — Challenge the Current Plan'
metadata:
  user-invocable: true
  disable-model-invocation: true
---

# /grill — Challenge the Current Plan

Interrogate the active plan for ambiguity, missing requirements, edge cases, security
risks, and testing gaps.

**This command never implements code. No application source files are modified.**

---

## Steps

### 1. Load the Plan

Find the most recent plan in `.agent/plans/`. If none exists:
> "No plan found. Run `/feature <description>` first and stop."

Load the corresponding contract from `.agent/contracts/`. If none exists, stop.

### 2. Update Workflow State → GRILLING

Read `.agent/state/workflow.json`. Update:
- `state = "GRILLING"`
- `last_updated = <current ISO 8601>`

### 3. Activate grill-me Skill

Activate the `grill-me` skill:
- Challenge every requirement for ambiguity and completeness.
- Identify missing requirements and edge cases.
- Surface security risks (auth, input validation, output encoding, injection, SSRF,
  path traversal, secret exposure, dependency risks).
- Identify testing gaps (untested paths, missing negative tests).
- Ask the user clarifying questions using `ask_followup_question`.
- Revise the plan and contract based on user answers.
- Update contract `status` to `"grilled"`.
- Write `.agent/reports/grill.md`.

### 4. Update Workflow State → AWAITING_APPROVAL

Update `.agent/state/workflow.json`:
- `state = "AWAITING_APPROVAL"`
- `last_updated = <now>`

### 5. Present Updated Plan

Show the user:
- What changed in the plan as a result of the grill.
- Any risks that remain unresolved (with explicit "unresolved" labels).
- The updated contract status.

### 6. Inform the User

Tell the user:
- "Plan updated. Review at `.agent/plans/plan-<feature-id>.md`."
- "Contract updated at `.agent/contracts/contract-<feature-id>.json` (status: grilled)."
- "Run `/grill` again to re-challenge, or `/approve-plan` when satisfied."
