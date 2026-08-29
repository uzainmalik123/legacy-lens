// ---------------------------------------------------------------------------
// lib/analysis/allowlist.ts
// Defines the EXPLICIT allowlist of files the Bob analysis pipeline may read.
//
// SEC-604: paths are hard-coded — no user input influences which files open.
// ANALYSIS_SCOPE.md rule: MUST enumerate only allowed directories/files.
// Do NOT scan demo/legacy-billing/** broadly and filter — use only this list.
//
// Forbidden paths — MUST NOT appear in ALLOWED_PATHS:
//   demo/legacy-billing/GROUND_TRUTH.md
//   demo/legacy-billing/LEGACY_FIXTURE_SPEC.md
//   demo/legacy-billing/ANALYSIS_SCOPE.md
//   demo/legacy-billing/PROPOSED_CHANGE.md
//   demo/legacy-billing/target/**
// ---------------------------------------------------------------------------

import { readFile } from "fs/promises";
import path from "path";

/**
 * Explicit allowlist of paths the analysis pipeline may read.
 * All paths are relative to the repository root (process.cwd()).
 * This constant is exported so tests can assert its contents.
 */
export const ALLOWED_PATHS: readonly string[] = [
  // Main Java source
  "demo/legacy-billing/src/main/java/com/meridian/billing/billing/BillingConstants.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/billing/BillingService.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/billing/InterestCalculator.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/billing/LateFeeService.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/collections/CollectionsNoticeService.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/collections/CollectionsService.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/model/Account.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/model/BillingResult.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/model/Customer.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/model/Loan.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/policy/CollectionsPolicy.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/policy/GracePeriodPolicy.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/policy/HardshipPolicy.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/statement/AccountClosureService.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/statement/ClosureRecord.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/statement/MonthlyStatementService.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/statement/StatementRecord.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/util/LegacyDateUtils.java",
  "demo/legacy-billing/src/main/java/com/meridian/billing/util/MoneyUtils.java",
  // Test Java source
  "demo/legacy-billing/src/test/java/com/meridian/billing/BillingServiceTest.java",
  "demo/legacy-billing/src/test/java/com/meridian/billing/CollectionsPolicyTest.java",
  "demo/legacy-billing/src/test/java/com/meridian/billing/GracePeriodPolicyTest.java",
  "demo/legacy-billing/src/test/java/com/meridian/billing/HardshipPolicyTest.java",
  "demo/legacy-billing/src/test/java/com/meridian/billing/InterestCalculatorTest.java",
  "demo/legacy-billing/src/test/java/com/meridian/billing/LateFeeServiceTest.java",
  "demo/legacy-billing/src/test/java/com/meridian/billing/MonthlyStatementServiceTest.java",
  // Build descriptor
  "demo/legacy-billing/pom.xml",
  // Proposed change patch
  "demo/legacy-billing/proposed-change.patch",
] as const;

/**
 * The map returned by readAllowedSources — relative path → file content.
 */
export type AllowedSourcesMap = Record<string, string>;

/**
 * Reads all allowlisted files from disk and returns their contents.
 * Base directory is process.cwd() (the repository root when running next dev/start).
 *
 * Throws if any allowlisted file cannot be read (fail-fast to prevent
 * silently incomplete analysis context).
 *
 * SEC-604: only ALLOWED_PATHS entries are ever opened.
 */
export async function readAllowedSources(): Promise<AllowedSourcesMap> {
  const base = process.cwd();
  const entries = await Promise.all(
    ALLOWED_PATHS.map(async (relativePath) => {
      const absolutePath = path.join(base, relativePath);
      const content = await readFile(absolutePath, "utf-8");
      return [relativePath, content] as const;
    })
  );
  return Object.fromEntries(entries);
}
