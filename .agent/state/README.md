# .agent/state — Workflow State

This directory holds lightweight, machine-readable state shared across all pipeline
stages. Agents read from and write to this directory to pass information between stages.

## Files

| File | Description |
|---|---|
| `workflow-version.json` | Canonical version of the workflow definition. Read by all agents to ensure compatibility. |
| `approval-<plan-id>.json` | Human approval token for a specific plan. Created at approval time; required before the Implementer may run. |

## Rules

- State files must be valid JSON.
- `workflow-version.json` is the only file committed in the foundation. All other state
  files are created at runtime.
- Approval tokens (`approval-*.json`) must be committed to the branch before the
  Implementer runs — this creates an auditable record in Git history.
- Do not store secrets, credentials, or environment values here.
