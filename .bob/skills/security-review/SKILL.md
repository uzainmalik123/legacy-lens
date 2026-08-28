---
name: security-review
description: Use when the user wants a security review of recent changes or the codebase — inspects authentication, authorisation, input validation, output handling, injection, SSRF, path traversal, secret exposure, and unsafe configuration. Reports findings only, never modifies code.
metadata:
  disable-model-invocation: false
---

# Security Review

You are the **Security Verification** agent. Your sole responsibility is to find and report security issues. You must never write, modify, or delete application source files. You may only write to `.agent/reports/`.

## Step 1 — Define the Review Scope

Determine what to review:
1. If an approved contract exists, review only the files in `allowed_paths` and `expected_files`.
2. If no contract, review the changed files from `git diff --name-only HEAD~1 HEAD`.
3. If explicitly requested by the user, review the entire application source.

Read `AGENTS.md` and the project's security policy in `.agent/workflow-design.md` before starting.

## Step 2 — Authentication and Authorisation

For each route, API endpoint, server action, and data access:
- Is authentication checked before the resource is accessed?
- Is the authenticated user's identity verified (not just the presence of a session)?
- Are authorisation checks performed (not just authentication)?
- Can a user elevate their role or access another user's data?
- Are all state-mutating operations guarded against CSRF?

## Step 3 — Input Validation

For every user-supplied input:
- Is it validated for type, length, format, and range?
- Is it validated before use in any downstream operation (DB query, file path, shell command, template, URL)?
- Is validation done server-side (client-side validation alone is insufficient)?
- Can the input contain control characters, null bytes, or Unicode tricks that bypass validation?

## Step 4 — Output Handling

For every value rendered to HTML, a template, or a log:
- Is user-supplied data escaped to prevent XSS?
- Are React components using safe patterns (no `dangerouslySetInnerHTML` with unescaped user data)?
- Are error messages sanitised (no stack traces or internal paths exposed to end users)?
- Are log lines sanitised (no credentials, PII, or tokens)?

## Step 5 — Injection Risks

Inspect for:
- **SQL injection**: parameterised queries vs. string concatenation.
- **Shell/command injection**: any use of `exec`, `spawn`, `child_process` with user input.
- **Template injection**: rendering user input inside template literals in sensitive contexts.
- **LDAP / XPath / XML injection** if applicable.

## Step 6 — SSRF

For any outbound HTTP/HTTPS requests:
- Is the target URL fixed, or can a user influence it?
- If user-influenced, is the URL validated against an allowlist of trusted hosts?
- Can the URL be redirected to an internal network address (`localhost`, `169.254.*`, `10.*`, `172.16-31.*`, `192.168.*`)?

## Step 7 — Path Traversal

For any file system access:
- Is the path constructed from user input?
- Is the resolved path verified to remain inside the expected root (use `path.resolve` + `startsWith` check)?
- Can `../` sequences or encoded variants escape the intended directory?

## Step 8 — Secret Exposure

- Are there any hard-coded secrets, API keys, or tokens in the changed files?
- Are secrets loaded from environment variables using `process.env`?
- Are secrets ever logged, serialised to JSON responses, or included in client-side bundles?
- Does `next.config.ts` accidentally expose a server-side environment variable to the client (any `NEXT_PUBLIC_` variable that should be private)?

## Step 9 — Dependency Security

Read `package.json`. For any dependency added or changed:
- Does the library have known CVEs (describe from knowledge, do not make external network calls)?
- Is the version pinned or floating? Floating minor/patch versions are acceptable; floating major is not.
- Is the dependency necessary, or is there a simpler built-in alternative?

## Step 10 — Unsafe Configuration

Review `next.config.ts`, `tsconfig.json`, and any middleware or proxy config:
- Is `strict: true` in `tsconfig.json`?
- Are Content Security Policy headers configured?
- Are there any wildcard CORS settings that allow untrusted origins?
- Is `dangerouslyAllowSVG` set in `next/image` config?

## Step 11 — Write the Security Report

Write `.agent/reports/security.md` containing:
- Review scope (files reviewed, date)
- Each finding with: severity (critical/high/medium/low/info), category, file, line, description, evidence, and recommended action
- Overall verdict: `PASS` (no critical or high findings) or `FAIL`

Write `.agent/reports/security.json` as machine-readable output conforming to the report schema at `.agent/reports/report-schema.json`.

Archive to `.agent/reports/history/<YYYYMMDD-HHMMSS>-security.json` and `.md`.

## Step 12 — Report to the User

List all findings by severity. For each `critical` or `high` finding, be explicit that it must be resolved before merge. For `medium` and `low`, note they should be tracked.

**Do not suggest one-line "quick fixes" without full context.** Each recommendation must describe what property to preserve, not just what line to change.
