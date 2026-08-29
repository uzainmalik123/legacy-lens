# GROUND_TRUTH.md
# Meridian Loan Servicing — Private Evaluation Ground Truth

**Status:** Private evaluation artifact. MUST NOT be read by Legacy Lens analysis agents.  
**Version:** 1.0  
**Source:** Grounded in actual frozen fixture implementation; not derived from spec alone.

---

> **ACCESS RESTRICTION**
>
> This document is the answer sheet for scoring Legacy Lens demo analyses.
> It must never appear in any analysis context, prompt, tool call, or file scan.
> Human evaluators use it to score correctness after Legacy Lens has completed
> its analysis using only the permitted inputs defined in `ANALYSIS_SCOPE.md`.

---

## BR-01 — Downward Rounding (PRIMARY BEHAVIOR)

### 1. Rule ID
BR-01

### 2. Short Title
Late-fee downward rounding (`RoundingMode.DOWN`)

### 3. Exact Behavioral Invariant
All late-fee values are truncated toward zero at two decimal places using
`RoundingMode.DOWN`. Fractional cents are discarded, never rounded up.
The institution's billing policy requires that rounding never increases a customer charge.

### 4. Business Significance
Any late fee whose raw product has a third decimal digit ≥ 5 will produce a lower result
than conventional HALF_UP rounding. For the canonical demo account ACCT-9901 this is a
`$0.01` undercharge per cycle. At scale across thousands of accounts this creates a
systematic revenue variance. The policy is a deliberate protective choice for customers,
not a bug, but it is undocumented in source.

### 5. Exact Source Evidence

| Item            | Value                                                                            |
|-----------------|----------------------------------------------------------------------------------|
| File            | `src/main/java/com/meridian/billing/util/MoneyUtils.java`                        |
| Class           | `MoneyUtils`                                                                     |
| Method          | `roundLateFee(BigDecimal value)`                                                  |
| Key expression  | `return value.setScale(2, RoundingMode.DOWN);`                                   |
| Call site       | `LateFeeService.calculateLateFee(Account, int)` — line: `MoneyUtils.roundLateFee(fee)` |

`roundLateFee` is called from `LateFeeService.calculateLateFee` immediately after the
fee arithmetic (base fee + optional penalty). The interest rounding method in the same
class (`roundInterest`) uses `RoundingMode.HALF_UP`, making the asymmetry detectable by
comparing the two methods side-by-side.

### 6. Direct Dependencies
- `MoneyUtils.roundLateFee` is the sole implementation of the rounding rule.
- `LateFeeService.calculateLateFee` is the sole caller.
- `BillingConstants.LATE_FEE_RATE` (`0.00823`) determines which input balances produce
  a fee with a non-zero third decimal digit.

### 7. Downstream Impact
`MoneyUtils.roundLateFee` is called inside `LateFeeService.calculateLateFee` before the
result is passed to `HardshipPolicy.applyHardshipCap`. The final late fee value —
after both rounding and hardship-cap application — is what enters `BillingResult.lateFeeCharged`.
All downstream consumers receive that final value.

Authoritative causal order within `LateFeeService.calculateLateFee`:

```
raw fee arithmetic
    ↓
MoneyUtils.roundLateFee          ← RoundingMode.DOWN applied here
    ↓
HardshipPolicy.applyHardshipCap  ← cap applied to the already-rounded value
    ↓
final lateFeeCharged
    ↓
BillingResult
    ↓
downstream consumers
```

Downstream consumers of `BillingResult.lateFeeCharged`:

| Consumer                    | How affected                                                        |
|-----------------------------|---------------------------------------------------------------------|
| `MonthlyStatementService`   | Prints `lateFeeCharged` and `totalDue` from `BillingResult`         |
| `AccountClosureService`     | Reads `totalDue` from `BillingResult` for closure summary           |
| `CollectionsPolicy`         | `exposure = outstandingBalance + lateFeeCharged`; feeds enrollment decision |
| `CollectionsService`        | Enrollment triggered by `CollectionsPolicy.isEligible`              |
| `CollectionsNoticeService`  | Notice generated only when enrollment is triggered                  |

### 8. Existing Test Coverage
**None.** No test exercises a balance/rate combination where `DOWN` and `HALF_UP` disagree.
All existing test inputs (`1000.00`, `2000.00`, `4000.00`) produce fees whose raw values
have at most two significant decimal digits before rounding, making both modes equivalent
for those inputs.

### 9. Known Test Gaps
- **Mandatory gap (by design):** No characterization test asserts behavior at the
  half-cent boundary (e.g., `balance = 1500.00` at `rate = 0.00823` → raw fee `12.345`).
- No test names contain `rounding`, `roundDown`, `RoundingMode`, or equivalent.
- No test in `MoneyUtils` (there is no `MoneyUtilsTest`) asserts `setScale(2, DOWN)` behavior.
- The gap means the proposed patch (`DOWN` → `HALF_UP`) passes all existing tests.

### 10. Expected Confidence Level for a Correct Legacy Lens Analysis
**HIGH.** The evidence is unambiguous: `RoundingMode.DOWN` is a single token in a
two-line method. A correct analysis should cite the exact method, compare it against the
interest rounding method in the same class, identify `LateFeeService` as the call site,
and trace the downstream flow through `BillingResult` to all consumers.

---

### BR-01 Extended Analysis

#### Baseline Behavior (Frozen Fixture)
```java
// MoneyUtils.java, method roundLateFee
return value.setScale(2, RoundingMode.DOWN);
```
For `balance = 1500.00`, `rate = 0.00823`:
- Raw fee = `1500.00 × 0.00823 = 12.345` (exact)
- `RoundingMode.DOWN` → **`12.34`**

#### Proposed Behavior (proposed-change.patch)
```java
return value.setScale(2, RoundingMode.HALF_UP);
```
- Same raw fee `12.345`
- `RoundingMode.HALF_UP` → **`12.35`**

#### Canonical ACCT-9901 Calculation

| Parameter           | Value                        |
|---------------------|------------------------------|
| Account ID          | `ACCT-9901`                  |
| Customer            | Raymond Holt (no hardship)   |
| Outstanding balance | `1500.00`                    |
| Grace eligible      | `false`                      |
| Raw days late       | `12`                         |
| Effective days late | `12` (no grace period)       |
| Rate                | `0.00823`                    |

Calculation:
```
baseFee = 1500.00 × 0.00823 = 12.345 (exact)
effectiveDays (12) ≤ PENALTY_THRESHOLD_DAYS (30) → no penalty added
fee before rounding = 12.345
MoneyUtils.roundLateFee (DOWN) → 12.34
HardshipPolicy.applyHardshipCap → 12.34 (no hardship plan; unchanged)
lateFeeCharged     = 12.34
interestCharged    = 1500.00 × 0.005 = 7.50 (HALF_UP, no change)
totalDue           = 12.34 + 7.50 = 19.84
```

#### Observable $0.01 Difference

| Field             | Baseline (`DOWN`) | After Patch (`HALF_UP`) | Delta   |
|-------------------|-------------------|--------------------------|---------|
| `lateFeeCharged`  | `12.34`           | `12.35`                  | `+0.01` |
| `interestCharged` | `7.50`            | `7.50`                   | `0.00`  |
| `totalDue`        | `19.84`           | `19.85`                  | `+0.01` |

#### Affected Downstream Consumers (Authoritative)

Note: `HardshipPolicy.applyHardshipCap` is applied **before** `BillingResult` is
constructed (see causal order above). ACCT-9901 has no active hardship plan, so the
cap is a no-op for this account. The changed value that enters `BillingResult` is the
output of `HardshipPolicy`, not directly the output of `MoneyUtils.roundLateFee`.

1. **`BillingResult`** — receives `lateFeeCharged = 12.35` (post-rounding, post-cap) instead of `12.34`; `totalDue = 19.85` instead of `19.84`.
2. **`MonthlyStatementService`** — Statement line includes `FEE=12.35` and `TOTAL=19.85` instead of `FEE=12.34` and `TOTAL=19.84`.
3. **`AccountClosureService`** — Closure record carries `TOTAL_DUE=19.85` instead of `19.84` for any closed account affected.
4. **`CollectionsPolicy`** — Exposure = `1500.00 + 12.35 = 1512.35` (vs `1512.34`). Both values exceed the `$500.00` threshold, so enrollment is unchanged for ACCT-9901. However, for accounts near the threshold boundary, the `$0.01` difference can flip eligibility.
5. **`CollectionsService`** — Enrollment unchanged for ACCT-9901 but threshold-boundary accounts can change.
6. **`CollectionsNoticeService`** — Notice generation depends on enrollment; threshold-boundary accounts affected.

#### Expected Missing Characterization Test
A correct characterization test would look like:
```java
// balance=1500.00 → raw fee=12.345 → DOWN rounds to 12.34, HALF_UP rounds to 12.35
Account account = makeAccount("1500.00", false, false);
BigDecimal fee = lateFeeService.calculateLateFee(account, 12);
assertEquals(0, new BigDecimal("12.34").compareTo(fee),
    "Late fee must round DOWN: 12.345 → 12.34, not 12.35");
```
No such test exists in the frozen fixture. This is the mandatory gap.

#### Why the One-Token Change Is Behaviorally Significant
The change `RoundingMode.DOWN` → `RoundingMode.HALF_UP` in `MoneyUtils.roundLateFee`:
- Produces different fee amounts when the raw late-fee calculation produces fractional
  cents for which `RoundingMode.DOWN` and `RoundingMode.HALF_UP` produce different
  two-decimal results. The canonical deterministic example:
  ```
  1500.00 × 0.00823 = 12.345
  DOWN    → 12.34
  HALF_UP → 12.35
  ```
- All existing tests happen to use "safe" balances (`1000`, `2000`, `4000`) where `rate × balance` produces exactly two decimal places. The patch therefore passes all 29 existing tests undetected.
- The institutional policy rationale (protect customers from overcharges) is silently violated — no code comment or test documents this intent.

#### Authoritative Expected Blast Radius for BR-01

```
MoneyUtils.roundLateFee                    ← direct change site
  └─ LateFeeService.calculateLateFee       ← sole caller
        └─ HardshipPolicy.applyHardshipCap ← cap applied to rounded value
              └─ BillingResult             ← receives post-rounding, post-cap fee
                    ├─ BillingResult.totalDue       ← derived: lateFee + interest
                    ├─ MonthlyStatementService       ← prints lateFeeCharged, totalDue
                    ├─ AccountClosureService         ← reads totalDue at closure
                    └─ CollectionsPolicy             ← exposure = balance + lateFeeCharged
                          └─ CollectionsService      ← enrollment decision
                                └─ CollectionsNoticeService ← notice generation
```

All nodes in this graph are present in real code with real logic. No mock pass-throughs
exist. A CORRECT analysis should identify the complete authoritative impact chain and
the major downstream consumers shown in the diagram. Missing a major dependency or
downstream consumer may reduce the score to PARTIAL.

---

## BR-02 — 30-Day Penalty Threshold

### 1. Rule ID
BR-02

### 2. Short Title
Fixed `$15.00` penalty applied only when effective days late exceeds 30 (strict greater-than)

### 3. Exact Behavioral Invariant
When `effectiveDays > 30`, a fixed `$15.00` penalty is added to the base late fee.
When `effectiveDays == 30`, no penalty is added. The comparison is strict
greater-than (`>`), not greater-than-or-equal.

### 4. Business Significance
Accounts exactly 30 days late escape the penalty. A customer who pays on day 30 avoids
`$15.00` in extra charges. Off-by-one implementations using `>=` would
incorrectly penalize on-time-by-strict-policy payments.

### 5. Exact Source Evidence

| Item           | Value                                                                            |
|----------------|----------------------------------------------------------------------------------|
| File           | `src/main/java/com/meridian/billing/billing/LateFeeService.java`                 |
| Class          | `LateFeeService`                                                                 |
| Method         | `calculateLateFee(Account account, int rawDaysLate)`                             |
| Key expression | `if (effectiveDays > BillingConstants.PENALTY_THRESHOLD_DAYS)`                   |
| Constant       | `BillingConstants.PENALTY_THRESHOLD_DAYS = 30`                                   |
| Constant       | `BillingConstants.FIXED_PENALTY_AMOUNT = new BigDecimal("15.00")`                |

### 6. Direct Dependencies
- `LateFeeService.calculateLateFee` computes `effectiveDays` via `GracePeriodPolicy`
  before evaluating the threshold.
- Grace period (BR-05) reduces the raw days before this comparison, so an account
  that is 37 raw days late but grace-eligible has only 30 effective days → no penalty.

### 7. Downstream Impact
The penalty amount (`$15.00`) is added to `fee` before it is passed to `MoneyUtils.roundLateFee`.
The rounded result then propagates through `BillingResult` to all downstream consumers
(same chain as BR-01).

### 8. Existing Test Coverage
Partial. `LateFeeServiceTest.penaltyAddedWhenMoreThanThirtyDaysLate` uses `daysLate = 45`
and asserts the total fee is `$23.23` (`8.23 + 15.00`). No test probes the exact boundary
(day 30 vs day 31).

### 9. Known Test Gaps
No test explicitly asserts that `daysLate = 30` produces no penalty and `daysLate = 31`
produces the penalty. The boundary behavior is covered only incidentally.

### 10. Expected Confidence Level
**MEDIUM-HIGH.** The constant name and strict `>` comparison are clear. An agent that
reads `LateFeeService` and `BillingConstants` should identify the behavior. Missing the
exact boundary semantics is the most likely partial-credit scenario.

---

## BR-03 — Hardship Cap

### 1. Rule ID
BR-03

### 2. Short Title
Maximum `$25.00` late fee for customers with an active hardship plan

### 3. Exact Behavioral Invariant
After all fee arithmetic and rounding, if `customer.isHardshipPlanActive()` returns
`true`, the final fee charged is `min(roundedFee, 25.00)`.

### 4. Business Significance
Hardship customers are protected from runaway late fees regardless of their outstanding
balance. A hardship customer with a `$10,000` balance would otherwise owe `$82.30` in
late fees; the cap limits them to `$25.00`.

### 5. Exact Source Evidence

| Item           | Value                                                                             |
|----------------|-----------------------------------------------------------------------------------|
| File           | `src/main/java/com/meridian/billing/policy/HardshipPolicy.java`                   |
| Class          | `HardshipPolicy`                                                                  |
| Method         | `applyHardshipCap(Customer customer, BigDecimal rawFee)`                          |
| Key expression | `if (customer.isHardshipPlanActive()) return rawFee.min(BillingConstants.HARDSHIP_FEE_CAP);` |
| Constant       | `BillingConstants.HARDSHIP_FEE_CAP = new BigDecimal("25.00")`                     |
| Flag           | `Customer.hardshipPlanActive` (boolean constructor parameter)                     |
| Call site      | `LateFeeService.calculateLateFee` — final line before return                      |

### 6. Direct Dependencies
- `HardshipPolicy.applyHardshipCap` is called from `LateFeeService.calculateLateFee`
  after rounding, passing `account.getCustomer()` and the rounded fee.
- `Customer.isHardshipPlanActive()` is the eligibility gate.

### 7. Downstream Impact
The cap produces a lower `lateFeeCharged` in `BillingResult`, which flows downstream
to `MonthlyStatementService`, `CollectionsPolicy`, and `AccountClosureService` as with BR-01.

### 8. Existing Test Coverage
**Good.** Four tests in `HardshipPolicyTest`: above cap → capped; below cap → unchanged;
non-hardship → not capped; exactly at cap → returned as-is. One test in
`LateFeeServiceTest.hardshipPlanCapsLateFeeAtTwentyFive` also covers the end-to-end path.

### 9. Known Test Gaps
No end-to-end test verifies a hardship-capped fee propagates correctly into
`CollectionsPolicy` or `MonthlyStatementService`.

### 10. Expected Confidence Level
**HIGH.** Well-covered, straightforward logic. An agent should identify this cleanly.

---

## BR-04 — Credit Balance Exclusion

### 1. Rule ID
BR-04

### 2. Short Title
Zero or negative outstanding balance → immediate `$0.00` late fee (early return)

### 3. Exact Behavioral Invariant
If `account.getOutstandingBalance()` is `≤ 0`, `LateFeeService.calculateLateFee` returns
`BigDecimal.ZERO` immediately without evaluating any other logic.

### 4. Business Significance
Credit balances can arise from overpayment or adjustments. Charging a late fee on a
non-positive balance would be an incorrect overcharge.

### 5. Exact Source Evidence

| Item           | Value                                                                              |
|----------------|------------------------------------------------------------------------------------|
| File           | `src/main/java/com/meridian/billing/billing/LateFeeService.java`                   |
| Class          | `LateFeeService`                                                                   |
| Method         | `calculateLateFee(Account account, int rawDaysLate)`                               |
| Key expression | `if (MoneyUtils.isZeroOrNegative(account.getOutstandingBalance())) return BigDecimal.ZERO;` |
| Helper         | `MoneyUtils.isZeroOrNegative(BigDecimal value)` — `value.compareTo(ZERO) <= 0`    |

### 6. Direct Dependencies
- `MoneyUtils.isZeroOrNegative` is the guard helper.
- The check runs before `GracePeriodPolicy`, before fee arithmetic, and before
  `HardshipPolicy`.

### 7. Downstream Impact
When this guard fires, `lateFeeCharged = 0` in `BillingResult`. This reduces
`totalDue` to `interestCharged` alone and reduces `CollectionsPolicy` exposure.

### 8. Existing Test Coverage
**Good.** Two explicit tests: `LateFeeServiceTest.zeroBalanceProducesNoLateFee` and
`LateFeeServiceTest.creditBalanceProducesNoLateFee` (negative balance `−100.00`).
`BillingServiceTest.zeroBalanceAccountProducesNoLateFee` covers the orchestrated path.

### 9. Known Test Gaps
No integration test verifies that a zero-balance account is correctly excluded from
collections as a downstream consequence of the `$0.00` fee.

### 10. Expected Confidence Level
**HIGH.** Early-return guard is explicit and directly tested.

---

## BR-05 — Grace Period

### 1. Rule ID
BR-05

### 2. Short Title
7-day grace period for eligible accounts before effective late-day counting begins

### 3. Exact Behavioral Invariant
For accounts where `account.isGraceEligible()` returns `true`:
`effectiveDaysLate = max(0, rawDaysLate − 7)`.
For ineligible accounts: `effectiveDaysLate = rawDaysLate` (unchanged).
The effective value is always non-negative.

### 4. Business Significance
Grace-eligible customers who pay within 7 days of the due date are treated as on time
and incur no late fee. A grace-eligible account that is exactly 7 days late has
`effectiveDaysLate = 0` and thus no fee. An ineligible account at the same 7 days late
pays the full fee.

### 5. Exact Source Evidence

| Item             | Value                                                                           |
|------------------|---------------------------------------------------------------------------------|
| File             | `src/main/java/com/meridian/billing/policy/GracePeriodPolicy.java`              |
| Class            | `GracePeriodPolicy`                                                             |
| Method           | `effectiveDaysLate(Account account, int rawDaysLate)`                           |
| Key expression   | `if (account.isGraceEligible()) return LegacyDateUtils.subtractDaysFloor(rawDaysLate, BillingConstants.GRACE_PERIOD_DAYS);` |
| Helper           | `LegacyDateUtils.subtractDaysFloor(int rawDays, int daysToSubtract)` → `Math.max(rawDays − daysToSubtract, 0)` |
| Constant         | `BillingConstants.GRACE_PERIOD_DAYS = 7`                                        |
| Eligibility flag | `Account.graceEligible` — boolean set in constructor; comment `// added Q3 2009` |
| Call site        | `LateFeeService.calculateLateFee` — second statement after balance guard         |

### 6. Direct Dependencies
- `GracePeriodPolicy` depends on `LegacyDateUtils.subtractDaysFloor` for safe floor arithmetic.
- `Account.isGraceEligible()` carries the flag; no other class evaluates eligibility.
- `BillingConstants.GRACE_PERIOD_DAYS` supplies the constant.
- The result feeds the penalty-threshold check (BR-02) and the base-fee calculation.

### 7. Downstream Impact
If grace period reduces `effectiveDays` to 0, the fee is `$0.00` (early return in
`LateFeeService`). The downstream cascade is identical to BR-04 when effective days = 0.
If grace period partially reduces days (e.g., 37 raw → 30 effective), it also determines
whether the BR-02 penalty applies.

### 8. Existing Test Coverage
**Good for happy paths.** `GracePeriodPolicyTest` has five tests covering: eligible at
exactly 7 days → 0 effective; ineligible at 7 days → 7 effective; eligible under 7 days
→ 0 (floor); eligible at 14 days → 7 effective; ineligible at 0 days → 0 effective.
`LateFeeServiceTest` has two parallel tests for the same 7-day-late case.

### 9. Known Test Gaps
No test verifies the interaction between grace period and the BR-02 penalty threshold
boundary (e.g., 37 raw days / grace-eligible → 30 effective → no penalty).

### 10. Expected Confidence Level
**HIGH.** Logic is distributed across `GracePeriodPolicy`, `LegacyDateUtils`, and
`LateFeeService`, but each piece is readable. An agent must trace all three files to
give complete evidence.

---

## BR-06 — Collections Eligibility

### 1. Rule ID
BR-06

### 2. Short Title
Collections enrollment only when total exposure (balance + late fee) exceeds `$500.00`

### 3. Exact Behavioral Invariant
`CollectionsPolicy.isEligible(Account, BillingResult)` returns `true` when and only when:
`outstandingBalance + lateFeeCharged > 500.00`
(strict greater-than; equality does not qualify).

### 4. Business Significance
Collections is a costly regulatory and reputational step. The threshold prevents
small-balance accounts from being enrolled in collections for trivial fee amounts.
An account with a `$490.00` balance and `$10.00` fee (total `$500.00`) is **not**
enrolled; at `$500.01` it is.

### 5. Exact Source Evidence

| Item           | Value                                                                              |
|----------------|------------------------------------------------------------------------------------|
| File           | `src/main/java/com/meridian/billing/policy/CollectionsPolicy.java`                 |
| Class          | `CollectionsPolicy`                                                                |
| Method         | `isEligible(Account account, BillingResult result)`                                |
| Key expression | `BigDecimal exposure = account.getOutstandingBalance().add(result.getLateFeeCharged()); return exposure.compareTo(BillingConstants.COLLECTIONS_EXPOSURE_THRESHOLD) > 0;` |
| Constant       | `BillingConstants.COLLECTIONS_EXPOSURE_THRESHOLD = new BigDecimal("500.00")`       |
| Call site      | `BillingService.runCycle` — `if (collectionsPolicy.isEligible(account, result)) collectionsService.enroll(account)` |

### 6. Direct Dependencies
- `BillingResult.getLateFeeCharged()` — carries the BR-01-rounded value.
- `Account.getOutstandingBalance()` — the outstanding balance.
- `CollectionsPolicy` calls neither `interestCharged` nor `totalDue`; it uses **only** balance + late fee.
- `CollectionsService.enroll` triggers `CollectionsNoticeService.generateNotice`.

### 7. Downstream Impact
When `isEligible` returns `true`, `CollectionsService.enroll(account)` is called, which
adds the account ID to `enrolledAccountIds` and calls `CollectionsNoticeService.generateNotice`,
which appends a formatted notice string. All three of these side-effects depend on the
rounded fee from BR-01.

### 8. Existing Test Coverage
**Good.** `CollectionsPolicyTest` has three tests: below threshold → not eligible;
above threshold → eligible; exactly at threshold → not eligible (boundary confirmed).

### 9. Known Test Gaps
No end-to-end test verifies that a full `BillingService.runCycle` call that produces a
collections-eligible fee actually results in a notice being generated by
`CollectionsNoticeService`. The `BillingServiceTest` does not assert collections behavior.

### 10. Expected Confidence Level
**HIGH.** Straightforward threshold check with clear constant. The key insight that only
`lateFeeCharged` (not `interestCharged`) contributes to exposure is the non-obvious
detail an agent may miss.

---

## Evaluation Rubric

### CORRECT
Legacy Lens identifies the behavior with valid source evidence and correctly explains
the affected downstream behavior.

**BR-01 CORRECT criteria:**
- Identifies `MoneyUtils.roundLateFee` as using `RoundingMode.DOWN`.
- Identifies that `roundInterest` uses `RoundingMode.HALF_UP` (asymmetry).
- Traces the call path from `LateFeeService.calculateLateFee` through `BillingResult`
  to at least `MonthlyStatementService`, `CollectionsPolicy`, and `AccountClosureService`.
- Identifies the absence of a characterization test at the rounding boundary.
- Explains that the proposed patch (`DOWN` → `HALF_UP`) passes all existing tests.

**BR-02 through BR-06 CORRECT criteria:**
- Identifies the correct class, method, and key expression or constant.
- Correctly states the boundary condition (inclusive vs exclusive, threshold value).
- Notes which behaviors have test coverage and which do not.

---

### PARTIAL
Legacy Lens identifies some of the behavior or blast radius but misses important
evidence or dependencies.

**Examples of PARTIAL:**
- Identifies BR-01 but cites only `LateFeeService`, missing `MoneyUtils` as the
  implementation site.
- Correctly identifies the rounding mode but fails to trace to `CollectionsPolicy`.
- Identifies BR-05 but does not trace through `LegacyDateUtils.subtractDaysFloor`.
- Identifies BR-06 threshold but states it uses `totalDue` (incorrect — it uses
  `lateFeeCharged` only).
- Notes the missing BR-01 test but cannot name the canonical rounding-sensitive input.

---

### INCORRECT
Legacy Lens invents unsupported behavior, misses the changed behavioral rule, or cites
nonexistent evidence.

**Examples of INCORRECT:**
- Claims the rounding mode is `HALF_UP` (confuses `roundLateFee` with `roundInterest`).
- States that BR-01 has existing test coverage.
- Claims `CollectionsPolicy` uses `totalDue` rather than `lateFeeCharged + outstandingBalance`.
- Invents a class, method, or field that does not exist in the source.
- Misidentifies which downstream services are affected by the rounding change.
- States that the BR-02 boundary is `>=` (incorrect — it is strict `>`).
- States that all accounts receive a grace period (incorrect — `graceEligible` flag controls eligibility).

---

## Summary Reference Table

| Rule  | Behavior                       | Primary Class          | Key Method/Expression                        | Tests Exist? | Missing Test Gap                         |
|-------|-------------------------------|------------------------|----------------------------------------------|--------------|------------------------------------------|
| BR-01 | Downward fee rounding          | `MoneyUtils`           | `roundLateFee` → `RoundingMode.DOWN`         | No           | Rounding boundary (balance = 1500.00)    |
| BR-02 | 30-day penalty threshold       | `LateFeeService`       | `effectiveDays > PENALTY_THRESHOLD_DAYS`     | Partial      | Exact 30/31 boundary                     |
| BR-03 | Hardship cap ($25.00)          | `HardshipPolicy`       | `rawFee.min(HARDSHIP_FEE_CAP)`               | Yes          | End-to-end propagation to collections    |
| BR-04 | Credit balance exclusion       | `LateFeeService`       | `isZeroOrNegative` → early return            | Yes          | Downstream collections impact            |
| BR-05 | 7-day grace period             | `GracePeriodPolicy`    | `subtractDaysFloor(raw, 7)`                  | Yes          | Grace + BR-02 interaction at boundary    |
| BR-06 | Collections exposure threshold | `CollectionsPolicy`    | `balance + lateFee > 500.00`                 | Yes          | End-to-end notice generation             |
