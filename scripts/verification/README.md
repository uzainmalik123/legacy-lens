# scripts/verification — Verification Scripts

This directory holds scripts that run the project's automated checks as part of the
**Verifier** pipeline stage.

## Intended scripts (not yet implemented)

| Script | Purpose |
|---|---|
| `lint.sh` | Run `npm run lint` and write output to `.agent/reports/verification.md`. |
| `typecheck.sh` | Run `tsc --noEmit` and append results to the verification report. |
| `test.sh` | Run the test suite (when configured) and append results. |
| `security-scan.sh` | Run static analysis for secrets and known vulnerabilities; write to `.agent/reports/security.md`. |
| `run-all.sh` | Orchestrate all of the above in sequence; exit non-zero if any check fails. |

## Conventions

- Scripts write their output to `.agent/reports/` — not to stdout only.
- Scripts must be idempotent: re-running them overwrites the previous report.
- Scripts must not modify application source code.
- Each script must exit with code `0` on success and non-zero on failure so the
  pipeline can gate on the result.
