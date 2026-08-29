// ---------------------------------------------------------------------------
// lib/analysis/__tests__/bob-pipeline.test.ts
// Integration tests for the Bob analysis pipeline (route handler + client).
// TEST-611, TEST-612, TEST-617, TEST-620 per contract.
//
// REQ-012: all tests mock child_process/Bob execution — no real Bob invocations.
// vi.mock('child_process') is hoisted by vitest so spawn is never called.
// ---------------------------------------------------------------------------

import { EventEmitter } from "events";
import { it, expect, describe, vi, beforeEach, afterEach } from "vitest";

// vi.mock is hoisted to the top of the file by vitest so it intercepts
// the child_process module before bob-client.ts imports it.
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import { isBobConfigured, callBobAnalysis, BobApiError } from "@/lib/analysis/bob-client";
import { AnalysisBundleWireSchema } from "@/lib/analysis/bundle";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Configure the spawn mock to emit stdout and exit with exitCode.
 * The mock replicates the EventEmitter-based child_process.ChildProcess API.
 */
function setupSpawnMock(stdoutPayload: string, exitCode = 0): void {
  const mockChild = {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin: { write: vi.fn(), end: vi.fn() },
    on: vi.fn(),
  };

  mockChild.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
    if (event === "close") {
      setImmediate(() => {
        mockChild.stdout.emit("data", Buffer.from(stdoutPayload, "utf8"));
        setImmediate(() => cb(exitCode));
      });
    }
    // "error" is not called on normal paths — omit intentionally
    return mockChild;
  });

  vi.mocked(spawn).mockReturnValue(
    mockChild as unknown as ReturnType<typeof spawn>
  );
}

// ---------------------------------------------------------------------------
// TEST-620 / TEST-617: Bob configuration guard
// isBobConfigured() now only requires BOB_API_KEY (Shell transport).
// BOB_API_URL and BOB_MODEL are not required.
// ---------------------------------------------------------------------------

describe("Bob client configuration guard", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  // TEST-620
  it("TEST-620: isBobConfigured returns false when BOB_API_KEY is absent", () => {
    process.env = { ...originalEnv, BOB_API_KEY: undefined };
    expect(isBobConfigured()).toBe(false);
  });

  it("isBobConfigured returns false when BOB_API_KEY is empty/whitespace", () => {
    process.env = { ...originalEnv, BOB_API_KEY: "   " };
    expect(isBobConfigured()).toBe(false);
  });

  it("isBobConfigured returns true when BOB_API_KEY is set", () => {
    process.env = { ...originalEnv, BOB_API_KEY: "test-key" };
    expect(isBobConfigured()).toBe(true);
  });

  it("isBobConfigured returns true without BOB_API_URL (Shell transport does not need it)", () => {
    process.env = { ...originalEnv, BOB_API_KEY: "test-key", BOB_API_URL: undefined };
    expect(isBobConfigured()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TEST-617: Confirm no real Bob process is spawned during tests.
//
// The callBobAnalysis function throws BobApiError("not_configured") when
// BOB_API_KEY is absent — spawn is never reached.
// ---------------------------------------------------------------------------

describe("No real Bob execution during tests (TEST-617)", () => {
  beforeEach(() => {
    delete process.env.BOB_API_URL;
    delete process.env.BOB_API_KEY;
    vi.clearAllMocks();
  });

  it("TEST-617: callBobAnalysis throws BobApiError without spawning Bob when not configured", async () => {
    await expect(callBobAnalysis({})).rejects.toThrow(BobApiError);
    // spawn must not have been called — the guard fires before it
    expect(spawn).not.toHaveBeenCalled();
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
// Bob Shell spawn transport — verify spawn invocation and wrapper parsing
// ---------------------------------------------------------------------------

describe("Bob Shell spawn transport (mocked child_process)", () => {
  beforeEach(() => {
    process.env.BOB_API_KEY = "test-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.BOB_API_KEY;
  });

  it("callBobAnalysis resolves with parsed last_message on valid Bob Shell output", async () => {
    const expectedBundle = { review: { analysis_id: "live-001" } };
    setupSpawnMock(
      JSON.stringify({
        type: "result",
        status: "success",
        last_message: JSON.stringify(expectedBundle),
      }),
      0
    );

    const result = await callBobAnalysis({ "demo/file.java": "class Foo {}" });

    expect(result).toEqual(expectedBundle);
    expect(spawn).toHaveBeenCalledOnce();

    // Verify spawn was called with the correct executable and fixed args
    const [cmd, args, opts] = vi.mocked(spawn).mock.calls[0];
    expect(cmd).toBe("bob");
    expect(args).toContain("run");
    expect(args).toContain("--mode");
    expect(args).toContain("ask");
    expect(args).toContain("--format");
    expect(args).toContain("json");
    expect(args).toContain("--max-cost");
    expect(args).toContain("5");
    expect(args).toContain("--max-turns");
    expect(args).toContain("1");
    expect(args).toContain("--disable-mcp");
    expect(args).toContain("--disable-subagents");
    // shell: false is the critical security property
    expect(opts).toMatchObject({ shell: false });
  });

  it("callBobAnalysis throws BobApiError when Bob exits non-zero", async () => {
    setupSpawnMock("Error: Bob API key is required.", 1);
    await expect(callBobAnalysis({})).rejects.toThrow(BobApiError);
  });

  it("callBobAnalysis throws BobApiError when wrapper status is not success", async () => {
    setupSpawnMock(
      JSON.stringify({ type: "result", status: "error", last_message: null }),
      0
    );
    await expect(callBobAnalysis({})).rejects.toThrow(BobApiError);
  });

  it("callBobAnalysis throws BobApiError when last_message is not valid JSON", async () => {
    setupSpawnMock(
      JSON.stringify({ type: "result", status: "success", last_message: "This is not JSON" }),
      0
    );
    await expect(callBobAnalysis({})).rejects.toThrow(BobApiError);
  });

  it("callBobAnalysis throws BobApiError when last_message is empty/whitespace", async () => {
    setupSpawnMock(
      JSON.stringify({ type: "result", status: "success", last_message: "   " }),
      0
    );
    await expect(callBobAnalysis({})).rejects.toThrow(BobApiError);
  });
});
