# Legacy Lens

> **Review what legacy code means, not just what it says.**

Legacy Lens is a behavior-aware code review tool that uses **IBM Bob** to investigate legacy software changes beyond syntax and surface-level test coverage.

A one-line change in an old codebase can silently alter years of accumulated business behavior while every existing test still passes. Legacy Lens reconstructs those hidden behavioral contracts, traces their downstream impact, evaluates existing test protection, and presents the evidence a reviewer needs to make a safer decision.

---

## Demo

**Video Demo:** [https://youtu.be/htVD7ZWm7P8]

**Hackathon:** IBM TechXchange Hackathon 2026

---

## The Problem

Legacy systems rarely come with a complete explanation of the business decisions encoded inside them.

Important behavior is often distributed across:

- utility methods
- service layers
- constants
- historical tests
- downstream consumers
- edge-case handling

This creates a dangerous gap during code review.

A proposed change may:

- compile successfully
- pass every existing test
- appear harmless in the diff
- still change customer-facing business behavior

Traditional code review tools are excellent at showing **what changed**.

Legacy Lens focuses on a different question:

> **What behavior does this change threaten?**

---

## The Demo Scenario

Legacy Lens includes a controlled legacy Java billing application used to demonstrate the problem.

The proposed change is intentionally tiny:

```diff
- return value.setScale(2, RoundingMode.DOWN);
+ return value.setScale(2, RoundingMode.HALF_UP);
```

At first glance, this looks like a normal rounding cleanup.

The existing test suite still passes.

But when Legacy Lens analyzes the change using IBM Bob, it discovers that the affected function participates in an existing late-fee behavior and that changing the rounding mode can change customer-visible results.

For example:

```text
Raw late fee: 12.345

RoundingMode.DOWN    → 12.34
RoundingMode.HALF_UP → 12.35
```

The existing tests exercise values where the two rounding modes happen to produce the same result, meaning the test suite can remain green while the behavioral contract changes.

---

## What Legacy Lens Does

### Behavioral Risk Review

Legacy Lens reviews the proposed change against behavioral rules reconstructed from the existing codebase.

Instead of only showing the diff, it surfaces findings such as:

- affected behavioral rules
- severity
- business impact
- confidence
- test coverage
- recommended action
- supporting evidence

---

### Reveal Intent

**Reveal Intent** explains the role the affected legacy code appears to play in the wider business process.

For the demo billing application, Legacy Lens can trace the changed late-fee behavior through areas such as:

```text
MoneyUtils.roundLateFee
        ↓
LateFeeService.calculateLateFee
        ↓
BillingResult
        ↓
MonthlyStatementService
        ↓
CollectionsPolicy
        ↓
AccountClosureService
```

The goal is not to generate a generic explanation of a function.

The goal is to reconstruct the behavioral context surrounding it.

---

### Evidence-Backed Analysis

Legacy Lens keeps conclusions traceable.

Findings can include:

- source file
- symbol / method
- line or line range
- evidence type
- relevant source excerpt

This allows a reviewer to inspect **why** a conclusion was reached instead of trusting opaque AI-generated prose.

---

### Test Gap Detection

Existing coverage does not necessarily mean the behavior is protected.

Legacy Lens inspects the test suite and identifies whether current tests exercise inputs that would actually distinguish the proposed behavior from the existing behavior.

In the demo scenario, existing tests use values where both rounding modes return the same result.

That makes the difference invisible to the current suite.

---

### Guardrail Test Generation

When sufficient evidence is available, Legacy Lens can produce a characterization test designed to preserve the discovered legacy behavior.

The generated test targets boundary values where the current and proposed implementations diverge, giving developers a concrete guardrail before changing undocumented behavior.

---

## How IBM Bob Powers Legacy Lens

IBM Bob is used in two major ways throughout the project.

### 1. Building Legacy Lens

IBM Bob was used throughout development to help implement and verify the project across multiple engineering tasks, including:

- data-contract implementation
- runtime validation
- frontend review workspace development
- test-gap and guardrail-test experiences
- analysis-pipeline integration
- automated testing
- type checking
- build verification
- security review

Task-session summary screenshots are included in this repository under:

```text
docs/bob-session-summaries/
```

### 2. Runtime Behavioral Investigation

Bob is also part of the running Legacy Lens product.

When **Analyze Change** is triggered, Legacy Lens constructs a restricted analysis context containing only the permitted legacy application inputs:

```text
demo/legacy-billing/src/main/java/**
demo/legacy-billing/src/test/java/**
demo/legacy-billing/pom.xml
demo/legacy-billing/proposed-change.patch
```

The application invokes **IBM Bob Shell** server-side.

Bob independently investigates:

1. what changed
2. what behavior surrounds the changed code
3. which behavioral rules are affected
4. downstream dependencies
5. existing test protection
6. potential business impact
7. supporting source evidence
8. possible characterization tests

Bob returns structured analysis that is validated before Legacy Lens renders it.

The analysis UI clearly distinguishes:

```text
DEVELOPMENT FIXTURE
```

from:

```text
LIVE BOB ANALYSIS
```

Fixture data is never silently presented as live analysis.

---

## Architecture

```text
Legacy Java Application
+
Existing JUnit Tests
+
Proposed Git Patch
        │
        ▼
Restricted Analysis Context
        │
        ▼
IBM Bob Shell
        │
        ▼
Structured Analysis Output
        │
        ▼
Runtime Zod Validation
        │
        ▼
TypeScript Domain Models
        │
        ▼
Legacy Lens Review Workspace
        │
        ├── Behavioral Findings
        ├── Reveal Intent
        ├── Evidence
        ├── Test Coverage
        └── Guardrail Test
```

---

## Structured Analysis

Legacy Lens uses explicit structured contracts instead of passing raw model prose directly into the interface.

The analysis layer includes models for:

```text
Behavioral Contract
Review Report
Reveal Intent
Blast Radius
Analysis Metadata
Guardrail Test
```

Wire data uses `snake_case`, is validated with Zod, and is mapped into typed `camelCase` domain models before reaching the UI.

```text
IBM Bob output
     ↓
snake_case wire format
     ↓
Zod validation
     ↓
TypeScript mapper
     ↓
domain model
     ↓
UI
```

Malformed model output is rejected rather than silently displayed.

---

## Analysis Boundary

The included Meridian billing application is a controlled evaluation target.

The live analyzer is explicitly restricted to:

```text
demo/legacy-billing/src/main/java/**
demo/legacy-billing/src/test/java/**
demo/legacy-billing/pom.xml
demo/legacy-billing/proposed-change.patch
```

Evaluation and specification documents are deliberately excluded from the runtime analysis context so Bob must infer behavior from the application itself.

This prevents the analysis from being contaminated by predefined answers.

---

## Tech Stack

### Application

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zod

### Testing

- Vitest
- Testing Library
- happy-dom
- JUnit 5
- Maven

### AI / Analysis

- IBM Bob
- IBM Bob Shell

### Demo Target

- Java 17

---

## Project Structure

```text
app/
├── api/
│   └── analyze/
├── components/
│   ├── ReviewWorkspace.tsx
│   ├── ReviewHeader.tsx
│   ├── DiffPane.tsx
│   ├── FindingsPane.tsx
│   ├── IntentPanel.tsx
│   ├── GuardrailTestView.tsx
│   └── AnalysisProgress.tsx
│
lib/
├── analysis/
│   ├── types.ts
│   ├── parser.ts
│   ├── review.ts
│   ├── intent.ts
│   ├── metadata.ts
│   ├── blast-radius.ts
│   ├── guardrail-test.ts
│   ├── bob-client.ts
│   └── fixtures/
│
├── review-workspace/
│
demo/
└── legacy-billing/
    ├── src/
    │   ├── main/java/
    │   └── test/java/
    ├── pom.xml
    └── proposed-change.patch

docs/
└── bob-session-summaries/
```

---

## Running Legacy Lens Locally

### Prerequisites

Install:

- Node.js
- npm
- Java 17+
- Maven
- IBM Bob Shell

Clone the repository:

```bash
git clone [https://github.com/uzainmalik123/legacy-lens]
cd [legacy-lens]
```

Install application dependencies:

```bash
npm install
```

---

## Configure IBM Bob

Legacy Lens never stores the real IBM Bob API key in source control.

Create:

```text
.env.local
```

and add:

```env
BOB_API_KEY=your_ibm_bob_api_key
```

Never commit `.env.local` or your real credentials.

Verify Bob Shell is available:

```bash
bob --version
```

---

## Start the Application

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

The application initially loads deterministic development-fixture analysis.

Select:

```text
ANALYZE CHANGE
```

to trigger a live IBM Bob analysis.

---

## Run Frontend Tests

```bash
npm test
```

Type check:

```bash
npx tsc --noEmit
```

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

---

## Run the Legacy Java Tests

```bash
cd demo/legacy-billing
mvn test
```

The key idea of the demo is that the existing suite can remain green even though the proposed rounding change alters behavior for inputs not represented by the current tests.

---

## Security

Legacy Lens keeps analysis execution intentionally narrow for the hackathon prototype.

Key safeguards include:

- IBM Bob credentials remain server-side
- credentials are supplied through environment variables
- no API keys are committed to the repository
- Bob is given an explicit allowlisted analysis context
- evaluation/ground-truth documents are excluded
- generated model output is runtime validated with Zod
- malformed Bob output fails safely
- live analysis never silently falls back to fixture mode
- automated tests mock Bob execution
- generated guardrail code is displayed as data rather than automatically executed
- Bob Shell is invoked with fixed arguments rather than user-controlled shell commands

---

## Why Legacy Lens Is Different

Traditional code review asks:

> **What changed?**

Static analysis asks:

> **Does this violate a known rule?**

Test coverage asks:

> **Was this line executed?**

Legacy Lens asks:

> **What behavior has this code been preserving, does this change threaten it, and what evidence supports that conclusion?**

That distinction matters most in legacy systems where institutional knowledge has disappeared but the behavior remains embedded in the code.

---

## Future Direction

The hackathon prototype intentionally focuses on one controlled legacy application and proposed change.

A production version could extend Legacy Lens with:

- arbitrary repository analysis
- GitHub pull request integration
- persistent behavioral-contract history
- interactive blast-radius visualization
- reviewer collaboration
- generated guardrail-test validation
- historical change comparison
- policy and domain-document integration
- broader language support

---

## Team

**Team:** [Bob the Solo Builder]

**Members:**

- [Uzain Ahmed]

---

## Hackathon Submission

Built for the **IBM TechXchange Hackathon 2026**.

**Demo:** [https://youtu.be/htVD7ZWm7P8]

**Repository:** [https://github.com/uzainmalik123/legacy-lens]

---

## Legacy Lens

**Review what legacy code means, not just what it says.**