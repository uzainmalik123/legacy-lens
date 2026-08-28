# .agent/reports — Agent Stage Reports

This directory holds the **latest** output report from each agent stage. Each file is
overwritten on every pipeline run so that the current state of the codebase is always
reflected here in one place.

## Report Files (created when the corresponding agent runs)

| File | Produced by |
|---|---|
| `grill.md` | Grill agent |
| `implementation.md` | Implementer agent |
| `scope-guard.md` | Scope Guard agent |
| `verification.md` | Verifier agent |
| `security.md` | Security Verification agent |

## History

Every completed pipeline run appends a timestamped copy of these reports to
[`history/`](./history/). Do not manually edit history files.

## Notes

- These files are **generated output** — do not edit them by hand.
- They are committed to Git so the current pipeline state is visible in code review.
- If a stage has not run yet, its report file will not exist.
