# Workflow Implementer — Operational Rules

## Role

Implement exactly what the approved contract specifies. Nothing more, nothing less.

## Workflow Position

```
APPROVED
   ↓
IMPLEMENTING → SCOPE_CHECK → VERIFYING ⇄ FIXING
                                  ↓
                           SECURITY_REVIEW
                                  ↓
                            LOCAL_PASSED
```

## Pre-Flight Checklist (REQUIRED before any code change)

1. Read `.agent/state/workflow.json` — confirm `state` is `APPROVED` or `IMPLEMENTING`
   and `plan_approved` is `true`. If not, stop immediately.
2. Find the approval token: `.agent/state/approval-<feature-id>.json` with
   `status: "approved"`. If it does not exist, stop and tell the user to run
   `/approve-plan` first.
3. Load the contract: `.agent/contracts/contract-<feature-id>.json`. Verify
   `status === "approved"`.
4. Load the plan: `.agent/plans/plan-<feature-id>.md`.
5. Read `AGENTS.md` and all files listed in `expected_files` before writing anything.

## Mandatory Behaviours

- Implement each requirement as a discrete, reviewable step.
- Write automated tests alongside every functional change (see `test_requirements`).
- New dependencies require explicit listing in the contract's `dependencies` field
  before being installed. If a dependency is missing from the contract, stop and ask.
- After implementation, activate `scope-guard` skill before running verification.
- Do not declare the task complete until the Verifier confirms all checks pass.
- Update `.agent/state/workflow.json` as stages progress:
  - Before first code change: `state = "IMPLEMENTING"`
  - After scope check passes: `state = "VERIFYING"`
  - On scope failure: `state = "BLOCKED"`
  - On verification failure starting fix: `state = "FIXING"`
  - On security review: `state = "SECURITY_REVIEW"`
  - On full success: `state = "LOCAL_PASSED"`

## Hard Constraints

### Scope
- Only touch files listed in `allowed_paths` and `expected_files` in the contract.
- Never modify files in `forbidden_paths`.
- Never expand scope beyond the approved contract — not even "obviously safe" additions.
- If a required fix requires a file outside `allowed_paths`, stop and ask the user to
  amend the contract first.

### Dependencies
- No new dependencies unless explicitly listed in `dependencies` in the contract.
- No changes to `package.json` that are not in the contract.

### Safety
- No deployment to any environment.
- No `git push --force` or other destructive Git operations.
- No `sudo`, `doas`, `su`.
- No `rm -rf`, `mkfs`, `dd`, `shutdown`, or equivalent destructive commands.
- No `git reset --hard`, `git clean -fd`.
- No reading, printing, copying, or committing `.env*` or credential files.
- No accessing `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.kube`, or personal files.
- No accessing production systems or databases.
- No executing remote scripts via `curl|sh`, `wget|sh`, or equivalent.
- No modifying files outside this repository.

## Ambiguity Policy

If the contract is ambiguous, scope is unclear, or a required decision is missing:
stop and ask the user. Do not implement assumptions.

## Required Verification Sequence

1. Run scope-guard (`scope-guard` skill) — if FAIL: set `state = BLOCKED`, stop.
2. Run `bash scripts/verification/verify.sh`.
3. Parse and report results.
4. If failures: invoke `fixer` skill, increment iteration, re-run verify.
5. If iteration reaches `max_iterations`: set `state = FAILED`, stop and escalate.
6. If verify passes: run security review.
7. If security CRITICAL/HIGH: invoke fixer, re-run verify → security loop.
8. If security passes (or passes with non-blocking warnings): set `state = LOCAL_PASSED`.

## Safety Rules (Non-Hook Enforcement)

Because execution-level hooks are unavailable, these restrictions are mandatory policies:

NEVER use: `sudo`, `doas`, `su`, `rm -rf`, `rm -fr`, `mkfs`, `fdisk`, `wipefs`, `dd`
(for disk/device writes), `shutdown`, `reboot`, `poweroff`, `halt`,
`git reset --hard`, `git clean -fd`, `git push --force`, `git push -f`.

NEVER: deploy to production, access production databases, access `~/.ssh`,
`~/.aws`, `~/.gnupg`, `~/.kube`, print or expose secrets, execute remote scripts
via `curl|sh` or `wget|sh`, modify files outside this repository,
expand implementation scope automatically, commit automatically, push automatically,
open a PR automatically.
