# .agent/contracts — Interface & Behaviour Contracts

This directory holds contracts that describe what components must do, independent of
how they do it. Contracts are the shared vocabulary between the Planner, Implementer,
and Verifier agents.

## What belongs here

- **Component contracts** — inputs, outputs, and invariants for a module or API route.
- **Agent contracts** — the expected input/output schema for each pipeline stage.
- **Integration contracts** — agreements between this service and external APIs.

## What does NOT belong here

- Implementation details or code snippets.
- Secrets, credentials, or environment-specific values.

## File Naming Convention

```
<scope>-<short-slug>.md
```

Examples:
- `component-user-profile.md`
- `agent-verifier.md`
- `integration-stripe-webhooks.md`
