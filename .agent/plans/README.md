# .agent/plans — Work Plans

This directory holds active and pending work plans produced by the **Planner** agent.

## File Naming Convention

```
<YYYY-MM-DD>-<short-slug>.md
```

Example: `2025-01-15-add-user-auth.md`

## Plan Lifecycle

1. Planner writes a plan file here.
2. Grill annotates the plan (in-place or as a sibling `*.grill.md` file).
3. Human reviews and records approval in `.agent/state/approval-<plan-id>.json`.
4. Implementer consumes the approved plan.
5. Completed plans are archived by moving them to `.agent/reports/history/`.

Plans that are rejected or superseded should be prefixed with `REJECTED-` or
`SUPERSEDED-` rather than deleted, to preserve the decision record.
