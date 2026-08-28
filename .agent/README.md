# .agent — Agentic Workflow State & Reports

This directory is the machine-readable home of the repository's agentic development
workflow. It is **not** application source code. Human developers and automated agents
both read and write here as part of the structured development pipeline.

Do not place application source code, secrets, or credentials in this directory.

---

## Directory Map

### `plans/`
Active and pending work plans produced by the **Planner** agent. Each plan is a
structured document describing a feature or change, the files it will touch, and the
acceptance criteria it must satisfy. Plans await human approval before an Implementer
agent acts on them.

### `contracts/`
Interface and behaviour contracts between agents and between agents and the codebase.
A contract specifies what a component must do (inputs, outputs, invariants) without
prescribing implementation. Contracts are authored once and referenced by Planner,
Implementer, and Verifier agents to stay aligned.

### `reports/`
Output reports from automated agents — lint results, type-check summaries, security
scan findings, and verification outcomes. The latest report for each agent stage is
written here and overwritten on every run so the current state is always in one place.

### `reports/history/`
Append-only archive of past reports. Every completed pipeline run appends a
timestamped snapshot here, providing a full audit trail of how the codebase has
evolved under agentic development.

### `state/`
Lightweight machine-readable state shared across all agents in the pipeline.
Includes the canonical workflow version file and any inter-agent hand-off tokens
(e.g. "last approved plan hash", "current pipeline stage").

---

## Guiding Principles

1. **Repository-owned** — the workflow lives with the code, not in an external service.
2. **Human in the loop** — no agent proceeds past the Planner stage without explicit
   human approval of the generated plan.
3. **Audit trail** — every agent action that produces a report is archived in
   `reports/history/`.
4. **Minimal footprint** — agents write only to `.agent/`, `scripts/`, and the
   application source they are explicitly authorised to touch.
5. **No secrets here** — credentials, tokens, and `.env` files must never be written
   into this directory.

---

See [`workflow-design.md`](./workflow-design.md) for the full pipeline architecture.
