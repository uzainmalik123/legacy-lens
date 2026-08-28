# /status — Workflow Status Summary

Show the current state of the agentic development workflow: active feature, state
machine position, plan approval, verification results, and next recommended action.

**Read-only. Never modifies any file.**

---

## Steps

### 1. Read Workflow State

Read `.agent/state/workflow.json`. Extract:
- `workflow_id`, `feature_id`, `state`
- `iteration`, `max_iterations`
- `plan_approved`
- `scope_status`, `verification_status`, `security_status`
- `last_updated`

### 2. Read the Active Plan

List `.agent/plans/` for `plan-*.md` files. Note the most recently modified plan.
If `feature_id` is set in workflow state, look for `plan-<feature-id>.md`.

### 3. Read the Active Contract

Find `.agent/contracts/contract-<feature-id>.json` (matching the plan). Extract:
- `status` (draft / grilled / approved / superseded / abandoned)
- `approved_at`
- `objective`
- `change_budget`

### 4. Read Approval Token

Find `.agent/state/approval-<feature-id>.json` (if any). Note `status` and `approved_at`.

### 5. Read Verification Report

Read `.agent/reports/latest.json` if it exists. Extract:
- `overall_status`
- `iteration`
- `timestamp`
- Count of open findings (by severity).

### 6. Read Security Report

Read `.agent/reports/security.json` if it exists. Extract:
- `overall_status`
- Count of findings by severity.

### 7. Read Scope Guard Report

Read `.agent/reports/scope-guard.json` if it exists. Extract the overall verdict.

### 8. Present the Status Table

```
=== Workflow Status ===

Feature:            <feature_id or "none">
State:              <state>
Plan:               <path or "none">
Contract status:    <draft / grilled / approved / none>
Plan approved:      <true / false>
Approved at:        <timestamp or "not approved">
Iteration:          <N of max_iterations>
Scope:              <passed / failed / not run>
Verification:       <passed / failed / not run>
Security:           <passed / failed / not run>
Last updated:       <last_updated>
```

### 9. List Open Findings

If the latest verification or security report has open findings, list them:
(max 10, sorted by severity: critical → high → medium → low → info)

```
Open Findings:
  [CRITICAL] <category>: <message> (<file>:<line>)
  [HIGH]     <category>: <message>
  ...
```

### 10. Suggest the Next Action

Based on the current state, tell the user the next recommended step:

| State | Next Action |
|---|---|
| `IDLE` or no plan | Run `/feature <description>` to start planning. |
| `PLANNING` | Planning in progress — wait for completion. |
| `GRILLING` | Grill in progress — wait, or run `/grill` to re-challenge. |
| `AWAITING_APPROVAL` | Review the plan, then run `/approve-plan`. |
| `APPROVED` | Run `/run-approved` for the autonomous pipeline, or `/implement` for manual. |
| `IMPLEMENTING` | Implementation in progress. |
| `SCOPE_CHECK` | Scope check in progress. |
| `VERIFYING` | Verification in progress. |
| `FIXING` | Fixer in progress. |
| `SECURITY_REVIEW` | Security review in progress. |
| `LOCAL_PASSED` | All checks passed. Review with `git diff`, then commit and push. |
| `BLOCKED` | Scope violation. Review `.agent/reports/scope-guard.md` and resolve. |
| `FAILED` | Iteration limit reached. Human intervention required. Review reports. |
| `CI_PENDING` | CI running. Check your CI dashboard. |
| `PASSED` | Fully passed. Ready for merge. |
