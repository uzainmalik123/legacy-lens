// ---------------------------------------------------------------------------
// app/__tests__/review-workspace.test.tsx
// Component tests for the Legacy Lens review workspace.
// TEST-201 through TEST-210 as specified in the Feature 3 contract.
// ---------------------------------------------------------------------------

import { render, screen, cleanup } from "@testing-library/react";
import { it, expect, describe, afterEach } from "vitest";

import ReviewHeader from "@/app/components/ReviewHeader";
import DiffPane from "@/app/components/DiffPane";
import FindingsPane from "@/app/components/FindingsPane";
import { getMeridianReviewSession } from "@/lib/review-workspace/loader";
import { MeridianDiff } from "@/lib/review-workspace/diff";

// Cleanup DOM between tests to prevent element accumulation
afterEach(cleanup);

// Load the canonical Meridian session once for all tests
const { report, contract, metadata } = getMeridianReviewSession();

// ---------------------------------------------------------------------------
// TEST-201: ReviewHeader renders repository name
// ---------------------------------------------------------------------------
describe("ReviewHeader", () => {
  it("TEST-201: renders the repository name from metadata", () => {
    render(
      <ReviewHeader
        report={report}
        metadata={metadata}
        changedFile="MoneyUtils.java"
      />
    );
    expect(screen.getByText("demo/legacy-billing")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // TEST-202: ReviewHeader renders overall risk level
  // -------------------------------------------------------------------------
  it("TEST-202: renders the overall risk level 'high'", () => {
    render(
      <ReviewHeader
        report={report}
        metadata={metadata}
        changedFile="MoneyUtils.java"
      />
    );
    // The risk badge renders text "High risk"
    expect(screen.getByText(/high risk/i)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TEST-203 & TEST-204: DiffPane renders DOWN and HALF_UP
// ---------------------------------------------------------------------------
describe("DiffPane", () => {
  it("TEST-203: renders RoundingMode.DOWN in a removed line", () => {
    render(<DiffPane diff={MeridianDiff} />);
    const elements = screen.getAllByText(/RoundingMode\.DOWN/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it("TEST-204: renders RoundingMode.HALF_UP in an added line", () => {
    render(<DiffPane diff={MeridianDiff} />);
    const elements = screen.getAllByText(/RoundingMode\.HALF_UP/);
    expect(elements.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TEST-205 through TEST-210: FindingsPane
// ---------------------------------------------------------------------------
describe("FindingsPane", () => {
  function renderFindingsPane() {
    return render(
      <FindingsPane findings={report.findings} contract={contract} />
    );
  }

  // -------------------------------------------------------------------------
  // TEST-205: renders the F-001 finding title
  // -------------------------------------------------------------------------
  it("TEST-205: renders the F-001 finding title", () => {
    renderFindingsPane();
    // Title appears in both the list button and the detail h2 — use getAllByText
    const elements = screen.getAllByText(/late-fee rounding mode changed/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-206: renders severity 'high'
  // -------------------------------------------------------------------------
  it("TEST-206: renders severity label 'high'", () => {
    renderFindingsPane();
    const severityElements = screen.getAllByText(/^high$/i);
    expect(severityElements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-207: confidence label uses confidenceLabel() — renders "High confidence"
  // -------------------------------------------------------------------------
  it("TEST-207: confidence label is 'High confidence' for score 0.96", () => {
    renderFindingsPane();
    // F-001 has confidence 0.96 → confidenceLabel returns "high" → "High confidence"
    const elements = screen.getAllByText(/high confidence/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-208: renders missing test coverage indicator
  // -------------------------------------------------------------------------
  it("TEST-208: renders 'No characterization test' for uncovered test coverage", () => {
    renderFindingsPane();
    const elements = screen.getAllByText(/no characterization test/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-209: evidence list contains MoneyUtils.java
  // -------------------------------------------------------------------------
  it("TEST-209: renders evidence path containing 'MoneyUtils.java'", () => {
    renderFindingsPane();
    const elements = screen.getAllByText(/MoneyUtils\.java/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TEST-210: renders BR-01 rule ID
  // -------------------------------------------------------------------------
  it("TEST-210: renders BR-01 behavioral rule ID", () => {
    renderFindingsPane();
    const elements = screen.getAllByText("BR-01");
    expect(elements.length).toBeGreaterThan(0);
  });
});
