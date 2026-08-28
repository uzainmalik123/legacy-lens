# Legacy Lens — Hackathon MVP Product Requirements Document

**Version:** 1.0  
**Status:** Implementation Contract  
**Project:** IBM TechXchange 2026 Pre-conference Dev Day Hackathon  
**Product Name:** Legacy Lens  
**Tagline:** **Review what legacy code means, not just what it says.**  
**Primary Platform:** IBM Bob 2.0 + Next.js review interface  
**Primary Demo Language:** Java  
**Primary Demo Domain:** Legacy financial / billing / loan-servicing logic  
**Target Build:** Hackathon MVP / polished proof of concept  
**Priority Model:** P0 = required for submission, P1 = high-value if P0 is stable, P2 = stretch only  

---

# 1. Purpose of This Document

This document is the source of truth for building the Legacy Lens hackathon MVP.

It is intentionally more prescriptive than a normal product brief because the implementation will be executed largely by an AI coding agent. The goal is to reduce ambiguity, prevent scope drift, and provide measurable acceptance criteria.

If implementation behavior conflicts with this document:

1. This PRD takes precedence over inferred behavior.
2. P0 requirements take precedence over P1 and P2 requirements.
3. Explicit non-goals take precedence over opportunistic feature additions.
4. The prepared demo flow takes precedence over generic platformization.
5. Reliability of the demo takes precedence over breadth of features.
6. No implementation agent may silently expand scope.

The product must be optimized for a compelling, reliable hackathon demo rather than production completeness.

---

# 2. Executive Summary

Legacy Lens is a behavior-aware review workflow for legacy and poorly documented software.

Traditional AI reviewers are effective at spotting syntax errors, style problems, obvious bugs, and common code smells. They are less useful when the core risk is not whether a code change is syntactically correct, but whether it accidentally violates undocumented business behavior embedded in old code.

Legacy Lens uses IBM Bob to reconstruct that missing intent.

For a prepared legacy repository and proposed code change, Bob:

1. identifies the code touched by the change;
2. traces relevant callers, dependencies, conditions, constants, and tests;
3. infers business behavior and invariants;
4. stores those findings as a structured **Behavioral Contract**;
5. compares the proposed change against that contract;
6. identifies behavior that may have changed;
7. explains the business impact of that change;
8. shows evidence from the source code;
9. detects whether affected behavior has automated test protection;
10. generates characterization / guardrail tests for important unprotected behavior.

Legacy Lens therefore changes the code-review question from:

> “Is this code valid?”

to:

> “What existing behavior does this change risk breaking, and what evidence supports that conclusion?”

---

# 3. Hackathon Alignment

The solution must clearly demonstrate an improved developer workflow using IBM Bob 2.0.

Legacy Lens directly improves:

- legacy application maintenance;
- code review;
- developer onboarding into unfamiliar code;
- regression-risk analysis;
- automated test creation.

Bob must be visibly central to the workflow rather than being used only as a coding assistant.

The demo should make clear that Bob performs multiple stages of reasoning and orchestration through specialized responsibilities such as:

- repository investigation;
- intent extraction;
- dependency / blast-radius analysis;
- test-gap analysis;
- change-risk analysis;
- evidence validation;
- characterization-test generation.

The solution should also demonstrate measurable improvement through real analysis metrics rather than fabricated productivity claims.

---

# 4. Product Vision

## 4.1 Vision Statement

Legacy Lens makes legacy systems safer to change by reconstructing the business behavior hidden inside their code and reviewing proposed changes against that behavior.

## 4.2 Product Promise

Given a legacy codebase and a proposed code change, Legacy Lens should help a developer answer:

- What does the affected code actually do in business terms?
- What undocumented behavior does the existing implementation preserve?
- Which of those behaviors could this change alter?
- What downstream code may be affected?
- Is that behavior protected by tests?
- What source evidence supports the finding?
- What test should be created before accepting the change?

## 4.3 Core Differentiator

The primary differentiator is **Behavioral Contract reconstruction**.

Legacy Lens must not be positioned merely as another code reviewer or code explainer.

The differentiating workflow is:

**legacy code → inferred behavioral contract → change comparison → behavior risk → evidence → guardrail test**

---

# 5. Problem Statement

Legacy software often contains critical business logic that is:

- undocumented;
- lightly tested or untested;
- spread across multiple files;
- encoded through magic numbers, conditionals, ordering assumptions, and historical workarounds;
- understood mainly through tribal knowledge;
- maintained by developers who did not write the original implementation.

A developer can therefore make a code change that is locally reasonable but globally dangerous.

Examples include:

- changing a rounding mode that affects customer billing;
- removing a branch that represents a regulatory exemption;
- changing execution order that preserves settlement behavior;
- replacing an old date rule whose edge cases reflect business policy;
- “simplifying” a constant that encodes an external contractual requirement.

The high-cost activity is not merely reading code.

The high-cost activity is reconstructing enough context to understand whether a proposed change is behaviorally safe.

---

# 6. Target User

## 6.1 Primary User

A software developer reviewing or modifying a legacy enterprise codebase they do not fully understand.

## 6.2 Secondary User

A senior reviewer or technical lead responsible for approving changes in poorly documented systems.

## 6.3 User Characteristics

The target user:

- understands software engineering;
- can read diffs and source code;
- may not understand the historical reason behind the implementation;
- values evidence over generic AI claims;
- wants to know what behavior might change before merging;
- does not want to spend hours manually tracing dependencies.

---

# 7. Primary Demo Scenario

The MVP will use one prepared legacy Java repository representing a financial, billing, loan-servicing, or similar business-critical system.

The repository should contain:

- realistic legacy-style code;
- multiple files involved in one business flow;
- limited or incomplete documentation;
- low or incomplete test coverage;
- at least one non-obvious business rule;
- at least one downstream consumer of the affected logic.

The proposed change should look superficially reasonable while altering an undocumented business behavior.

## Recommended canonical scenario

A late-fee calculation currently uses:

`RoundingMode.DOWN`

The proposed change replaces it with:

`RoundingMode.HALF_UP`

Legacy Lens should discover that:

- the old implementation consistently rounds customer late fees downward;
- downstream monthly statement and collections logic rely on the calculation;
- the behavior is not protected by tests;
- the proposed change may increase some customer charges;
- the change therefore modifies an undocumented behavioral rule;
- a characterization test should be added before accepting the change.

The exact source code may differ, but the demo must preserve this type of cause-and-impact narrative.

---

# 8. Demo Story

The demo should tell one simple story.

### Step 1 — Developer opens a proposed change

The user sees the diff before seeing the AI analysis.

### Step 2 — Legacy Lens analyzes the affected legacy logic

Bob identifies the relevant code paths and reconstructs business intent.

### Step 3 — Legacy Lens shows a high-risk behavior change

The system does not say only:

> “The rounding behavior changed.”

It says something closer to:

> “This change modifies BR-04, which consistently rounds late-fee interest downward. The behavior affects customer billing and is currently unprotected by automated tests.”

### Step 4 — User clicks “Reveal Intent”

The interface explains the business purpose of the affected function and shows the inferred behavior tree.

### Step 5 — User sees blast radius

The interface shows downstream flows potentially affected by the modified behavior.

### Step 6 — User sees missing test coverage

Legacy Lens indicates that the affected rule is not protected by a test.

### Step 7 — User generates a guardrail test

Bob generates a characterization test capturing the current behavior.

### Step 8 — Demo closes on measurable impact

Show metrics such as:

- files inspected;
- functions traced;
- behavioral rules discovered;
- affected rules;
- untested affected rules;
- high-risk findings;
- guardrail tests generated;
- analysis duration.

---

# 9. Product Principles

All implementation decisions should follow these principles.

## 9.1 Evidence Before Confidence

Every important behavioral claim must have traceable source evidence.

The product must not present unsupported model speculation as fact.

## 9.2 Business Meaning Before Syntax

The review should explain why a code change matters to the behavior of the system.

## 9.3 One Great Workflow Before Platform Breadth

The prepared scenario must be excellent before generic repository support is attempted.

## 9.4 Deterministic Where Possible

Source locations, diffs, test execution results, file existence, dependency relationships, and generated output validation should use deterministic tooling where possible.

## 9.5 AI Inference Must Be Explicitly Labeled

Inferred intent must expose a confidence value.

## 9.6 No Hidden Scope Expansion

The implementation must not grow into a GitHub platform, authentication system, generic SaaS product, or full repository-management tool during the hackathon.

## 9.7 Demo Reliability Over Architectural Purity

Prepared data and controlled inputs are acceptable for the MVP if they preserve the real Bob analysis workflow.

---

# 10. Priority Overview

## P0 — Submission-Critical

The following must work reliably:

1. Prepared legacy Java scenario
2. Proposed change / diff
3. Bob-powered repository analysis
4. Behavioral Contract generation
5. Intent extraction
6. Change-risk analysis
7. Evidence-backed findings
8. Test-gap detection
9. Blast-radius representation
10. Guardrail / characterization-test generation
11. Structured output files
12. Review dashboard
13. Reveal Intent interaction
14. Risk / finding presentation
15. Metrics
16. Stable end-to-end demo
17. Basic error/loading states

## P1 — High Value After P0 Is Stable

1. Interactive behavior map
2. Multiple finding cards
3. Generated test preview with copy/save
4. Confidence filtering
5. Behavior-contract browsing
6. Source-evidence navigation
7. Re-run analysis button
8. Analysis stage progress UI
9. Before/after comparison for behavior
10. Run generated characterization test

## P2 — Stretch Only

1. COBOL example
2. Multiple repositories
3. GitHub repository import
4. GitHub PR integration
5. Historical behavior-contract comparison
6. Multi-change dashboard
7. Persisted projects
8. Authentication
9. Cloud-hosted analysis service
10. Generic language support
11. Organization/team features
12. Production security model
13. IDE extension

P2 must not be started until all P0 acceptance criteria pass.

---

# 11. User Stories

## US-001 — Understand affected legacy behavior

**Priority:** P0

As a developer reviewing an unfamiliar legacy change,  
I want Legacy Lens to explain the business purpose of the affected code,  
so that I do not need to manually reverse-engineer the entire flow before understanding the change.

### Acceptance Criteria

- The affected function is identified.
- At least one business-purpose explanation is generated.
- The explanation references source evidence.
- The explanation includes a confidence level.
- The explanation is written in business terms where possible.
- The system distinguishes inferred intent from verified facts.

---

## US-002 — See discovered behavioral rules

**Priority:** P0

As a reviewer,  
I want to see the behavioral rules Legacy Lens inferred from the existing code,  
so that I can understand what existing behavior the system currently preserves.

### Acceptance Criteria

- Behavioral rules have stable IDs such as `BR-01`.
- Each rule contains a description.
- Each rule contains source evidence.
- Each rule contains confidence.
- Each rule indicates test coverage status.
- Each rule can list affected/downstream components.
- Behavioral rules are available in structured JSON.

---

## US-003 — Identify behavior changed by a proposed diff

**Priority:** P0

As a reviewer,  
I want Legacy Lens to connect the proposed diff to behavioral rules,  
so that I can distinguish harmless refactoring from behavior-changing modifications.

### Acceptance Criteria

- At least one changed line maps to an inferred behavioral rule in the prepared demo.
- The review explains old behavior.
- The review explains likely new behavior.
- The review explains why the difference matters.
- Unsupported claims are not presented as certain.
- Findings contain risk severity.

---

## US-004 — See source evidence

**Priority:** P0

As a skeptical developer,  
I want every important AI finding to show evidence from the repository,  
so that I can verify the claim instead of blindly trusting the model.

### Acceptance Criteria

- High/critical findings require at least one evidence item.
- Evidence includes file path.
- Evidence should include line/range when available.
- Evidence contains a short explanation of why it supports the finding.
- Evidence snippets must not fabricate code.
- If evidence is insufficient, finding confidence must be reduced or the finding must be withheld.

---

## US-005 — Understand blast radius

**Priority:** P0

As a reviewer,  
I want to see downstream flows potentially affected by the modified behavior,  
so that I understand the broader impact of a small local change.

### Acceptance Criteria

- At least one downstream relationship is shown in the prepared demo.
- The relationship is derived from repository analysis rather than manually invented UI text.
- UI displays affected functions/files or business flows.
- Blast-radius data exists in structured output.
- The system distinguishes direct dependencies from inferred business impact where possible.

---

## US-006 — See test-protection gaps

**Priority:** P0

As a reviewer,  
I want to know whether the affected behavior is protected by tests,  
so that I can judge whether the proposed change is safe to merge.

### Acceptance Criteria

- Legacy Lens inspects existing tests.
- Each affected behavioral rule has a coverage status:
  - `covered`
  - `partially_covered`
  - `uncovered`
  - `unknown`
- The prepared scenario includes at least one `uncovered` important behavior.
- Coverage claims include evidence where possible.

---

## US-007 — Generate a guardrail test

**Priority:** P0

As a developer,  
I want Legacy Lens to generate a characterization test for important untested behavior,  
so that I can preserve known behavior before changing it.

### Acceptance Criteria

- Generated test corresponds to an identified behavioral rule.
- Test follows the repository’s existing test conventions where available.
- Test includes readable naming.
- Test is deterministic.
- Test can be saved or displayed in the interface.
- Generated test must not assert invented behavior unsupported by the Behavioral Contract.
- At least one generated test must be executable in the prepared demo repository.

---

## US-008 — Reveal legacy intent

**Priority:** P0

As a developer,  
I want an easy way to reveal the inferred intent behind legacy code,  
so that the demo gives me immediate understanding without reading every implementation detail.

### Acceptance Criteria

- UI contains a prominent `Reveal Intent` action or equivalent.
- Activating it visibly changes or expands the review experience.
- Intent is structured, not just a generic paragraph.
- Intent includes relevant rules/invariants.
- Intent links back to evidence.
- This interaction must be reliable and visually polished.

---

## US-009 — View a concise risk summary

**Priority:** P0

As a reviewer,  
I want an immediate summary of overall change risk,  
so that I know where to focus my attention.

### Acceptance Criteria

- UI displays an overall risk level or score.
- UI displays counts by severity.
- UI displays number of affected behavioral rules.
- UI displays number of affected rules without test protection.
- Risk must derive from analysis output.

---

## US-010 — Inspect the Behavioral Contract

**Priority:** P1

As an advanced reviewer,  
I want to browse all extracted rules,  
so that I can understand the behavior model beyond the current high-risk finding.

### Acceptance Criteria

- User can view a list of rules.
- Rules can be selected.
- Rule detail shows evidence, confidence, test status, and affected components.

---

## US-011 — Navigate evidence

**Priority:** P1

As a developer,  
I want to jump from a finding to the relevant source location,  
so that validation is fast.

### Acceptance Criteria

- Evidence references a file and line/range.
- UI highlights or focuses the relevant source region where practical.

---

## US-012 — Re-run analysis

**Priority:** P1

As a developer,  
I want to trigger analysis again,  
so that the demo can show Bob doing the work rather than only loading static results.

### Acceptance Criteria

- Re-run action invokes the intended analysis workflow or refreshes from newly generated output.
- UI shows progress.
- UI does not become unusable during analysis.
- Failure is handled gracefully.

---

# 12. User Scenarios

## Scenario A — Primary Demo: Hidden Rounding Rule

### Context

A developer proposes replacing `RoundingMode.DOWN` with `RoundingMode.HALF_UP`.

### Expected Legacy Lens Flow

1. User opens prepared review.
2. Diff highlights rounding-mode change.
3. Legacy Lens shows a high-risk finding.
4. Finding references a behavioral rule.
5. Behavioral rule explains current downward-rounding behavior.
6. User clicks Reveal Intent.
7. System explains the affected late-fee business logic.
8. Blast radius shows downstream billing/statement/collection usage.
9. Test-gap indicator shows the behavior is unprotected.
10. User clicks Generate Guardrail Test.
11. Generated test appears.
12. Test can be run or is shown as executable.
13. Metrics summarize analysis.

### Failure Condition

The demo fails if Legacy Lens produces only generic code-review commentary such as “changing rounding could affect precision” without linking the change to reconstructed business behavior.

---

## Scenario B — Safe Change

**Priority:** P1

A code change touches formatting or implementation detail without violating any inferred behavioral rule.

Expected behavior:

- Legacy Lens reports low risk.
- It must not manufacture a high-risk finding for dramatic effect.
- This scenario may be used only if P0 is complete.

---

## Scenario C — Uncertain Intent

**Priority:** P1

Bob finds weak or contradictory evidence.

Expected behavior:

- Confidence is low.
- Finding explicitly says evidence is insufficient.
- Product does not pretend certainty.
- User can inspect the evidence.

---

# 13. Functional Requirements

## FR-001 — Prepared Repository Input

**Priority:** P0

The system must operate on one prepared legacy Java repository.

### Constraints

- No GitHub authentication required.
- No arbitrary repository onboarding required.
- Repository may exist as a local folder, submodule, fixture, or included sample project.
- Repository must be version-controlled.
- Repository state used in demo must be reproducible.

---

## FR-002 — Proposed Change Input

**Priority:** P0

The system must have access to a proposed change.

Acceptable implementations:

- git diff between two prepared commits;
- prepared patch file;
- prepared branch comparison.

Preferred:

- deterministic git diff from prepared base and feature commits.

The UI must render the diff.

---

## FR-003 — Affected-Code Discovery

**Priority:** P0

The analysis must identify:

- changed files;
- changed functions/methods where practical;
- nearby relevant source;
- callers/dependencies where practical;
- relevant tests;
- relevant docs/comments if present.

---

## FR-004 — Intent Extraction

**Priority:** P0

Bob must produce structured intent for relevant code.

Minimum fields:

- symbol/function;
- intent summary;
- business role;
- inputs;
- outputs/effects;
- invariants;
- suspicious/magic constants;
- evidence;
- confidence.

Intent must not be generated for every file in the repository if not needed.

Analysis should be scoped around the proposed change.

---

## FR-005 — Behavioral Contract Generation

**Priority:** P0

The analysis must generate `.legacy-lens/behavior-contract.json`.

Each rule should contain:

- `id`
- `title`
- `description`
- `business_context`
- `invariant`
- `evidence`
- `confidence`
- `test_coverage`
- `related_symbols`
- `downstream_dependencies`
- `risk_if_changed`

Example conceptual schema:

```json
{
  "id": "BR-04",
  "title": "Late-fee rounding",
  "description": "Late-fee interest is rounded downward to two decimal places.",
  "business_context": "Customer billing",
  "invariant": "Calculated late fee never rounds upward.",
  "confidence": 0.93,
  "test_coverage": "uncovered",
  "risk_if_changed": "Customer charges may increase."
}
```

---

## FR-006 — Change-to-Behavior Mapping

**Priority:** P0

The system must determine which behavioral rules intersect with the proposed diff.

Output should identify:

- affected rule;
- relevant changed lines;
- previous behavior;
- expected changed behavior;
- confidence;
- business impact.

---

## FR-007 — Risk Finding Generation

**Priority:** P0

The analysis must generate `.legacy-lens/review.json`.

Finding fields:

- `id`
- `severity`
- `title`
- `summary`
- `behavior_rule_ids`
- `changed_file`
- `changed_lines`
- `business_impact`
- `evidence`
- `confidence`
- `test_coverage`
- `recommended_action`

Allowed severity:

- `critical`
- `high`
- `medium`
- `low`
- `info`

---

## FR-008 — Risk Scoring

**Priority:** P0

A simple transparent risk score should be computed.

Suggested components:

- behavior importance;
- confidence that behavior exists;
- degree of behavioral change;
- test coverage;
- blast radius.

The exact formula may remain simple.

A possible normalized conceptual formula:

`risk = behavior_importance × change_impact × confidence × coverage_multiplier × blast_radius_multiplier`

Do not present a mathematically precise-looking score if the underlying factors are arbitrary.

If a numeric score is used, the UI should also show the human-readable severity.

---

## FR-009 — Evidence Validation

**Priority:** P0

Before a high/critical finding is surfaced:

- referenced files must exist;
- referenced source content must match repository content;
- evidence must support the behavior claim;
- unsupported citations must be removed.

If evidence cannot be validated, reduce confidence or do not surface the finding as high confidence.

---

## FR-010 — Test Coverage Detection

**Priority:** P0

The analysis should locate tests relevant to the behavior.

It must classify each affected rule as:

- covered;
- partially covered;
- uncovered;
- unknown.

It must not treat mere test-file existence as proof of coverage.

---

## FR-011 — Characterization Test Generation

**Priority:** P0

The test-generation agent should receive:

- affected behavior rule;
- source evidence;
- existing test patterns;
- repository test framework;
- relevant input boundaries.

It should output a test designed to capture **current observed behavior**, not the proposed changed behavior, unless explicitly stated.

Output may be written to:

`.legacy-lens/generated-tests/`

Generated test metadata should include:

- behavior rule ID;
- test file path;
- purpose;
- expected behavior;
- generation confidence.

---

## FR-012 — Guardrail Test Execution

**Priority:** P1

If time permits, generated test should be executable through the prepared repository’s test command.

UI should show:

- generated;
- execution status;
- pass/fail.

Failure of test execution should not crash the main review interface.

---

## FR-013 — Structured Analysis Output

**Priority:** P0

The analysis workflow must output machine-readable JSON consumed by the UI.

Required directory:

```text
.legacy-lens/
├── behavior-contract.json
├── review.json
├── analysis-metadata.json
└── generated-tests/
```

Optional:

```text
.legacy-lens/
├── blast-radius.json
└── intent.json
```

UI must not depend on parsing prose from Bob chat.

---

## FR-014 — Analysis Metadata

**Priority:** P0

Generate `.legacy-lens/analysis-metadata.json`.

Fields:

- analysis ID;
- repository identifier;
- base revision;
- target revision;
- started timestamp;
- completed timestamp;
- duration;
- files inspected;
- functions/symbols traced;
- behavioral rules discovered;
- affected rules;
- untested affected rules;
- findings count by severity;
- generated tests count;
- analysis status.

---

## FR-015 — Review Dashboard

**Priority:** P0

Primary UI should be a single review workspace.

Minimum layout:

### Header

- Legacy Lens identity
- prepared repository name
- change/PR identifier
- overall risk
- analysis status

### Left Pane

- changed file selector if more than one file
- syntax-highlighted diff
- line numbers
- added/deleted styling

### Right Pane

- findings list
- selected finding details
- severity
- affected behavior
- business impact
- evidence
- confidence
- test status
- recommendation
- Generate Guardrail Test action

### Secondary Navigation

- Review
- Intent
- Behavior Map
- Tests

Do not create unnecessary navigation pages.

---

## FR-016 — Reveal Intent

**Priority:** P0

This is the primary “wow” interaction.

The action should present:

- affected function;
- plain-language business role;
- behavior tree or structured intent;
- key invariants;
- important constants/conditions;
- related behavioral rules;
- evidence.

The transition should feel deliberate and visually polished.

---

## FR-017 — Blast Radius Visualization

**Priority:** P0

Minimum viable representation may be:

- simple node graph;
- indented dependency tree;
- compact relationship diagram.

It must show at least:

changed behavior → affected function → downstream functions/business flows.

Avoid spending excessive time on graph libraries if a clean deterministic tree is sufficient.

---

## FR-018 — Findings Filter

**Priority:** P1

Allow filtering by:

- severity;
- test coverage;
- confidence.

Only implement after core review is polished.

---

## FR-019 — Generated Tests View

**Priority:** P0

The Tests view should show:

- behavior protected;
- generated test name;
- test source;
- why it was generated;
- execution status if available.

At least one test must be visible during the demo.

---

## FR-020 — Loading / Analysis Progress

**Priority:** P0

If analysis is triggered live, UI must show progress.

Suggested stages:

1. Reading diff
2. Tracing affected code
3. Extracting behavior
4. Checking tests
5. Mapping blast radius
6. Reviewing behavior change
7. Validating evidence
8. Preparing results

Progress can be derived from workflow state or simulated from genuine pipeline stages.

Do not display a false “live agent” process if analysis is entirely static.

---

## FR-021 — Error State

**Priority:** P0

UI must handle:

- missing output file;
- invalid JSON;
- analysis failed;
- no findings;
- no test framework;
- incomplete evidence.

Errors should be visible and recoverable.

The main demo should never expose raw stack traces.

---

## FR-022 — Empty / Safe State

**Priority:** P1

If no risky behavior change is detected:

- show “No high-risk behavioral changes detected.”
- still display extracted intent and contract summary.
- do not create fake findings.

---

# 14. Non-Functional Requirements

## NFR-001 — Demo Reliability

**Priority:** P0

The canonical demo flow must work repeatedly without manual repair.

Target:

- at least 3 consecutive clean demo runs before submission.

---

## NFR-002 — Performance

**Priority:** P0

Prepared analysis should complete fast enough for a live demo.

Ideal target:

- under 60 seconds.

Acceptable if analysis is precomputed for UI demonstration:

- structured results must have been genuinely generated by Bob;
- the demo should explain what was precomputed versus live.

The UI itself should load results quickly.

---

## NFR-003 — Explainability

**Priority:** P0

High-risk findings must be explainable through source evidence.

A reviewer should be able to answer:

> “Why does Legacy Lens believe this?”

within one or two interactions.

---

## NFR-004 — Confidence Transparency

**Priority:** P0

AI inference must include confidence.

Recommended representation:

- High
- Medium
- Low

Numeric confidence may be stored internally.

Do not create false precision in the UI.

---

## NFR-005 — Determinism

**Priority:** P0

The prepared scenario should produce stable findings.

Exact natural-language wording may vary, but:

- primary behavioral rule;
- primary risk;
- source evidence;
- affected flow;
- test gap;

must remain consistent.

---

## NFR-006 — Security

**Priority:** P0

For the hackathon prototype:

- no production credentials;
- no production database;
- no arbitrary shell input from UI;
- no remote code execution from user-provided repositories;
- no secrets rendered in UI;
- no destructive repository operations;
- prepared repository only.

This is not a production sandbox.

---

## NFR-007 — Privacy

**Priority:** P0

Only the prepared demo repository is analyzed.

The product must not claim enterprise privacy guarantees not implemented by the prototype.

---

## NFR-008 — Accessibility

**Priority:** P1

At minimum:

- semantic buttons;
- readable contrast;
- visible focus states;
- labels not communicated solely through color;
- severity includes text labels.

---

## NFR-009 — Responsive Layout

**Priority:** P1

Primary target is desktop/laptop demo width.

The app should not completely break on smaller screens, but mobile optimization is not a hackathon priority.

Recommended minimum optimized viewport:

1280px wide.

---

## NFR-010 — Maintainability

**Priority:** P0

Code must:

- use TypeScript;
- have clear component boundaries;
- use structured data schemas;
- avoid unnecessary dependencies;
- include automated tests for critical parsing/rendering logic.

---

## NFR-011 — Visual Quality

**Priority:** P0

The UI should appear intentional and demo-ready.

Avoid:

- generic admin dashboard appearance;
- excessive cards;
- unnecessary gradients;
- excessive animation;
- placeholder lorem ipsum;
- inconsistent spacing;
- fake data disconnected from actual analysis output.

The review screen is the visual centerpiece.

---

# 15. IBM Bob Workflow Architecture

Bob is the analysis/orchestration engine.

The workflow should use specialized responsibilities rather than one giant prompt.

## P0 Agent / Skill Responsibilities

### 15.1 Repository Investigator

Responsibilities:

- inspect diff;
- identify touched files/symbols;
- identify relevant neighboring code;
- identify callers/dependencies;
- identify tests/docs.

Output:

- investigation context.

---

### 15.2 Intent Extractor

Responsibilities:

- infer business purpose;
- identify invariants;
- identify meaningful conditions/constants;
- extract candidate behavioral rules;
- assign confidence;
- attach evidence.

Output:

- candidate intent and rules.

---

### 15.3 Blast-Radius Analyzer

Responsibilities:

- identify callers;
- identify downstream usage;
- map affected business flows where evidence supports them.

Output:

- dependency / impact relationships.

---

### 15.4 Test-Gap Analyzer

Responsibilities:

- inspect tests;
- associate tests with behavioral rules where possible;
- classify coverage.

Output:

- rule coverage statuses.

---

### 15.5 Change-Risk Reviewer

Responsibilities:

- compare diff to Behavioral Contract;
- identify changed rules;
- assign severity;
- explain business impact;
- recommend action.

Output:

- candidate findings.

---

### 15.6 Evidence Auditor

Responsibilities:

- independently verify important claims;
- reject unsupported evidence;
- lower confidence when necessary;
- ensure referenced files/lines exist.

Output:

- validated findings.

This role is important. The product must avoid a workflow where one agent invents a story and every subsequent agent repeats it.

---

### 15.7 Characterization-Test Generator

Responsibilities:

- generate tests protecting confirmed current behavior;
- follow repository test conventions;
- use identified edge cases;
- map tests to rule IDs.

Output:

- generated test files / metadata.

---

# 16. Parallelization Strategy

Where Bob supports parallel tasks/subagents, use parallel work only when dependencies allow it.

Recommended:

```text
                 Diff / affected symbols
                          |
                          v
                Repository Investigator
                          |
             +------------+-------------+
             |            |             |
             v            v             v
       Intent Agent   Blast Radius   Test Gap Agent
             |            |             |
             +------------+-------------+
                          |
                          v
                 Behavioral Contract
                          |
                          v
                 Change-Risk Reviewer
                          |
                          v
                   Evidence Auditor
                          |
                          v
                 Structured UI Output
```

Do not parallelize tasks that require the final Behavioral Contract before they can be correct.

---

# 17. Behavioral Contract Rules

## 17.1 Rule Quality Requirements

A behavioral rule should describe an externally meaningful behavior, invariant, or important system assumption.

Good:

> Interest penalties are rounded downward to two decimal places before the fixed late charge is added.

Weak:

> Method calls `setScale`.

The contract should describe behavior, not merely restate syntax.

## 17.2 Evidence Requirements

Every rule should reference one or more:

- source file;
- function;
- relevant condition;
- constant;
- caller;
- test;
- comment/document.

## 17.3 Confidence

Recommended internal ranges:

- High: >= 0.80
- Medium: 0.50–0.79
- Low: < 0.50

UI may display categorical labels.

Low-confidence rules should not produce high-severity findings unless other strong evidence exists.

---

# 18. Risk Model

Risk is not just bug probability.

Legacy Lens risk means:

**likelihood that the proposed change alters important existing behavior × impact if that behavior changes × lack of protection/detectability**

Factors:

1. Behavioral importance
2. Magnitude of change
3. Evidence confidence
4. Test protection
5. Blast radius

### Severity Guidance

#### Critical

Reserved for changes with strong evidence of major destructive/regulatory/financial impact.

Do not force a critical finding into the demo.

#### High

Behavior likely changed, impact is meaningful, and protection is weak.

Primary demo finding should likely be High.

#### Medium

Potential behavior change with limited or uncertain impact.

#### Low

Minor behavioral concern, localized risk, or well-protected change.

#### Info

Context or explanation without actionable risk.

---

# 19. UI / UX Specification

## 19.1 Overall Aesthetic

Desired feeling:

- engineering tool;
- investigative;
- serious;
- evidence-driven;
- modern;
- high information density without clutter.

Avoid making it look like a consumer chatbot.

---

## 19.2 Header

Must include:

- Legacy Lens wordmark/name;
- repository name;
- change identifier;
- overall risk;
- analysis state.

Optional P1:

- analysis duration;
- re-run action.

---

## 19.3 Review Navigation

Tabs:

1. Review
2. Intent
3. Behavior Map
4. Tests

Review is default.

---

## 19.4 Diff Pane

Requirements:

- line numbers;
- additions/deletions;
- highlighted changed region;
- changed file name;
- scrollable.

P1:

- click finding to focus relevant lines.

---

## 19.5 Finding Card

Each important finding should show:

- severity badge;
- title;
- affected behavior rule;
- concise business impact;
- confidence;
- test coverage;
- evidence count;
- recommendation.

Expanded state:

- previous behavior;
- proposed behavior;
- source evidence;
- blast-radius summary;
- Generate Guardrail Test action.

---

## 19.6 Reveal Intent Panel

Must make the product feel different from a normal code reviewer.

Suggested hierarchy:

**Business role**  
What this function exists to accomplish.

**Behavior**  
What it currently guarantees.

**Why it may exist**  
Only if confidence is sufficient; label inference.

**Rules**  
Behavioral rule IDs.

**Dependencies**  
What calls/uses it.

**Evidence**  
Where these conclusions came from.

---

## 19.7 Behavior Map

P0 minimum:

- clear relationship tree.

Example:

```text
BR-04: Downward late-fee rounding
        |
        v
calculateLateFee()
        |
        +--> MonthlyStatementService
        |
        +--> CollectionsNoticeService
        |
        +--> AccountClosureSummary
```

P1:

- interactive graph.

---

## 19.8 Tests View

Show:

- rules with tests;
- rules without tests;
- generated guardrail tests.

For generated test:

- name;
- behavior protected;
- code preview;
- generation status;
- execution status if supported.

---

# 20. Data Contracts

## 20.1 behavior-contract.json

Minimum shape:

```json
{
  "analysis_id": "LL-001",
  "rules": [
    {
      "id": "BR-04",
      "title": "Late-fee rounding",
      "description": "Late-fee interest is rounded downward.",
      "business_context": "Customer billing",
      "invariant": "Interest component does not round upward.",
      "confidence": 0.93,
      "test_coverage": "uncovered",
      "related_symbols": [],
      "downstream_dependencies": [],
      "risk_if_changed": "Customer charges may increase.",
      "evidence": []
    }
  ]
}
```

---

## 20.2 review.json

Minimum shape:

```json
{
  "overall_risk": "high",
  "risk_score": 78,
  "findings": [
    {
      "id": "F-001",
      "severity": "high",
      "title": "Undocumented late-fee behavior changed",
      "behavior_rule_ids": ["BR-04"],
      "summary": "",
      "business_impact": "",
      "confidence": 0.91,
      "test_coverage": "uncovered",
      "evidence": [],
      "recommended_action": ""
    }
  ]
}
```

---

## 20.3 analysis-metadata.json

Minimum shape:

```json
{
  "analysis_id": "LL-001",
  "status": "complete",
  "files_inspected": 14,
  "functions_traced": 23,
  "behavioral_rules": 7,
  "affected_rules": 3,
  "untested_affected_rules": 2,
  "high_risk_findings": 1,
  "generated_tests": 1,
  "duration_ms": 38000
}
```

Numbers in the actual demo must be generated from actual analysis, not manually fabricated.

---

# 21. State Model

Analysis states:

- `idle`
- `preparing`
- `investigating`
- `extracting_intent`
- `analyzing_tests`
- `mapping_impact`
- `reviewing_change`
- `validating_evidence`
- `generating_tests`
- `complete`
- `failed`

UI should map technical states to friendly labels.

---

# 22. Constraints

## 22.1 Time Constraint

This is a hackathon MVP.

Any feature that risks the reliability of the core demo should be postponed.

## 22.2 Repository Constraint

P0 supports one prepared repository.

No arbitrary public GitHub repository import is required.

## 22.3 Language Constraint

P0 supports Java only.

Architecture may be extensible, but the UI must not imply validated support for languages not demonstrated.

## 22.4 Integration Constraint

No GitHub OAuth, App installation, webhook, or PR API integration for P0.

## 22.5 Infrastructure Constraint

Avoid backend/platform complexity unless required for Bob-to-UI communication.

Structured local files are acceptable.

## 22.6 Model Reliability Constraint

AI-generated findings require evidence and confidence.

## 22.7 Demo Constraint

The canonical demo must not depend on unstable third-party APIs beyond services essential to Bob itself.

## 22.8 Security Constraint

Do not execute arbitrary repository commands based on AI-generated text.

## 22.9 Scope Constraint

P2 features are forbidden until P0 is complete and verified.

---

# 23. Explicit Non-Goals

The MVP is NOT:

- a GitHub App;
- a full pull-request management platform;
- a generic code-review SaaS;
- a replacement for static analysis;
- a full legacy modernization tool;
- an autonomous code migration system;
- a multi-tenant production service;
- a generic source-code search engine;
- a universal test-generation product;
- a chatbot over a repository.

Do not implement:

- login/signup;
- user profiles;
- team management;
- billing;
- database-backed project storage;
- webhook processing;
- GitHub OAuth;
- GitHub App installation;
- Slack;
- notifications;
- admin portal;
- enterprise RBAC;
- production deployment pipeline;
- IDE extension;
- arbitrary repository upload;
- real-time collaboration.

---

# 24. Technical Direction

## 24.1 Frontend

Preferred:

- Next.js
- TypeScript
- existing project styling system

The exact component library is implementation-dependent.

Do not introduce a large UI dependency solely for one component unless justified.

## 24.2 Analysis Output

Preferred bridge between Bob and UI:

Bob workflow → `.legacy-lens/*.json` → Next.js UI

This keeps Bob visibly central and avoids unnecessary API integration.

## 24.3 Source Control

Prepared demo repository should use commits/branches allowing deterministic diff generation.

## 24.4 Tests

The Legacy Lens application itself must have tests for critical data parsing / transformation logic.

The sample legacy repository should support at least the generated characterization test needed for the demo.

---

# 25. Testing Requirements

## 25.1 Product Unit Tests — P0

Test:

- Behavioral Contract parser/schema handling;
- review parser;
- risk presentation mapping;
- invalid/missing JSON handling;
- severity mapping;
- coverage-state mapping.

## 25.2 UI Tests — P0

At minimum verify:

- primary finding renders;
- Reveal Intent interaction works;
- generated test view renders;
- empty/error state does not crash.

## 25.3 End-to-End Demo Test — P1

Automate core path if time permits:

1. open review;
2. inspect high-risk finding;
3. reveal intent;
4. open behavior map;
5. generate/view guardrail test.

## 25.4 Analysis Validation — P0

Before demo:

- behavioral rule exists;
- evidence path exists;
- evidence content matches;
- primary finding maps to rule;
- generated test maps to rule;
- structured output validates.

---

# 26. Failure Handling

## 26.1 Bob Analysis Fails

The system must:

- retain last valid analysis when appropriate;
- show analysis failed;
- not overwrite valid results with malformed output;
- allow retry.

## 26.2 Invalid JSON

UI should:

- show clear error;
- not white-screen;
- identify which analysis artifact is invalid.

## 26.3 No Tests Found

Display:

`No existing automated protection found for this behavior.`

Do not treat absence of tests as analysis failure.

## 26.4 No Findings

Display a credible safe state.

Do not fabricate findings.

## 26.5 Evidence Missing

Downgrade or suppress finding.

High confidence without evidence is not allowed.

---

# 27. Observability and Metrics

Record actual metrics during analysis.

Required P0:

- analysis duration;
- files inspected;
- behavioral rules extracted;
- affected behavioral rules;
- test gaps;
- high-risk findings;
- generated tests.

P1:

- symbols/functions traced;
- evidence items validated;
- percentage of affected rules protected by tests.

Do not claim:

- percentage productivity improvement;
- hours saved;
- bug reduction percentages;

unless those numbers were measured.

---

# 28. Success Metrics for Hackathon Demo

The prototype is successful if a judge can understand within approximately 60 seconds:

1. the problem;
2. why ordinary code review misses it;
3. what Behavioral Contracts are;
4. why the prepared change is risky;
5. how Bob found that risk;
6. what evidence supports it.

Technical success requires:

- full prepared flow works;
- structured Behavioral Contract exists;
- high-risk finding exists;
- finding contains evidence;
- blast radius exists;
- test gap detected;
- guardrail test generated;
- UI renders everything reliably.

---

# 29. Definition of Done — P0

P0 is DONE only when all conditions below pass.

## Analysis

- [ ] Prepared Java repository exists.
- [ ] Prepared diff exists.
- [ ] Bob identifies affected code.
- [ ] Bob produces structured intent.
- [ ] Behavioral Contract JSON generated.
- [ ] At least one meaningful behavioral rule exists.
- [ ] Diff maps to that rule.
- [ ] High-risk finding explains business impact.
- [ ] Finding contains verified source evidence.
- [ ] Blast radius exists.
- [ ] Test gap is correctly detected.
- [ ] Characterization test is generated.
- [ ] Generated test is credible and tied to the rule.
- [ ] Analysis metadata is generated.

## UI

- [ ] Diff renders.
- [ ] Overall risk renders.
- [ ] Finding renders.
- [ ] Evidence renders.
- [ ] Reveal Intent works.
- [ ] Behavior Map works.
- [ ] Tests view works.
- [ ] Generated test renders.
- [ ] Loading state exists.
- [ ] Error state exists.
- [ ] UI is visually polished.

## Quality

- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Product tests pass.
- [ ] Build passes.
- [ ] Canonical demo works three times consecutively.
- [ ] No P2 work remains mixed into P0 implementation.
- [ ] No fake analysis metrics.
- [ ] No unsupported AI claims presented as certain.

---

# 30. Implementation Order

Implementation should proceed in this order unless the approved plan gives a strong reason otherwise.

## Phase A — Demo Fixture

1. select/create prepared legacy Java repository;
2. establish base commit;
3. establish proposed change commit;
4. verify behavioral trap manually;
5. ensure repository has enough structure for blast-radius analysis;
6. ensure at least one missing test is realistic.

## Phase B — Analysis Contract

1. define JSON schemas;
2. define evidence format;
3. define confidence format;
4. define analysis state;
5. create Bob skills/subagent instructions.

## Phase C — Bob Analysis Pipeline

1. affected-code discovery;
2. intent extraction;
3. blast-radius analysis;
4. test-gap analysis;
5. Behavioral Contract assembly;
6. change-risk review;
7. evidence audit;
8. metadata output.

## Phase D — Core UI

1. shell/layout;
2. diff pane;
3. findings pane;
4. evidence display;
5. intent panel;
6. behavior map;
7. tests view;
8. loading/error states.

## Phase E — Guardrail Test

1. test generation skill;
2. structured generated-test output;
3. UI preview;
4. execution if feasible.

## Phase F — Polish / Demo

1. metrics;
2. animations/transitions only where useful;
3. demo reset path;
4. repeated dry runs;
5. final screenshots/video.

---

# 31. Agent Implementation Rules

All implementation agents must follow these rules.

1. Read this PRD before planning a feature.
2. Do not add features not listed here without explicit approval.
3. Prefer P0 over P1.
4. Do not begin P2 before P0 Definition of Done passes.
5. Reuse existing project patterns.
6. Avoid adding dependencies unless necessary.
7. Every P0 feature must have acceptance criteria mapped to implementation.
8. AI analysis output must be structured.
9. UI must consume structured artifacts rather than scrape Bob chat text.
10. High-risk findings require evidence.
11. Generated tests must map to Behavioral Contract rule IDs.
12. Do not fabricate metrics.
13. Do not fake Bob analysis in UI if it did not occur.
14. Do not introduce GitHub auth/webhooks.
15. Do not turn Legacy Lens into a generic chat interface.
16. Do not refactor unrelated code during feature implementation.
17. Run verification after each implementation batch.
18. Keep the canonical demo scenario operational throughout development.

---

# 32. Plan-Grill Questions Bob Must Resolve Before Implementation

Before final implementation begins, the planning/grill workflow should explicitly resolve:

1. Which Java demo repository/scenario will be used?
2. What are the exact base and proposed-change revisions?
3. What is the canonical undocumented behavioral rule?
4. What files form the blast radius?
5. What test framework exists in the demo repository?
6. Where will Bob workflow outputs be written?
7. How will Next.js load those outputs?
8. Which analysis stages will run live during the demo?
9. Which stages, if any, will be precomputed for reliability?
10. What constitutes evidence validation?
11. What risk-scoring representation will be shown?
12. What UI styling direction will be used?
13. What is the reset/re-run procedure for the canonical demo?
14. What happens if Bob produces malformed output?
15. What exact action generates the characterization test?
16. Will the generated test be executed live or only displayed?
17. What metrics are truly measurable before submission?

The planner should not invent answers when repository inspection can determine them.

---

# 33. Recommended Demo Script

## Opening — Problem

“Most AI code reviewers understand the code that changed. The hard part in legacy software is understanding the behavior nobody documented.”

## Show Change

Open the small rounding change.

“This looks harmless.”

## Reveal Finding

Legacy Lens highlights the high-risk behavioral change.

“But Bob reconstructed the surrounding behavior and discovered this is not just a rounding preference.”

## Reveal Intent

Click Reveal Intent.

“This function implements customer late-fee policy. Existing code consistently rounds downward before adding the fixed penalty.”

## Show Evidence

Show source references.

“Legacy Lens doesn’t ask you to blindly trust the model. It shows why it reached the conclusion.”

## Show Blast Radius

“This calculation feeds monthly statements and collections.”

## Show Test Gap

“And nothing currently protects the rounding behavior.”

## Generate Test

Click Generate Guardrail Test.

“Bob converts that recovered knowledge into an executable characterization test.”

## Close

“Legacy systems aren’t dangerous because the code is old. They’re dangerous because the reasons behind the code disappeared. Legacy Lens reconstructs those reasons before you change them.”

---

# 34. Stretch-Goal Gate

P1 work may begin only if:

- all P0 functional requirements are implemented;
- lint/typecheck/tests/build pass;
- canonical demo succeeds;
- no high-severity workflow bug remains.

P2 work may begin only if:

- P0 is frozen;
- demo has been recorded successfully at least once;
- submission requirements are already satisfied.

If time becomes limited, remove unfinished P1/P2 functionality rather than weakening the P0 demo.

---

# 35. Final Product Boundary

Legacy Lens P0 is one polished behavior-aware code-review demonstration powered by IBM Bob.

It is not required to be a production platform.

The strongest submission is not the one with the most features.

The strongest submission is the one that makes a judge immediately understand:

- the painful developer problem;
- the technical novelty;
- Bob’s central role;
- the evidence behind the result;
- the measurable impact;
- and why this workflow would matter in real legacy maintenance.

**The core artifact is the Behavioral Contract.  
The core insight is change-vs-intent review.  
The core wow moment is Reveal Intent.  
The core action is Generate Guardrail Test.**
