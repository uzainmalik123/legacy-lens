# scripts/agent — Agent Helper Scripts

This directory holds shell scripts invoked by agent pipeline stages.

## Intended scripts (not yet implemented)

| Script | Purpose |
|---|---|
| `archive-report.sh` | Copy a current report from `.agent/reports/` into `.agent/reports/history/` with a timestamp prefix. |
| `record-approval.sh` | Write a human approval token to `.agent/state/approval-<plan-id>.json`. |
| `check-approval.sh` | Verify that an approval token exists for the current plan before the Implementer runs. |

## Conventions

- Scripts must be POSIX-compatible shell where possible.
- Scripts must not read or write outside the repository root.
- Scripts must not access environment variables containing secrets.
- Each script must exit with code `0` on success and non-zero on failure.
