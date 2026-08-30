# Legacy Lens

> **Review what legacy code means, not just what it says.**

Legacy Lens is a behavior-aware code review prototype built for the **IBM TechXchange Hackathon 2026**. It uses **IBM Bob** to investigate a proposed change in a legacy codebase, reconstruct the surrounding behavioral rules, trace supporting evidence, identify weak test protection, and present the result as a structured review.

A change can be tiny, compile cleanly, and pass every existing test while still altering customer-facing behavior. Legacy Lens is designed for exactly that gap.

## Demo

**3-minute video:** [Watch the Legacy Lens demo](https://youtu.be/htVD7ZWm7P8)

**Repository:** [github.com/uzainmalik123/legacy-lens](https://github.com/uzainmalik123/legacy-lens)

---

## The Problem

Legacy systems accumulate business rules over years of maintenance. Those rules are often spread across utility methods, service layers, constants, tests, and downstream consumers rather than documented in one place.

That makes seemingly harmless changes risky.

A proposed change may:

- compile successfully,
- pass the existing test suite,
- look reasonable in a diff,
- and still change established behavior.

Traditional review tools are excellent at showing **what changed**.

Legacy Lens asks a different question:

> **What behavior does this change threaten?**

---

## Demo Scenario: Meridian Loan Servicing

The repository includes a controlled Java 17 legacy billing application under `demo/legacy-billing/`.

The proposed change is intentionally small:

```diff
- return value.setScale(2, RoundingMode.DOWN);
+ return value.setScale(2, RoundingMode.HALF_UP);
```

The existing JUnit suite still passes because its current inputs do not necessarily exercise values where the two rounding modes diverge.

For example:

```text
Raw value:               12.345
RoundingMode.DOWN:       12.34
RoundingMode.HALF_UP:    12.35
```

Legacy Lens uses IBM Bob to inspect the source, tests, and proposed patch and explain why that one-line change may matter beyond the method where it appears.

---

## What Legacy Lens Does

### Behavioral Risk Review

The main review workspace combines the proposed diff with Bob-generated findings.

A finding can include:

- severity,
- affected behavioral rules,
- summary,
- business impact,
- confidence,
- test coverage,
- recommended action,
- and traceable evidence.

The objective is to move review from **syntax-level inspection** toward **behavior-level reasoning**.

### Reveal Intent

**Reveal Intent** exposes the role the changed code appears to play in the wider system.

For the Meridian scenario, the affected value can be traced through code such as:

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

The UI separates inferred intent from observed evidence so reviewers can distinguish model interpretation from directly supported facts.

### Evidence-Backed Findings

Legacy Lens keeps important conclusions traceable to the code that supports them.

Evidence can include:

- source file,
- class or method,
- line or line range,
- evidence type,
- and a relevant excerpt.

This makes the analysis inspectable rather than presenting an opaque AI summary.

### Test Gap Detection

Legacy Lens does not treat “tests passed” as equivalent to “behavior protected.”

It examines whether existing tests actually exercise values capable of distinguishing the current implementation from the proposed implementation.

In the demo scenario, the existing suite contains late-fee inputs for which `DOWN` and `HALF_UP` produce the same result, so the suite can remain green while the rounding behavior changes elsewhere.

### Guardrail Test

The analysis contract supports an optional Bob-generated characterization test.

When sufficient evidence is available, Legacy Lens can surface a JUnit guardrail test targeting a boundary where the current and proposed behaviors diverge. Generated test code is displayed for review; Legacy Lens does not automatically execute model-generated code.

---

## How IBM Bob Is Used

IBM Bob is part of both the **development process** and the **running product**.

### Development with IBM Bob

Bob was used across the project for tasks including:

- feature planning and implementation,
- TypeScript and Zod data contracts,
- review workspace development,
- Reveal Intent,
- guardrail-test presentation,
- automated testing,
- verification,
- security review,
- and the live analysis pipeline.

Required IBM Bob task-session summary screenshots are included in:

[`bob-session-screenshots/`](./bob-session-screenshots/)

### Runtime Analysis with IBM Bob

When the user selects **Analyze Change**, Legacy Lens performs a live Bob analysis server-side.

The application constructs an explicit analysis context containing only these permitted inputs:

```text
demo/legacy-billing/src/main/java/**
demo/legacy-billing/src/test/java/**
demo/legacy-billing/pom.xml
demo/legacy-billing/proposed-change.patch
```

The application then invokes **IBM Bob Shell** in non-interactive mode and supplies that context through standard input.

Bob investigates:

1. what changed,
2. what behavior surrounds the changed code,
3. which behavioral rules are affected,
4. downstream dependencies,
5. existing test protection,
6. potential impact,
7. supporting evidence,
8. and, when possible, a characterization test.

Legacy Lens does not pass its private evaluation documents into the live analysis context.

---

## Live vs Fixture Mode

The application starts with deterministic development fixtures so the interface can be explored without consuming a live Bob run.

The header distinguishes between:

```text
FIXTURE
```

and:

```text
LIVE
```

A successful Bob run replaces the fixture session with the validated live result.

If live analysis fails, Legacy Lens displays an error rather than silently presenting fixture data as live output.

---

## Architecture

```text
Legacy Java Source
+ Existing JUnit Tests
+ Proposed Patch
        │
        ▼
Explicit Allowlist
        │
        ▼
Structured Analysis Prompt
        │
        ▼
IBM Bob Shell
        │
        ▼
Structured JSON Result
        │
        ▼
Zod Runtime Validation
        │
        ▼
Typed Domain Models
        │
        ▼
Legacy Lens Review Workspace
        │
        ├── Risk Findings
        ├── Reveal Intent
        ├── Evidence
        ├── Test Coverage
        └── Optional Guardrail Test
```

### Bob transport

The server-side Bob adapter uses `child_process.spawn()` with fixed arguments and `shell: false`.

The live demo call is intentionally constrained:

```text
bob run
--mode ask
--format json
--max-cost 5
--max-turns 1
--disable-mcp
--disable-subagents
--disable-tool-groups read,edit,execute
```

The application itself reads the allowlisted files and provides their contents to Bob. Bob does not need filesystem tools for the runtime analysis call.

---

## Structured Analysis Contracts

Raw model prose is never sent directly to UI components.

Legacy Lens defines runtime-validated contracts for:

- Behavioral Contract,
- Review Report,
- Reveal Intent,
- Analysis Metadata,
- Guardrail Test,
- and Blast Radius data.

The data path is:

```text
Bob output
    ↓
snake_case wire data
    ↓
Zod validation
    ↓
TypeScript mapping
    ↓
camelCase domain models
    ↓
UI
```

Malformed output is rejected before it can become application state.

---

## Analysis Boundary

The Meridian application is a controlled evaluation target.

The live runtime uses a hard-coded allowlist defined in `lib/analysis/allowlist.ts`.

The following evaluation documents exist in the repository for fixture specification and human evaluation, but are intentionally excluded from Bob's runtime context:

```text
demo/legacy-billing/GROUND_TRUTH.md
demo/legacy-billing/LEGACY_FIXTURE_SPEC.md
demo/legacy-billing/ANALYSIS_SCOPE.md
demo/legacy-billing/PROPOSED_CHANGE.md
```

This forces the live analysis to reason from the Java implementation, tests, build descriptor, and proposed patch rather than reading a predefined answer.

---

## Tech Stack

### Web application

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Zod 4

### Testing

- Vitest 4
- Testing Library
- happy-dom
- JUnit 5
- Maven Surefire

### Analysis

- IBM Bob
- IBM Bob Shell

### Legacy demo target

- Java 17
- Maven

---

## Repository Structure

```text
app/
├── api/
│   └── analyze/
│       └── route.ts
├── components/
│   ├── AnalysisProgress.tsx
│   ├── DiffPane.tsx
│   ├── FindingsPane.tsx
│   ├── GuardrailTestView.tsx
│   ├── IntentPanel.tsx
│   ├── ReviewHeader.tsx
│   └── ReviewWorkspace.tsx
└── __tests__/

lib/
├── analysis/
│   ├── allowlist.ts
│   ├── blast-radius.ts
│   ├── bob-client.ts
│   ├── bundle.ts
│   ├── guardrail-test.ts
│   ├── intent.ts
│   ├── metadata.ts
│   ├── parser.ts
│   ├── prompt.ts
│   ├── review.ts
│   ├── types.ts
│   ├── fixtures/
│   └── __tests__/
└── review-workspace/

demo/
└── legacy-billing/
    ├── src/main/java/
    ├── src/test/java/
    ├── pom.xml
    ├── proposed-change.patch
    └── evaluation/specification documents

bob-session-screenshots/

.bob/
.agent/
```

---

## Running Locally

### Prerequisites

- Node.js **20.9+**
- npm
- Java 17+
- Maven
- IBM Bob Shell available as `bob`
- IBM Bob inference API key for live analysis

### Clone and install

```bash
git clone https://github.com/uzainmalik123/legacy-lens.git
cd legacy-lens
npm install
```

### Configure IBM Bob

Create a local `.env.local` file:

```env
BOB_API_KEY=your_ibm_bob_api_key_here
```

Do not commit `.env.local` or a real API key.

Verify Bob Shell is available:

```bash
bob --version
```

### Start Legacy Lens

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The workspace initially loads in fixture mode. Select **Analyze Change** to trigger a live IBM Bob analysis.

---

## Validation and Tests

Run the web test suite:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Type check:

```bash
npx tsc --noEmit
```

Production build:

```bash
npm run build
```

Run the Meridian JUnit suite:

```bash
cd demo/legacy-billing
mvn test
```

The demo intentionally illustrates that a passing test suite does not necessarily characterize every behavior affected by a change.

---

## Security and Safety Boundaries

The hackathon prototype keeps the runtime intentionally narrow:

- IBM Bob credentials remain server-side.
- Credentials are read from environment variables.
- `.env*` files are excluded from Git and Bob access.
- Runtime source access uses an explicit hard-coded allowlist.
- Ground-truth and specification files are excluded from the live context.
- Bob Shell is invoked with fixed arguments using `spawn()` and `shell: false`.
- The runtime Bob call disables filesystem/edit/execute tool groups.
- Bob output is runtime validated before application use.
- Live failures do not silently fall back to fixture results.
- Automated tests mock Bob execution rather than spending Bobcoins.
- Generated Java tests are displayed as data and are not automatically executed.

---

## Why Legacy Lens Is Different

Traditional review asks:

> **What changed?**

Static analysis asks:

> **Does this violate a rule we already know?**

Coverage asks:

> **Was this code executed by a test?**

Legacy Lens asks:

> **What behavior has this code been preserving, does this change threaten it, and what evidence supports that conclusion?**

That question is particularly useful in legacy systems where the people who understood the original rationale may no longer be available, while the behavior itself still lives in the code.

---

## Prototype Scope

The hackathon implementation intentionally focuses on one controlled legacy Java application and one proposed change.

Future directions include:

- arbitrary repository analysis,
- pull-request integration,
- persistent behavioral-contract history,
- interactive blast-radius visualization,
- generated-test execution in a sandboxed validation environment,
- historical behavior comparison,
- policy/document evidence,
- and additional programming languages.

---

## Team

**Team:** Bob the Solo Builder

**Member:** Uzain Ahmed

---

## Hackathon Submission

Built for the **IBM TechXchange Hackathon 2026**.

- **Demo:** [https://youtu.be/htVD7ZWm7P8](https://youtu.be/htVD7ZWm7P8)
- **Repository:** [https://github.com/uzainmalik123/legacy-lens](https://github.com/uzainmalik123/legacy-lens)
- **IBM Bob task-session summaries:** [`bob-session-screenshots/`](./bob-session-screenshots/)

---

## Legacy Lens

**Review what legacy code means, not just what it says.**
