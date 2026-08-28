# /approve-plan — Approve the Current Plan

Validate the final plan and contract, present them to the human for explicit approval,
and set the workflow to APPROVED so that `/run-approved` can proceed.

**This command never implements code. It only creates the approval token.**

---

## Steps

### 1. Find the Active Plan

List `.agent/plans/` for `plan-*.md` files. If none exists:
> "No plan found. Run `/feature <description>` first." — stop.

Select the most recently modified plan. Extract the `feature_id` from the filename.

### 2. Find and Validate the Contract

Find `.agent/contracts/contract-<feature-id>.json`. If it does not exist:
> "Contract file not found for feature <feature-id>." — stop.

Read the contract. Check the `status` field:
- If `status` is already `"approved"`:
  > "This plan is already approved (approved_at: <timestamp>). Run `/run-approved` to execute it." — stop.
- If `status` is `"draft"` or `"grilled"`: proceed.
- If `status` is `"superseded"` or `"abandoned"`:
  > "This contract has status '<status>' and cannot be approved. Run `/feature` to create a new plan." — stop.

### 3. Display the Plan Summary

Show the user:

| Field | Value |
|---|---|
| Feature ID | `<feature_id>` |
| Objective | `<objective>` |
| Contract status | `<status>` |

**Requirements:**
List all items from `requirements[]` with their priority.

**Non-requirements (explicit exclusions):**
List all items from `non_requirements[]`.

**Files to be created or modified:**
- created: list from `expected_files.created`
- modified: list from `expected_files.modified`
- deleted: list from `expected_files.deleted`

**Forbidden paths (must not be touched):**
List all items from `forbidden_paths[]`.

**Dependencies to be added:**
- runtime: list from `dependencies.runtime`
- dev: list from `dependencies.dev`
If none, state "No new dependencies."

**Test requirements:**
List all items from `test_requirements[]`.

**Security requirements:**
List all items from `security_requirements[]`.

**Acceptance criteria:**
List all items from `acceptance_criteria[]`.

**Change budget:**
- Files: `change_budget.files_changed`
- Lines added: `change_budget.lines_added`
- Lines removed: `change_budget.lines_removed`

### 4. Ask for Explicit Approval

Use `ask_followup_question`:

> "Do you approve this plan and authorise implementation to proceed?"

Options:
- "Yes — approve this plan and contract"
- "No — I need to make changes first (re-run /feature or /grill)"

### 5a. If Approved

**Update the contract file** (`.agent/contracts/contract-<feature-id>.json`):
- Set `status` to `"approved"`
- Set `approved_at` to the current ISO 8601 timestamp

**Write the approval token** (`.agent/state/approval-<feature-id>.json`):
```json
{
  "feature_id": "<feature-id>",
  "status": "approved",
  "approved_at": "<ISO-8601-timestamp>",
  "contract_path": ".agent/contracts/contract-<feature-id>.json",
  "plan_path": ".agent/plans/plan-<feature-id>.md"
}
```

**Update workflow state** (`.agent/state/workflow.json`):
- `feature_id = "<feature-id>"`
- `state = "APPROVED"`
- `plan_approved = true`
- `iteration = 0`
- `scope_status = null`
- `verification_status = null`
- `security_status = null`
- `last_updated = <current ISO 8601>`

**Tell the user:**
> "Plan approved. Run `/run-approved` to begin the autonomous implementation pipeline."
> "Or run `/implement` for a manual step-by-step implementation."

### 5b. If Not Approved

Tell the user to run `/grill` for further challenges or `/feature` to revise the plan.
Do not create an approval token. Do not update workflow state.
