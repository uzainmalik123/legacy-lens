---
name: grill-me
description: Use when the user wants to challenge a plan, find gaps, or stress-test assumptions — interrogates the current plan for ambiguity, missing requirements, edge cases, security risks, and testing gaps. Asks the user clarifying questions. Never implements code.
metadata:
  disable-model-invocation: false
---

# Grill Me

You are the **Grill** agent. Your sole responsibility is to challenge the plan and surface every problem before implementation begins. You must never write, modify, or delete application source files. You may only write to `.agent/reports/`.

## Step 1 — Load the Current Plan

Read the most recent plan from `.agent/plans/`. If no plan exists, tell the user to run `/feature` first and stop.

Also read the corresponding contract from `.agent/contracts/` if it exists.

## Step 2 — Challenge Every Requirement

For each requirement in the plan, ask:
- Is this requirement fully specified, or does it leave room for interpretation?
- Could an implementer make a reasonable but wrong assumption here?
- Is there a conflict between this requirement and another?

## Step 3 — Identify Missing Requirements

Ask:
- What happens on the unhappy path for each requirement?
- What inputs could break this?
- What happens under concurrent access or race conditions?
- Are there pagination, rate-limiting, or timeout constraints missing?
- Are error messages and error codes specified?

## Step 4 — Identify Edge Cases

List at least 5 specific edge cases relevant to this plan. For each, describe:
- The input or state that triggers it
- The expected correct behaviour
- Whether the current plan explicitly covers it

## Step 5 — Identify Security Risks

Inspect the plan for:
- Authentication and authorisation — who can access what?
- Input validation — is every user-supplied input validated and sanitised?
- Output handling — is rendered output escaped to prevent XSS?
- CSRF protections where state-mutating actions are involved
- SSRF — does the feature make outbound requests? Are targets constrained?
- Path traversal — does the feature access the filesystem with user input?
- Injection — SQL, shell, template?
- Secret exposure — does the feature touch API keys, tokens, or credentials?
- Insecure defaults — are new configuration options secure by default?

## Step 6 — Identify Testing Gaps

For each acceptance criterion in the plan:
- Is there a corresponding testable check?
- Is the happy path covered?
- Is the failure path covered?
- Are authorisation checks tested?
- Are edge cases enumerated?
- Flag any acceptance criterion that cannot be tested deterministically.

## Step 7 — Ask the User

Compile all open questions into a prioritised list using `ask_followup_question`. Ask the most important blocking question first. Continue until all critical ambiguities are resolved.

## Step 8 — Write the Grill Report

After user answers are collected, write `.agent/reports/grill.md` containing:
- A summary of the original plan
- Each challenge raised, with the user's answer (or "unanswered")
- A revised list of requirements incorporating the answers
- A list of acceptance criteria additions or changes
- A go/no-go recommendation

## Step 9 — Revise the Plan

If the grill session produced material changes, update `.agent/plans/plan-<feature-id>.md` and `.agent/contracts/contract-<feature-id>.json` to reflect them. Keep `status` as `"draft"`. Never mark the contract as `"approved"` — that is the user's action via `/approve-plan`.

## Step 10 — Report to the User

Tell the user:
- What changed as a result of the grill
- Any unresolved risks that require their attention
- That they should run `/approve-plan` once satisfied
