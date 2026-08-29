// ---------------------------------------------------------------------------
// app/__tests__/reveal-intent.test.tsx
// Component tests for the Reveal Intent feature (Feature 4).
// TEST-301 through TEST-308 as specified in the feat-reveal-intent contract.
// ---------------------------------------------------------------------------

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { it, expect, describe, afterEach } from "vitest";

import FindingsPane from "@/app/components/FindingsPane";
import IntentPanel from "@/app/components/IntentPanel";
import { getMeridianReviewSession } from "@/lib/review-workspace/loader";

// Cleanup DOM between tests
afterEach(cleanup);

// Load canonical Meridian session once — includes intent (REQ-002)
const { report, contract, intent } = getMeridianReviewSession();

// ---------------------------------------------------------------------------
// TEST-301: FindingsPane renders "Reveal Intent" button when intent is provided
// ---------------------------------------------------------------------------
describe("FindingsPane with intent", () => {
  function renderPane() {
    return render(
      <FindingsPane
        findings={report.findings}
        contract={contract}
        intent={intent}
      />
    );
  }

  it("TEST-301: renders a 'Reveal Intent' button when intent prop is provided", () => {
    renderPane();
    const button = screen.getByRole("button", { name: /reveal intent/i });
    expect(button).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // TEST-302: activating Reveal Intent causes intent panel to appear in the DOM
  // -------------------------------------------------------------------------
  it("TEST-302: clicking 'Reveal Intent' shows the intent panel content", () => {
    renderPane();
    const button = screen.getByRole("button", { name: /reveal intent/i });
    fireEvent.click(button);
    // The business role from the fixture should be visible in the DOM
    const elements = screen.getAllByText(/computes the late fee/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-308: clicking Reveal Intent a second time removes the panel from DOM
  // -------------------------------------------------------------------------
  it("TEST-308: clicking 'Reveal Intent' twice (toggle) removes the intent panel", () => {
    renderPane();
    const button = screen.getByRole("button", { name: /reveal intent/i });
    // Open
    fireEvent.click(button);
    // Verify panel is present
    expect(screen.getAllByText(/computes the late fee/i).length).toBeGreaterThan(0);
    // Close — button now reads "Hide Intent"
    const hideButton = screen.getByRole("button", { name: /hide intent/i });
    fireEvent.click(hideButton);
    // Panel content should be gone
    expect(screen.queryAllByText(/computes the late fee/i).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TEST-303 through TEST-307: IntentPanel content
// Render IntentPanel directly with the Meridian fixture intent + contract
// ---------------------------------------------------------------------------
describe("IntentPanel", () => {
  function renderPanel() {
    return render(<IntentPanel intent={intent} contract={contract} />);
  }

  // -------------------------------------------------------------------------
  // TEST-303: renders intent.businessRole
  // -------------------------------------------------------------------------
  it("TEST-303: renders intent.businessRole text", () => {
    renderPanel();
    // businessRole from fixture: "Computes the late fee charged to a billing account..."
    const elements = screen.getAllByText(/computes the late fee/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-304: renders at least the first behavioral invariant
  // -------------------------------------------------------------------------
  it("TEST-304: renders at least the first behavioral invariant", () => {
    renderPanel();
    // invariants[0]: "Zero or negative outstanding balance always produces a zero late fee..."
    const elements = screen.getAllByText(/zero or negative outstanding balance/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-305: confidence renders as "95%" for score 0.95
  // -------------------------------------------------------------------------
  it("TEST-305: renders confidence as '95%' for intent.confidence 0.95", () => {
    renderPanel();
    const elements = screen.getAllByText("95%");
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-306: evidence renders an item containing MoneyUtils.java
  // -------------------------------------------------------------------------
  it("TEST-306: renders an evidence item containing 'MoneyUtils.java'", () => {
    renderPanel();
    const elements = screen.getAllByText(/MoneyUtils\.java/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-307: renders "BR-01" from intent.relatedBehaviorRuleIds
  // -------------------------------------------------------------------------
  it("TEST-307: renders 'BR-01' from intent.relatedBehaviorRuleIds", () => {
    renderPanel();
    const elements = screen.getAllByText("BR-01");
    expect(elements.length).toBeGreaterThan(0);
  });
});
