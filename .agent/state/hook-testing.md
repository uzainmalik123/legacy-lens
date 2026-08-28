# Hook Testing Plan

## Purpose

Before implementing enforcement logic in `.bob/hooks/pre-tool-policy.sh`, we need to
understand the exact JSON payload structure that Bob sends to a `PreToolUse` hook.
This document describes how to safely test and inspect the hook payload.

## Current Hook Behaviour

The hook at `.bob/hooks/pre-tool-policy.sh` is in **diagnostic mode only**:
- Reads the raw stdin payload from Bob.
- Redacts values that look like secrets.
- Writes a sanitised copy to `.agent/state/hook-diagnostics-<timestamp>.json`.
- **Always exits 0** — never blocks any tool call.

## How to Inspect a Diagnostic Record

After any Bob tool call that triggers the hook, a file will appear at:

```
.agent/state/hook-diagnostics-<YYYYMMDD-HHMMSS-mmm>.json
```

Open the most recent file to see the raw payload structure. Look for:

```bash
ls -lt .agent/state/hook-diagnostics-*.json | head -5
cat .agent/state/hook-diagnostics-<latest>.json
```

## Confirmed Payload Fields

The Bob `PreToolUse` payload is delivered via **stdin as JSON** with these confirmed fields:

| Field | Confirmed | Notes |
|---|---|---|
| `tool` | ✅ Yes | The tool being invoked (e.g. `execute_command`) |
| `input` | ✅ Yes | Arguments passed to the tool (object) |
| `session_id` | ✅ Yes | Current session identifier |
| `mode` | Unknown | Run diagnostics to discover |
| `timestamp` | Unknown | Run diagnostics to discover |
| `user_message` | Unknown | Run diagnostics to discover |

## What to Look for Before Implementing Enforcement

Confirmed answers are marked ✅. Open items still require diagnostic samples.

1. ✅ **`tool` is the stable field name for the tool being called.**
   - Use `payload.tool` in enforcement logic (e.g. `"execute_command"`).

2. ✅ **`input` is a structured object (not a string).**
   - For `execute_command`, extract `payload.input.command`.

3. **Is the `command` value a single string or array?**
   - Run diagnostics on an `execute_command` call to confirm.
   - Needed to safely grep for `sudo`, `rm -rf`, etc.

4. **Are file paths in `input` for `write_file` / `apply_diff`?**
   - Run diagnostics on a file-write call to confirm field names (`path`? `file`?).

5. ✅ **Deny mechanism confirmed: non-zero exit code blocks the tool.**
   - Denial reason is any text printed to stderr.
   - Pattern for enforcement: `echo "Policy: reason" >&2; exit 1`

## Testing Procedure

1. Run a safe Bob tool call (e.g. ask Bob to read a file or list files).
2. Check `.agent/state/` for new `hook-diagnostics-*.json` files.
3. If files appear → the hook is being invoked correctly. Inspect the structure.
4. If no files appear → the hook is not being called. Check `.bob/settings.json`
   configuration and confirm the hook path is correct.

## Confirmed Facts (as of v0.2.0)

- ✅ **Payload delivery**: stdin as JSON.
- ✅ **Deny mechanism**: non-zero exit code blocks the tool; stderr text is the denial reason.
- ✅ **Hook registration**: `.bob/settings.json` with `hooks.PreToolUse[].matcher` + `command`.
- ✅ **Tool field name**: `tool` (not `tool_name`).
- ✅ **Arguments field name**: `input` (object).

## Remaining Unknowns

- **Shape of `input.command` for `execute_command`**: string or array?
- **Field name for file path in `write_file`**: `path`? `file`?
- **Additional payload fields**: are there `mode`, `timestamp`, or `user_message` fields?

## Next Steps After Remaining Unknowns Are Confirmed

1. ✅ ~~Confirm `tool` field name.~~ Done.
2. Confirm the shape of `input.command` (string vs array) for `execute_command`.
3. ✅ ~~Confirm the deny mechanism.~~ Done — non-zero exit + stderr.
4. ✅ ~~Update `.bob/settings.json`.~~ Done.
5. Replace the diagnostic `exit 0` at the end of the hook with enforcement logic.
6. Implement specific rules:
   - Block `sudo` in any `execute_command` call.
   - Block `rm -rf`, `mkfs`, `dd`, `shutdown`, `reboot`, `poweroff` in any shell command.
   - Block `git reset --hard`, `git push --force` in any shell command.
   - Block writes to `.env*` files.
   - Block writes to paths outside the repository root.
   - Log all blocked actions with reason.

## Safety Reminder

The hook script must **never** execute any content received from stdin.
All payload values are untrusted data and must be treated as strings to inspect,
not as commands to run.
