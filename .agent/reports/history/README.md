# .agent/reports/history — Report Archive

This directory is an **append-only** archive of all past pipeline run reports.

## File Naming Convention

```
<YYYY-MM-DDTHH-MM-SS>-<stage>.md
```

Example: `2025-01-15T14-32-07-verification.md`

## Rules

- Files here are **never modified or deleted** once written — they are the audit trail.
- Each completed pipeline run appends one file per stage that produced a report.
- Archiving is performed automatically by scripts in `scripts/agent/`.
- Do not commit hand-authored files here.
