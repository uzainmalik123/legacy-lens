// ---------------------------------------------------------------------------
// app/__tests__/guardrail-test.test.tsx
// Tests for Feature 5 — Test Gap + Generate Guardrail Test
// TEST-401 through TEST-414 as specified in contract-feat-guardrail-test.json
// ---------------------------------------------------------------------------

import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { it, expect, describe, afterEach, beforeEach, vi } from "vitest";

import {
  GuardrailTestWireSchema,
  guardrailTestFromWireFormat,
} from "@/lib/analysis/guardrail-test";
import guardrailTestFixture from "@/lib/analysis/fixtures/meridian-sample-guardrail-test.json";
import { getMeridianReviewSession } from "@/lib/review-workspace/loader";
import FindingsPane from "@/app/components/FindingsPane";
import GuardrailTestView from "@/app/components/GuardrailTestView";

// Cleanup DOM between tests
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// TEST-401: valid wire object passes GuardrailTestWireSchema.safeParse
// ---------------------------------------------------------------------------
it("TEST-401: valid wire object passes GuardrailTestWireSchema.safeParse", () => {
  const valid = {
    id: "GT-001",
    behavior_rule_id: "BR-01",
    analysis_id: "test-001",
    filename: "TestFile.java",
    framework: "JUnit 5",
    language: "Java",
    code: "class Foo {}",
    rationale: "some rationale",
    status: "generated" as const,
    protected_behavior: "some behavior",
    boundary_scenario: {
      balance: "1500.00",
      rate: "0.00823",
      raw_fee: "12.345",
      current_result: "12.34",
      proposed_result: "12.35",
    },
    detection_note: "would detect change",
  };
  expect(GuardrailTestWireSchema.safeParse(valid).success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-402: wire object missing behavior_rule_id fails safeParse
// ---------------------------------------------------------------------------
it("TEST-402: GuardrailTestWireSchema.safeParse fails when behavior_rule_id is missing", () => {
  const invalid = {
    id: "GT-001",
    analysis_id: "test-001",
    filename: "TestFile.java",
    framework: "JUnit 5",
    language: "Java",
    code: "class Foo {}",
    rationale: "some rationale",
    status: "generated",
    protected_behavior: "some behavior",
    boundary_scenario: {
      balance: "1500.00",
      rate: "0.00823",
      raw_fee: "12.345",
      current_result: "12.34",
      proposed_result: "12.35",
    },
    detection_note: "would detect change",
  };
  expect(GuardrailTestWireSchema.safeParse(invalid).success).toBe(false);
});

// ---------------------------------------------------------------------------
// TEST-403: guardrailTestFromWireFormat maps snake_case → camelCase correctly
// ---------------------------------------------------------------------------
it("TEST-403: guardrailTestFromWireFormat maps snake_case to camelCase correctly", () => {
  const wire = GuardrailTestWireSchema.parse({
    id: "GT-001",
    behavior_rule_id: "BR-01",
    analysis_id: "test-001",
    filename: "TestFile.java",
    framework: "JUnit 5",
    language: "Java",
    code: "class Foo {}",
    rationale: "some rationale",
    status: "generated" as const,
    protected_behavior: "some behavior",
    boundary_scenario: {
      balance: "1500.00",
      rate: "0.00823",
      raw_fee: "12.345",
      current_result: "12.34",
      proposed_result: "12.35",
    },
    detection_note: "would detect change",
  });
  const domain = guardrailTestFromWireFormat(wire);
  expect(domain.behaviorRuleId).toBe("BR-01");
  expect(domain.analysisId).toBe("test-001");
  expect(domain.protectedBehavior).toBe("some behavior");
  expect(domain.detectionNote).toBe("would detect change");
  expect(domain.boundaryScenario.rawFee).toBe("12.345");
  expect(domain.boundaryScenario.currentResult).toBe("12.34");
  expect(domain.boundaryScenario.proposedResult).toBe("12.35");
});

// ---------------------------------------------------------------------------
// TEST-404: meridian-sample-guardrail-test.json passes GuardrailTestWireSchema
// ---------------------------------------------------------------------------
it("TEST-404: meridian-sample-guardrail-test.json passes GuardrailTestWireSchema.safeParse", () => {
  const result = GuardrailTestWireSchema.safeParse(guardrailTestFixture);
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// TEST-405: getMeridianReviewSession returns guardrailTest with behaviorRuleId BR-01
// ---------------------------------------------------------------------------
it("TEST-405: getMeridianReviewSession returns guardrailTest with behaviorRuleId === 'BR-01'", () => {
  const session = getMeridianReviewSession();
  expect(session.guardrailTest).toBeDefined();
  expect(session.guardrailTest.behaviorRuleId).toBe("BR-01");
});

// ---------------------------------------------------------------------------
// Shared session for component tests
// ---------------------------------------------------------------------------
const { report, contract, intent, guardrailTest } = getMeridianReviewSession();

// ---------------------------------------------------------------------------
// TEST-406: FindingsPane renders "TEST GAP" when guardrailTest provided
// ---------------------------------------------------------------------------
describe("FindingsPane — Test Gap", () => {
  it("TEST-406: renders 'TEST GAP' section when guardrailTest is provided and testCoverage is uncovered", () => {
    render(
      <FindingsPane
        findings={report.findings}
        contract={contract}
        intent={intent}
        guardrailTest={guardrailTest}
      />
    );
    // The Test Gap badge text
    const elements = screen.getAllByText(/test gap/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-407: renders "Generate Guardrail Test" button
  // -------------------------------------------------------------------------
  it("TEST-407: renders 'Generate Guardrail Test' button when guardrailTest provided", () => {
    render(
      <FindingsPane
        findings={report.findings}
        contract={contract}
        intent={intent}
        guardrailTest={guardrailTest}
      />
    );
    const button = screen.getByRole("button", { name: /generate guardrail test/i });
    expect(button).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // TEST-408: clicking "Generate Guardrail Test" shows transition message
  // -------------------------------------------------------------------------
  it("TEST-408: clicking 'Generate Guardrail Test' shows transition message", () => {
    vi.useFakeTimers();
    render(
      <FindingsPane
        findings={report.findings}
        contract={contract}
        intent={intent}
        guardrailTest={guardrailTest}
      />
    );
    const button = screen.getByRole("button", { name: /generate guardrail test/i });
    fireEvent.click(button);
    // stage1 message appears immediately
    const msg = screen.getAllByText(/preparing characterization test/i);
    expect(msg.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-409: after timers advance, GuardrailTestView renders
  // -------------------------------------------------------------------------
  it("TEST-409: after fake timers advance past 900 ms, GuardrailTestView renders in DOM", async () => {
    vi.useFakeTimers();
    render(
      <FindingsPane
        findings={report.findings}
        contract={contract}
        intent={intent}
        guardrailTest={guardrailTest}
      />
    );
    const button = screen.getByRole("button", { name: /generate guardrail test/i });
    fireEvent.click(button);

    // Advance both timers (450ms + 450ms) wrapped in act for React state updates
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // GuardrailTestView should be rendered — check for its characteristic content
    const filename = screen.getAllByText(/LateFeeRoundingCharacterizationTest\.java/i);
    expect(filename.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TEST-410–414: GuardrailTestView component tests
// ---------------------------------------------------------------------------
describe("GuardrailTestView", () => {
  function renderView() {
    return render(<GuardrailTestView guardrailTest={guardrailTest} />);
  }

  // -------------------------------------------------------------------------
  // TEST-410: renders guardrailTest.filename
  // -------------------------------------------------------------------------
  it("TEST-410: renders guardrailTest.filename", () => {
    renderView();
    const elements = screen.getAllByText(/LateFeeRoundingCharacterizationTest\.java/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-411: renders "BR-01" from guardrailTest.behaviorRuleId
  // -------------------------------------------------------------------------
  it("TEST-411: renders 'BR-01' from guardrailTest.behaviorRuleId", () => {
    renderView();
    const elements = screen.getAllByText("BR-01");
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-412: code block contains "1500.00"
  // -------------------------------------------------------------------------
  it("TEST-412: code block contains '1500.00' (canonical balance scenario)", () => {
    renderView();
    const elements = screen.getAllByText(/1500\.00/);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-413: code block contains "12.34" (the asserted current behavior)
  // -------------------------------------------------------------------------
  it("TEST-413: code block contains '12.34' (asserted current behavior)", () => {
    renderView();
    const elements = screen.getAllByText(/12\.34/);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-414: does NOT render "Test passed" or "Test failed"
  // -------------------------------------------------------------------------
  it("TEST-414: does not render 'Test passed' or 'Test failed'", () => {
    renderView();
    expect(screen.queryByText(/test passed/i)).toBeNull();
    expect(screen.queryByText(/test failed/i)).toBeNull();
  });
});
