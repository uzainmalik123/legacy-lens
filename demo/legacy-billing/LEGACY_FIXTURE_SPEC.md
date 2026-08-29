# LEGACY_FIXTURE_SPEC.md
# Meridian Loan Servicing — Legacy Fixture Specification

**Status:** Authoritative contract. Do not modify without updating acceptance criteria.  
**Version:** 1.0  
**Purpose:** Governs the generation of the controlled legacy Java application used as the
analysis target for Legacy Lens demonstrations.

---

## 1. Purpose

This document is the authoritative specification for a controlled legacy Java application
called **Meridian Loan Servicing**. The application exists solely to give Legacy Lens a
realistic analysis target — a codebase that contains genuine hidden business behaviors,
distributed logic, sparse documentation, and a small but consequential proposed change.

The fixture is **not** a demonstration of bad practices. It represents realistic working
code that accumulated over years in an internal system maintained by a small team with
changing ownership. A competent Java developer can understand it after investigation.

---

## 2. Fictional System Background

**Meridian Loan Servicing** is an internal Java application used by a regional lending
institution. It processes monthly billing cycles for consumer loan accounts.

The system was originally built in the early 2000s and has been extended incrementally by
successive developers. Some original developers are no longer available. Business rules
were added pragmatically as institutional policy evolved. Most of the rationale behind
specific numeric thresholds and rounding choices was never documented — it lived in the
heads of the people who built the system, or in policy documents that have since been
archived.

The system handles:

- Monthly interest and fee calculation per account
- Late fee assessment (with hardship exemptions and grace periods)
- Monthly statement generation
- Account closure processing
- Collections eligibility determination
- Collections notice generation

It does **not** have a UI, a database, or any external service dependency. All state is
modeled in plain Java objects for simplicity.

---

## 3. Demo Objective

Legacy Lens must be able to:

1. Identify the six hidden business behaviors (BR-01 through BR-06) by reading source code.
2. Trace the blast radius of the proposed rounding change (BR-01) through downstream
   consumers.
3. Recognize that the proposed change looks cosmetically reasonable but has real observable
   consequences.
4. Note which behaviors have test coverage and which do not.
5. Produce an analysis without access to `GROUND_TRUTH.md`.

---

## 4. Technical Constraints

| Constraint         | Value                                         |
|--------------------|-----------------------------------------------|
| Language           | Java 17                                       |
| Build tool         | Maven (standard `pom.xml`)                    |
| Test framework     | JUnit 5 (via `junit-jupiter`)                 |
| Spring             | **Not allowed**                               |
| Database / SQL     | **Not allowed**                               |
| REST API           | **Not allowed**                               |
| Frontend           | **Not allowed**                               |
| Docker / K8s       | **Not allowed**                               |
| External services  | **Not allowed**                               |
| ORM                | **Not allowed**                               |
| Extra dependencies | Minimal — JUnit 5 only; no Lombok, no Guava   |
| Production files   | 15–25 meaningful classes (hard upper bound 25)|
| Test files         | 5–7 files                                     |

All code must be under `src/main/java/com/meridian/billing/` and
`src/test/java/com/meridian/billing/`. Standard Maven directory layout applies.

---

## 5. Proposed Package / Class Structure

The following is the target class layout. Individual method names and field names are
left to the implementation generator, but the package structure and class responsibilities
must be preserved.

```
com.meridian.billing
│
├── model/
│   ├── Account.java          — account id, customer ref, balance, status flags
│   ├── Customer.java         — customer id, name, hardship flag, account list
│   ├── Loan.java             — loan id, principal, outstanding balance, interest rate
│   └── BillingResult.java    — billing cycle output: fees charged, interest, total due
│
├── billing/
│   ├── BillingService.java        — orchestrates a full billing cycle for one account
│   ├── LateFeeService.java        — computes late fees; calls policy classes
│   ├── InterestCalculator.java    — computes monthly interest on outstanding balance
│   └── BillingConstants.java      — numeric constants (rates, thresholds, caps)
│
├── policy/
│   ├── HardshipPolicy.java        — enforces hardship cap; queries customer plan status
│   ├── GracePeriodPolicy.java     — computes effective days late after grace period
│   └── CollectionsPolicy.java     — determines collections eligibility from billing data
│
├── statement/
│   ├── MonthlyStatementService.java   — formats/records monthly statement per account
│   └── AccountClosureService.java     — handles account closure; reads billing result
│
├── collections/
│   ├── CollectionsService.java        — processes eligible accounts into collections
│   └── CollectionsNoticeService.java  — generates/dispatches collections notices
│
└── util/
    ├── LegacyDateUtils.java    — date helpers (days between, period overlap, etc.)
    └── MoneyUtils.java         — BigDecimal helpers, rounding, formatting
```

**Count:** 18 production classes. Additional private helpers or enums may be added inside
packages if necessary but must not exceed 25 total meaningful production files.

---

## 6. Domain Relationships

### Object ownership

- A `Customer` owns one or more `Account` objects.
- Each `Account` references one `Loan`.
- A billing cycle produces a `BillingResult` attached to an `Account`.

### Service call graph (authoritative)

```
BillingService
  ├── LateFeeService.calculateLateFee(account, daysLate)
  │     ├── GracePeriodPolicy.effectiveDaysLate(account, daysLate)   ← BR-05
  │     ├── HardshipPolicy.applyHardshipCap(customer, rawFee)        ← BR-03
  │     └── MoneyUtils.round(fee)                                    ← BR-01
  ├── InterestCalculator.calculateMonthlyInterest(loan)
  └── produces BillingResult
        ├── MonthlyStatementService.generateStatement(account, result)
        ├── AccountClosureService.process(account, result)
        └── CollectionsPolicy.isEligible(account, result)
              └── CollectionsService.enroll(account)
                    └── CollectionsNoticeService.generateNotice(account)
```

All relationships in this graph must exist in the implementation. No relationship should
be invented purely for tracing aesthetics; each must carry real logic.

---

## 7. Hidden Business Behaviors

Each behavior must be present in source code. None should be called out by a prominent
comment explaining its business rationale. Sparse inline comments are acceptable for
clarity in the style of the era, but must not give away the *why*.

---

### BR-01 — Downward Rounding (PRIMARY)

**What it does:** Late-fee interest is rounded **down** to two decimal places.

**Where it lives:** Inside `MoneyUtils` (or directly in `LateFeeService` — implementer
chooses one consistent location). Must use:

```java
value.setScale(2, RoundingMode.DOWN)
```

**Intended rationale (do NOT document in code):** The institution decided fractional
rounding must never increase a customer charge. This was a deliberate policy choice, not
an accident.

**Comment restriction:** No code comment may explain that this is a deliberate anti-charge
policy. The word "DOWN" in a constant or method is acceptable. A comment like
`// never round up — bank policy` is **forbidden**.

**Test coverage:** There must be **no** existing characterization test that asserts
behavior at the rounding boundary (e.g., a fee that produces `.005` must round to `.00`
not `.01`). This gap is intentional and is the central demo gap.

---

### BR-02 — 30-Day Penalty Threshold

**What it does:** A fixed `$15.00` penalty is added to a late fee **only when** the
account is more than 30 days late (`daysLate > 30`). Accounts that are exactly 30 days
late do **not** receive this penalty.

**Where it lives:** `LateFeeService`, using the effective days-late value after grace
period is applied.

**Implementation note:** The threshold value should appear as a named constant in
`BillingConstants` (e.g., `PENALTY_THRESHOLD_DAYS = 30`). The comparison must use strict
greater-than, not greater-than-or-equal.

**Comment restriction:** No comment may explain the boundary intent. The constant name
alone is the documentation.

**Test coverage:** A test for typical late fees may exercise this path incidentally, but
there need not be a boundary test asserting that day 30 is excluded and day 31 is
included.

---

### BR-03 — Hardship Cap

**What it does:** If the customer has an active hardship plan, the total late fee charged
(after all other calculations) must not exceed `$25.00`.

**Where it lives:** `HardshipPolicy.applyHardshipCap(Customer customer, BigDecimal rawFee)`
returns the lesser of `rawFee` and `$25.00`.

**Implementation note:** The cap value must appear as `HARDSHIP_FEE_CAP = 25.00` in
`BillingConstants`. `HardshipPolicy` must check a flag or status on `Customer` or a
nested plan object. The method must be called from `LateFeeService`.

**Test coverage:** There must be **at least one** existing test that asserts a customer
with an active hardship plan never has a late fee exceeding `$25.00`.

---

### BR-04 — Credit Balance Exclusion

**What it does:** If an account's outstanding balance is `≤ 0`, no late fee is assessed.
The method returns `BigDecimal.ZERO` immediately.

**Where it lives:** `LateFeeService`, checked early in the fee calculation method before
any other logic runs.

**Test coverage:** There must be **at least one** existing test that asserts a
zero-or-negative-balance account receives a `$0.00` late fee.

---

### BR-05 — Grace Period

**What it does:** Eligible accounts receive a 7-day grace period before effective
days-late calculations begin. The effective days-late count is `max(0, rawDaysLate - 7)`
for eligible accounts and `rawDaysLate` unchanged for ineligible accounts.

**Eligibility signal:** A boolean flag (e.g., `graceEligible`) on `Account` (or
equivalently on `Customer`, accessible via `Account`) determines eligibility. Not every
account receives the grace period. The flag must be readable by `GracePeriodPolicy`
without any other caller needing to know the eligibility rule.

**Canonical API:**

```java
// GracePeriodPolicy
public int effectiveDaysLate(Account account, int rawDaysLate)
```

This method checks `account.isGraceEligible()` (or the equivalent getter), applies the
7-day reduction only if eligible, and always returns a non-negative integer. This is the
only entry point for grace period logic; `LateFeeService` must not inline any eligibility
check or day-reduction arithmetic.

**Where it lives:** Called from `LateFeeService` before any fee arithmetic runs. The grace
period length constant must be a named constant, either in `BillingConstants` or in
`GracePeriodPolicy` itself.

**Implementation note:** `LegacyDateUtils` may provide date arithmetic helpers that
`GracePeriodPolicy` delegates to. The indirection through the policy class is what
prevents the eligibility rule from being obvious when reading `LateFeeService` alone.

**Test coverage:** There must be partial test coverage — at least:
- One test with a grace-eligible account that is exactly 7 days late receives `$0.00`
  late fee (effective days = 0, no penalty, no base fee).
- One test with a grace-ineligible account that is 7 days late receives a positive fee
  (effective days = 7, normal calculation applies).

---

### BR-06 — Collections Eligibility

**What it does:** An account does **not** enter collections merely because it is late.
Collections eligibility depends on the combination of outstanding balance **and**
accumulated fees in the billing result. A threshold (e.g., total exposure exceeding
`$500.00`) must be satisfied before the account is eligible.

**Where it lives:** `CollectionsPolicy.isEligible(Account account, BillingResult result)`
computes total exposure and compares against a threshold constant in `BillingConstants`.

**Implementation note:** This creates a genuine downstream dependency: `BillingResult`
must carry the total fees charged, and that value feeds `CollectionsPolicy`. The rounding
result from BR-01 therefore propagates into collections eligibility calculations.

**Test coverage:** There must be some existing tests for `CollectionsService` or
`CollectionsPolicy` — at minimum, one test asserting that a below-threshold account is
not enrolled, and one asserting that an above-threshold account is enrolled.

---

## 8. Existing Test Coverage

The following test files must exist. Each covers the behaviors noted.

| Test file                          | Behaviors covered                                                            |
|------------------------------------|------------------------------------------------------------------------------|
| `LateFeeServiceTest.java`          | BR-03 (hardship cap), BR-04 (credit balance), BR-05 (grace period partial)  |
| `BillingServiceTest.java`          | Basic billing cycle: interest + fee = correct total; all inputs rounding-safe|
| `CollectionsPolicyTest.java`       | BR-06 (below threshold → no collections; above → enrolled)                  |
| `HardshipPolicyTest.java`          | BR-03 (cap boundary assertion)                                               |
| `GracePeriodPolicyTest.java`       | BR-05 (eligible at exactly 7 days → $0; ineligible at 7 days → positive fee)|

Two additional test files are permitted but not required:

| Optional test file                 | Suggested content                                    |
|------------------------------------|------------------------------------------------------|
| `InterestCalculatorTest.java`      | Basic monthly interest rate calculation              |
| `MonthlyStatementServiceTest.java` | Statement contains expected fields from BillingResult|

The total test file count must remain between 5 and 7.

---

## 9. Intentional Test Gaps

The following behaviors **must not** have a characterization test:

### 9.1 BR-01 — Downward Rounding (MANDATORY GAP)

No test may assert the rounding-boundary behavior. Specifically:

- No test may use an input that produces a fee with a third decimal digit of `5` or more
  (i.e., a case where `DOWN` and `HALF_UP` disagree). The canonical rounding-sensitive
  input (`balance = 1500.00`, `rate = 0.00823`) must NOT appear in any test.
- No test method name may reference `rounding`, `roundDown`, `RoundingMode`, or similar.
- `MoneyUtils` may have other tests (e.g., zero-handling or formatting) but not any test
  that exercises `setScale(2, DOWN)` at a half-cent boundary.

All `BillingServiceTest` and `LateFeeServiceTest` inputs must be chosen so that the fee
result has at most two significant decimal digits before rounding — meaning `DOWN` and
`HALF_UP` produce identical output for those inputs. See Section 17 (Canonical Demo
Fixture) for an explicit list of safe test inputs.

This gap is the central demo scenario. Legacy Lens will identify it as a missing
characterization test for an unguarded rounding rule.

### 9.2 BR-02 — 30-Day Boundary

No test may assert the exact boundary behavior (day 30 excluded, day 31 included).
Incidental coverage from a test using `daysLate = 45` is acceptable as long as no test
explicitly probes the `30/31` boundary.

### 9.3 Surviving the Proposed Patch

After applying the one-token change `RoundingMode.DOWN` → `RoundingMode.HALF_UP`, all
existing tests must continue to pass. This is guaranteed by the constraint in §9.1: every
test input produces a fee that rounds identically under both modes. The only test that
would detect the behavioral difference is the missing BR-01 characterization test.

Implementers must verify this property by running `mvn test` against the patched version
before declaring the fixture complete (see Acceptance Criterion 12).

---

## 10. Primary Risky Change

### Baseline behavior (in fixture)

```java
// MoneyUtils (or LateFeeService)
value.setScale(2, RoundingMode.DOWN)
```

### Proposed change (NOT in fixture — applied later as a patch or separate Git revision)

```java
value.setScale(2, RoundingMode.HALF_UP)
```

### Why it looks safe

- The diff is one token: `DOWN` → `HALF_UP`.
- It appears to be a standards-cleanup: `HALF_UP` is the conventional "school math"
  rounding mode and is what most developers expect as a default.
- No existing test fails when the change is applied (because BR-01 has no test).
- A local code reviewer unfamiliar with the billing policy would likely approve it.

### Why it is not safe

- It changes the fee charged to customers in some billing cycles.
- It changes the input to `CollectionsPolicy.isEligible`, potentially changing which
  accounts enter collections.
- It changes values printed on monthly statements.
- The institutional policy of always rounding down to protect customers is silently
  violated.

### Delivery of the change

The specification does not implement this change. Later we will create either:

- A **deterministic patch file** (`proposed-change.patch`) that can be applied with
  `git apply`, or
- A **separate Git branch** (`proposed/rounding-change`) containing only this one-line
  change.

The base fixture is always the `DOWN` version. The changed version is always the
`HALF_UP` version.

---

## 11. Expected Blast Radius

When Legacy Lens traces the impact of changing `RoundingMode.DOWN` → `RoundingMode.HALF_UP`,
it should identify all of the following as affected:

| Layer                         | Why affected                                                  |
|-------------------------------|---------------------------------------------------------------|
| `MoneyUtils` / `LateFeeService` | Direct site of the rounding change                         |
| `HardshipPolicy`              | Cap comparison uses the rounded fee value                     |
| `BillingResult`               | Total fees in the result are sourced from rounded fee         |
| `BillingService`              | Assembles the result; all downstream consumers are affected   |
| `MonthlyStatementService`     | Prints fee value from BillingResult                           |
| `AccountClosureService`       | Reads total due from BillingResult                            |
| `CollectionsPolicy`           | Exposure threshold calculation uses fee from BillingResult    |
| `CollectionsService`          | Enrollment decision depends on CollectionsPolicy              |
| `CollectionsNoticeService`    | Notice generated only for enrolled accounts                   |

All of these relationships must exist in real code (not mock pass-throughs). Legacy Lens
must be able to trace each hop without inventing them.

---

## 12. Legacy Code Characteristics

The implementation should exhibit the following characteristics in a controlled and
realistic way. None of these should be pushed to cartoonish extremes.

### Acceptable legacy traits

- **Magic constants in BillingConstants:** Values like `30`, `7`, `25.00`, `500.00` must
  have named constants, but the constant names need not be self-explanatory (e.g.,
  `PENALTY_DAYS` rather than `FIXED_PENALTY_APPLIES_ONLY_WHEN_MORE_THAN_30_DAYS_LATE`).
- **Sparse comments:** Occasional `// legacy behavior` or `// added Q3 2009` style
  comments are acceptable and realistic.
- **Inconsistent but understandable naming:** Some methods use `calculateFee`, others use
  `computeCharge`; some parameters are `acct`, others `account`. Small variations are
  realistic.
- **Simple duplicated validation:** Balance null-checks or zero-checks may appear in
  more than one place, as is common in accumulated codebases.
- **Utility helper methods:** `LegacyDateUtils` may have helper methods that appear
  general-purpose but are only called from one place.
- **Distributed logic:** No single class fully explains any one business rule. BR-05
  requires reading both `GracePeriodPolicy` and `LateFeeService` to understand the full
  calculation.
- **Historical-looking patterns:** Simple field-by-field constructors, no builder pattern,
  minimal use of modern Java features beyond what Java 17 naturally encourages.

### Prohibited legacy traits

- Intentionally broken logic (NPEs, infinite loops, incorrect calculations).
- Uncompilable code.
- Code that fails its own tests.
- Deliberately obfuscated variable names.
- Gratuitous code duplication beyond what is realistic.
- Anti-patterns that would cause a reviewer to question the fixture's authenticity.

---

## 13. Ground Truth Strategy

After the fixture is implemented and validated, we will create:

```
demo/legacy-billing/GROUND_TRUTH.md
```

This document is the **private evaluation answer sheet** for Legacy Lens demo assessments.

### Contents of GROUND_TRUTH.md (to be created later)

- Full descriptions of BR-01 through BR-06 with exact source locations (file, class, method)
- Expected evidence the analysis agent should cite for each behavior
- Which behaviors have tests and which do not
- The authoritative blast radius (all nodes in the call graph affected by the rounding change)
- Which behavior the proposed change violates
- Evaluation rubric: what constitutes a correct, partial, and incorrect analysis

### Access restriction

> **GROUND_TRUTH.md must never be read by Legacy Lens analysis agents.**

It must not be included in any analysis context, prompt, or tool call. It exists
exclusively for human evaluators to score whether Legacy Lens correctly reverse-engineered
the application from source code alone.

**Do NOT create GROUND_TRUTH.md now.** It will be authored after the fixture is
implemented and the behaviors are confirmed to exist in source.

---

## 14. Explicit Non-Goals

The following are explicitly out of scope and must not appear in the implementation:

- Spring Boot or any dependency injection framework
- Database connectivity or SQL of any kind
- REST API endpoints or HTTP handling
- Frontend or template rendering
- Authentication or authorization logic
- Message brokers (Kafka, RabbitMQ, etc.)
- Caching layers (Redis, Caffeine, etc.)
- Cloud infrastructure configuration
- Docker or Kubernetes configuration
- Microservices architecture
- External API calls of any kind
- ORM or entity mapping frameworks
- Intentionally vulnerable code
- Intentionally uncompilable code
- More than 25 meaningful production classes
- Unnecessary architectural abstractions (repositories, factories, strategies) beyond
  what naturally fits the domain
- Production deployment setup of any kind

This fixture exists solely to provide realistic legacy business behavior for Legacy Lens
to analyze. Every line of code should serve that purpose.

---

## 15. Acceptance Criteria

The fixture implementation is considered complete **only** when all of the following are
true:

| # | Criterion |
|---|-----------|
| 1 | `mvn compile` succeeds with no errors. |
| 2 | `mvn test` runs all JUnit 5 tests and all pass. |
| 3 | The `src/main/java` tree contains 15–25 meaningful production Java files. |
| 4 | BR-01 through BR-06 all genuinely exist in source code and produce correct observable behavior. |
| 5 | Each behavior can be inferred by reading source code without consulting `GROUND_TRUTH.md`. |
| 6 | BR-01 is not explained by any source comment describing the anti-charge policy rationale. |
| 7 | No test specifically characterizes the BR-01 rounding boundary. |
| 8 | BR-03, BR-04, BR-05, and BR-06 each have at least one passing test. |
| 9 | `LateFeeService` has genuine downstream consumers that use its output (not mock pass-throughs). |
| 10 | The risky patch is a single-token change (`DOWN` → `HALF_UP`). |
| 11 | Applying the risky patch changes real observable billing output. |
| 12 | Both the base (`DOWN`) and changed (`HALF_UP`) versions compile and the changed version's existing tests still pass (no test explicitly guards the DOWN behavior). |
| 13 | No unnecessary platform or infrastructure features exist in the project. |

---

## 16. Future Generation Instructions

When generating the fixture from this specification, follow these steps in order:

### Step 1 — Scaffold the Maven project

Create `demo/legacy-billing/pom.xml` with:
- `groupId`: `com.meridian`
- `artifactId`: `legacy-billing`
- `version`: `1.0-SNAPSHOT`
- Java 17 source/target
- JUnit Jupiter dependency (scope `test`)
- Surefire plugin configured for JUnit 5

### Step 2 — Generate model classes

Generate `Account`, `Customer`, `Loan`, and `BillingResult` as plain Java objects with
fields, constructors, and getters. No annotations, no builders.

`Account` must carry a boolean `graceEligible` field (or equivalent) that
`GracePeriodPolicy` reads to determine grace period applicability (BR-05).

`BillingResult` must carry at minimum: `lateFeeCharged`, `interestCharged`, `totalDue`,
and a reference back to the `Account`.

### Step 3 — Generate utility classes

Generate `MoneyUtils` and `LegacyDateUtils`. `MoneyUtils` must contain the
`setScale(2, RoundingMode.DOWN)` logic (BR-01). `LegacyDateUtils` must contain date
arithmetic used by `GracePeriodPolicy`.

### Step 4 — Generate constants

Generate `BillingConstants` with all named thresholds, caps, and defaults. Specifically:
- `LATE_FEE_RATE` (base percentage rate for late fee interest calculation)
- `PENALTY_THRESHOLD_DAYS = 30` (BR-02)
- `FIXED_PENALTY_AMOUNT = 15.00` (BR-02)
- `HARDSHIP_FEE_CAP = 25.00` (BR-03)
- `GRACE_PERIOD_DAYS = 7` (BR-05)
- `COLLECTIONS_EXPOSURE_THRESHOLD = 500.00` (BR-06)

### Step 5 — Generate policy classes

Generate `GracePeriodPolicy`, `HardshipPolicy`, and `CollectionsPolicy` with the logic
described in Section 7. Each policy class must be independently instantiable.

### Step 6 — Generate service classes

Generate `LateFeeService`, `InterestCalculator`, `BillingService`, in that order. The
service call graph in Section 6 is the authoritative wiring.

### Step 7 — Generate statement and collections classes

Generate `MonthlyStatementService`, `AccountClosureService`, `CollectionsService`, and
`CollectionsNoticeService`. These classes consume `BillingResult` and/or call into
`CollectionsPolicy`.

### Step 8 — Generate test classes

Generate the 5–7 test files listed in Section 8. Ensure:
- Tests for BR-03, BR-04, BR-05, BR-06 exist and pass.
- No test for BR-01 rounding boundary exists.
- No test for BR-02 exact boundary exists.
- `GracePeriodPolicyTest` includes both an eligible-account case and an ineligible-account
  case at the same raw `daysLate = 7` value, so the eligibility flag is the only
  differentiator.
- All test inputs for billing calculations use balances/rates from the safe-input list in
  Section 17, ensuring tests pass under both `RoundingMode.DOWN` and `RoundingMode.HALF_UP`.

### Step 9 — Verify acceptance criteria

Run `mvn compile` and `mvn test`. Confirm all 13 acceptance criteria are met. If any
criterion fails, fix the fixture before declaring completion.

### Step 10 — Prepare the risky change artifact

Create a patch file or Git branch containing only the one-token change
`RoundingMode.DOWN` → `RoundingMode.HALF_UP`. Document its location in a brief note at
`demo/legacy-billing/PROPOSED_CHANGE.md`. Do not apply the change to the base fixture.

### Step 11 — Defer GROUND_TRUTH.md

Do not create `GROUND_TRUTH.md` during fixture generation. It will be authored
separately, after the fixture is confirmed complete, by a human or evaluation agent that
is not the analysis target.

---

## 17. Canonical Demo Fixture

This section defines the single deterministic account used in the primary BR-01
demonstration. It is the **only** place in the specification where rounding-sensitive
values appear. No test may use these values.

### 17.1 Primary Demo Account — "ACCT-9901"

| Field                  | Value                        | Notes                                     |
|------------------------|------------------------------|-------------------------------------------|
| Account ID             | `ACCT-9901`                  |                                           |
| Customer               | `Raymond Holt`               | No active hardship plan                   |
| Outstanding balance    | `1500.00`                    | Positive — late fees apply (BR-04 clear)  |
| Grace eligible         | `false`                      | No grace period applied (BR-05 bypassed)  |
| Raw days late          | `12`                         | ≤ 30, so no `$15` fixed penalty (BR-02)   |
| Effective days late    | `12`                         | Same as raw (not grace-eligible)          |
| Late fee rate          | `0.00823` (0.823%)           | Applied to outstanding balance            |

### 17.2 Canonical Late-Fee Calculation

```
raw fee = 1500.00 × 0.00823
        = 12.3450000...   (exact: 12.345)
```

Because `12.345` has a third decimal digit of exactly `5`, the two rounding modes
diverge:

| RoundingMode | Result   | Note                              |
|--------------|----------|-----------------------------------|
| `DOWN`       | `12.34`  | Baseline (current fixture)        |
| `HALF_UP`    | `12.35`  | After proposed one-token patch    |

The difference is `$0.01`.

### 17.3 Full BillingResult for ACCT-9901

Assume a monthly interest rate of `0.5%` applied to the same `$1500.00` outstanding
balance (a clean, rounding-safe value: `1500.00 × 0.005 = 7.50` exactly).

| Field             | Baseline (`DOWN`) | After patch (`HALF_UP`) |
|-------------------|-------------------|--------------------------|
| `lateFeeCharged`  | `12.34`           | `12.35`                  |
| `interestCharged` | `7.50`            | `7.50`                   |
| `totalDue`        | `19.84`           | `19.85`                  |

### 17.4 Downstream Effects

**MonthlyStatementService:** The statement line for `ACCT-9901` shows `lateFeeCharged`
and `totalDue` from `BillingResult`. Both differ by `$0.01` between baseline and patch.

**CollectionsPolicy:** Total exposure = `outstandingBalance + lateFeeCharged`:
- Baseline: `1500.00 + 12.34 = 1512.34`
- After patch: `1500.00 + 12.35 = 1512.35`

Both values are well above the `$500.00` `COLLECTIONS_EXPOSURE_THRESHOLD`, so this
account is collections-eligible under both modes. The one-cent difference does not flip
the threshold for this account. This is intentional — it keeps the collections scenario
realistic. `CollectionsPolicy` genuinely consumes the rounding result, and Legacy Lens
can trace that dependency, but we do not force a contrived threshold flip.

**AccountClosureService:** Reads `totalDue` from `BillingResult`; the `$0.01` difference
is observable in any closure calculation.

### 17.5 Safe Test Input List

All test inputs for billing fee calculations must be chosen so that
RoundingMode.DOWN and RoundingMode.HALF_UP produce the same two-decimal result. The application uses a
single configured late-fee rate of `0.00823`. Recommended safe combinations:

| Balance    | Rate      | Raw fee  | Rounded (either mode) |
|------------|-----------|----------|-----------------------|
| `1000.00`  | `0.00823` | `8.23`   | `8.23`                |
| `2000.00`  | `0.00823` | `16.46`  | `16.46`               |
| `750.00`   | `0.00823` | `6.1725` | `6.17`                |
| `4000.00`  | `0.00823` | `32.92`  | `32.92`               |

Do **not** use `balance = 1500.00` with `rate = 0.00823` in any test — that is the
canonical rounding-sensitive input reserved for the demo scenario.

### 17.6 Hardship Cap Test — Safe Inputs

For hardship cap tests, use a balance and rate that produce a raw fee above `$25.00`
before capping. Example: `balance = 4000.00`, `rate = 0.00823` → raw fee `$32.92`,
capped to `$25.00`. Both rounding modes produce `$32.92` (no fractional cents), so
the cap assertion is rounding-mode-independent.
