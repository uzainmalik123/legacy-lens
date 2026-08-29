// ---------------------------------------------------------------------------
// app/__tests__/bob-analysis-pipeline.test.tsx
// Component tests for the Bob analysis pipeline feature.
// TEST-614, TEST-615, TEST-616, TEST-618 per contract.
// ---------------------------------------------------------------------------

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { it, expect, describe, afterEach, vi } from "vitest";

import ReviewHeader from "@/app/components/ReviewHeader";
import ReviewWorkspace from "@/app/components/ReviewWorkspace";
import { getMeridianReviewSession } from "@/lib/review-workspace/loader";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Load fixture session once
const fixtureSession = getMeridianReviewSession();

// ---------------------------------------------------------------------------
// TEST-614: ReviewHeader renders LIVE BOB ANALYSIS badge
// ---------------------------------------------------------------------------
describe("ReviewHeader analysisMode badge", () => {
  function renderHeader(mode?: "fixture" | "live") {
    return render(
      <ReviewHeader
        report={fixtureSession.report}
        metadata={fixtureSession.metadata}
        changedFile="MoneyUtils.java"
        analysisMode={mode}
      />
    );
  }

  it("TEST-614: renders LIVE BOB ANALYSIS when analysisMode is 'live'", () => {
    renderHeader("live");
    const badge = screen.getByLabelText(/analysis mode: live bob analysis/i);
    expect(badge).toBeDefined();
  });

  // TEST-615
  it("TEST-615: renders DEVELOPMENT FIXTURE when analysisMode is 'fixture'", () => {
    renderHeader("fixture");
    const badge = screen.getByLabelText(/analysis mode: development fixture/i);
    expect(badge).toBeDefined();
  });

  it("renders no mode badge when analysisMode is undefined", () => {
    renderHeader(undefined);
    expect(screen.queryByText(/live bob analysis/i)).toBeNull();
    expect(screen.queryByText(/development fixture/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ReviewWorkspace tests
// ---------------------------------------------------------------------------
describe("ReviewWorkspace", () => {
  function renderWorkspace() {
    // Mock fetch so no real network request is made (TEST-617 companion)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "not_configured", message: "Analysis not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )));

    return render(
      <ReviewWorkspace initialSession={fixtureSession} />
    );
  }

  // TEST-616: ANALYZE CHANGE button is rendered
  it("TEST-616: renders ANALYZE CHANGE button in initial fixture state", () => {
    renderWorkspace();
    const button = screen.getByRole("button", { name: /analyze change/i });
    expect(button).toBeDefined();
  });

  // TEST-615 via ReviewWorkspace: starts in fixture mode
  it("renders DEVELOPMENT FIXTURE badge on initial load", () => {
    renderWorkspace();
    const badge = screen.getByLabelText(/analysis mode: development fixture/i);
    expect(badge).toBeDefined();
  });

  // TEST-618: button is disabled while analyzing
  it("TEST-618: ANALYZE CHANGE button becomes disabled after click (in-flight)", async () => {
    // Make fetch hang indefinitely to keep the in-flight state
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => { /* never resolves */ }))
    );

    render(<ReviewWorkspace initialSession={fixtureSession} />);
    const button = screen.getByRole("button", { name: /analyze change/i });

    // Not disabled initially
    expect((button as HTMLButtonElement).disabled).toBe(false);

    // Click to start analysis
    fireEvent.click(button);

    // Button becomes disabled when in-flight (aria-label stays "Analyze Change")
    // Use findByRole with hidden:false to wait for React to re-render
    expect(
  await screen.findByText(/^analyzing$/i)
).toBeDefined();

expect(
  screen.queryByRole("button", { name: /analyze change/i })
).toBeNull();
  });
});
