// ---------------------------------------------------------------------------
// lib/analysis/__tests__/bob-pipeline.test.ts
// Integration tests for the Bob analysis pipeline (route handler + client).
// TEST-611, TEST-612, TEST-617, TEST-620 per contract.
//
// REQ-012: all tests mock the LLM call — no real network requests.
// ---------------------------------------------------------------------------

import { it, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { isBobConfigured } from "@/lib/analysis/bob-client";
import { AnalysisBundleWireSchema } from "@/lib/analysis/bundle";

// ---------------------------------------------------------------------------
// TEST-617: Verify no real LLM fetch occurs during tests
// We confirm this by not setting BOB_API_KEY/BOB_API_URL in the test env.
// The isBobConfigured() guard returns false without env vars.
// ---------------------------------------------------------------------------

describe("Bob client configuration guard", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  // TEST-620
  it("TEST-620: isBobConfigured returns false when BOB_API_KEY is absent", () => {
    process.env = { ...originalEnv, BOB_API_KEY: undefined, BOB_API_URL: undefined };
    expect(isBobConfigured()).toBe(false);
  });

  it("isBobConfigured returns false when only BOB_API_URL is set", () => {
    process.env = {
      ...originalEnv,
      BOB_API_URL: "https://api.example.com",
      BOB_API_KEY: undefined,
    };
    expect(isBobConfigured()).toBe(false);
  });

  it("isBobConfigured returns false when only BOB_API_KEY is set", () => {
    process.env = {
      ...originalEnv,
      BOB_API_URL: undefined,
      BOB_API_KEY: "test-key",
    };
    expect(isBobConfigured()).toBe(false);
  });

  it("isBobConfigured returns true when both BOB_API_URL and BOB_API_KEY are set", () => {
    process.env = {
      ...originalEnv,
      BOB_API_URL: "https://api.example.com",
      BOB_API_KEY: "test-key",
    };
    expect(isBobConfigured()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Route handler simulation tests
// We test the validation logic (AnalysisBundleWireSchema) and error paths
// without spinning up a full Next.js server.
// ---------------------------------------------------------------------------

describe("AnalysisBundleWireSchema validation (simulates route handler step 3)", () => {
  // TEST-611: malformed response → validation_failed
  it("TEST-611: safeParse fails and would produce HTTP 422 for malformed Bob response", () => {
    const malformed = {
      // missing behavioral_contract, review, metadata, intent, guardrail_test
      garbage: "this is not a valid bundle",
    };
    const result = AnalysisBundleWireSchema.safeParse(malformed);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBeTruthy();
    }
  });

  // TEST-612 (schema side): valid bundle passes → would produce HTTP 200
  it("TEST-612: safeParse passes for a valid bundle (would produce HTTP 200 with X-Analysis-Mode: live)", () => {
    const validBundle = {
      behavioral_contract: {
        analysis_id: "test-001",
        generated_at: "2026-08-29T00:00:00Z",
        source_fixture: "demo/legacy-billing",
        rules: [
          {
            id: "BR-01",
            title: "Late-fee rounding",
            description: "Rounds fees DOWN",
            business_context: "Billing",
            invariant: "always DOWN",
            evidence: [
              {
                file: "demo/legacy-billing/src/main/java/com/meridian/billing/util/MoneyUtils.java",
                kind: "source",
              },
            ],
            confidence: 0.9,
            test_coverage: "uncovered",
            related_symbols: [],
            downstream_dependencies: [],
            risk_if_changed: "Customers overcharged",
          },
        ],
      },
      review: {
        analysis_id: "test-001",
        overall_risk: "high",
        findings: [
          {
            id: "F-001",
            severity: "high",
            title: "Rounding changed",
            summary: "Summary",
            behavior_rule_ids: ["BR-01"],
            business_impact: "Impact",
            evidence: [],
            confidence: 0.9,
            test_coverage: "uncovered",
            recommended_action: "Reject",
          },
        ],
        affected_behavior_rule_ids: ["BR-01"],
      },
      metadata: {
        analysis_id: "test-001",
        repository: "demo/legacy-billing",
        base_revision: "main",
        target_revision: "proposed-change",
        started_at: "2026-08-29T00:00:00Z",
        status: "complete",
        files_inspected: 14,
        functions_traced: 23,
        behavior_rules_discovered: 6,
        affected_behavior_rules: 1,
        untested_affected_rules: 1,
        high_risk_findings: 1,
        generated_tests: 1,
      },
      intent: {
        analysis_id: "test-001",
        target_symbol: "MoneyUtils.roundLateFee",
        target_file: "demo/legacy-billing/src/main/java/com/meridian/billing/util/MoneyUtils.java",
        business_role: "Rounds late fees",
        summary: "Computes rounded fee",
        invariants: ["always DOWN"],
        related_behavior_rule_ids: ["BR-01"],
        dependencies: [],
        evidence: [],
        confidence: 0.9,
      },
      guardrail_test: {
        id: "GT-001",
        behavior_rule_id: "BR-01",
        analysis_id: "test-001",
        filename: "LateFeeRoundingTest.java",
        framework: "JUnit 5",
        language: "Java",
        code: "class Foo {}",
        rationale: "captures rounding",
        status: "generated",
        protected_behavior: "DOWN rounding",
        boundary_scenario: {
          balance: "1500.00",
          rate: "0.00823",
          raw_fee: "12.345",
          current_result: "12.34",
          proposed_result: "12.35",
        },
        detection_note: "catches regression",
      },
    };

    const result = AnalysisBundleWireSchema.safeParse(validBundle);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEST-617: Confirm no real network fetch during tests
// The callBobAnalysis function throws BobApiError("not_configured") when
// credentials are absent — before any fetch() call is made.
// ---------------------------------------------------------------------------

describe("No real LLM network request during tests", () => {
  beforeEach(() => {
    // Ensure credentials are not set
    delete process.env.BOB_API_URL;
    delete process.env.BOB_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TEST-617: callBobAnalysis throws BobApiError without making a network call when not configured", async () => {
    // Spy on global fetch to confirm it is never called
    const fetchSpy = vi.spyOn(global, "fetch");

    const { callBobAnalysis } = await import("@/lib/analysis/bob-client");
    const { BobApiError } = await import("@/lib/analysis/bob-client");

    await expect(callBobAnalysis({})).rejects.toThrow(BobApiError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
