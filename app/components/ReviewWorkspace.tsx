"use client";
// ---------------------------------------------------------------------------
// app/components/ReviewWorkspace.tsx — Client Component
// Wraps the full review workspace with the ANALYZE CHANGE pipeline.
//
// REQ-006: renders fixture session from initialSession prop (SSR-compatible),
// exposes ANALYZE CHANGE button, disables during in-flight requests, shows
// honest four-stage progress, replaces session with live result on success,
// shows controlled error on failure — never silently substitutes fixture data.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";

import ReviewHeader from "@/app/components/ReviewHeader";
import DiffPane from "@/app/components/DiffPane";
import FindingsPane from "@/app/components/FindingsPane";
import AnalysisProgress, {
  type AnalysisStageUI,
} from "@/app/components/AnalysisProgress";
import { MeridianDiff } from "@/lib/review-workspace/diff";

import type { MeridianReviewSession } from "@/lib/review-workspace/loader";
import type { ReviewReport } from "@/lib/analysis/review";

// Wire → domain mappers
import {
  BehavioralContractWireSchema,
  fromWireFormat as contractFromWire,
} from "@/lib/analysis/parser";
import {
  ReviewReportWireSchema,
  reviewFromWireFormat,
} from "@/lib/analysis/review";
import {
  AnalysisMetadataWireSchema,
  metadataFromWireFormat,
} from "@/lib/analysis/metadata";
import {
  RevealIntentWireSchema,
  intentFromWireFormat,
} from "@/lib/analysis/intent";
import {
  GuardrailTestWireSchema,
  guardrailTestFromWireFormat,
} from "@/lib/analysis/guardrail-test";
import type { AnalysisBundleWire } from "@/lib/analysis/bundle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnalysisMode = "fixture" | "live";

type WorkspaceStage = AnalysisStageUI | "idle";

interface WorkspaceState {
  session: MeridianReviewSession;
  mode: AnalysisMode;
  stage: WorkspaceStage;
  errorMessage: string | null;
}

interface ReviewWorkspaceProps {
  initialSession: MeridianReviewSession;
}

// ---------------------------------------------------------------------------
// mapBundleToSession — maps validated wire bundle to domain session
// REQ-014: uses existing fromWireFormat functions — no new mapping logic
// ---------------------------------------------------------------------------

function mapBundleToSession(bundle: AnalysisBundleWire): MeridianReviewSession {
  const contractWire = BehavioralContractWireSchema.parse(bundle.behavioral_contract);
  const reviewWire = ReviewReportWireSchema.parse(bundle.review);
  const metadataWire = AnalysisMetadataWireSchema.parse(bundle.metadata);
  const intentWire = RevealIntentWireSchema.parse(bundle.intent);

  const session: MeridianReviewSession = {
    report: reviewFromWireFormat(reviewWire),
    contract: contractFromWire(contractWire),
    metadata: metadataFromWireFormat(metadataWire),
    intent: intentFromWireFormat(intentWire),
    // REQ-009 / AC-613: null guardrail_test shows "not generated" — no crash
    guardrailTest: bundle.guardrail_test
      ? guardrailTestFromWireFormat(
          GuardrailTestWireSchema.parse(bundle.guardrail_test)
        )
      : ({} as MeridianReviewSession["guardrailTest"]),
  };

  return session;
}

// ---------------------------------------------------------------------------
// ReviewWorkspace
// ---------------------------------------------------------------------------

export default function ReviewWorkspace({ initialSession }: ReviewWorkspaceProps) {
  const [state, setState] = useState<WorkspaceState>({
    session: initialSession,
    mode: "fixture",
    stage: "idle",
    errorMessage: null,
  });

  const isAnalyzing =
    state.stage === "preparing" ||
    state.stage === "analyzing" ||
    state.stage === "validating";

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return; // prevent duplicate requests

    // Stage: preparing
    setState((prev) => ({
      ...prev,
      stage: "preparing",
      errorMessage: null,
    }));

    // Stage: analyzing (immediately before fetch)
    setState((prev) => ({ ...prev, stage: "analyzing" }));

    let response: Response;
    try {
      response = await fetch("/api/analyze", { method: "POST" });
    } catch {
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorMessage:
          "Network error — could not reach the analysis server. Check that the server is running.",
      }));
      return;
    }

    // Stage: validating (fetch resolved, about to parse)
    setState((prev) => ({ ...prev, stage: "validating" }));

    if (!response.ok) {
      let errorMsg = `Analysis server returned HTTP ${response.status}.`;
      try {
        const body = await response.json();
        if (body?.message) errorMsg = body.message;
        else if (response.status === 503)
          errorMsg = "Analysis not configured — check environment variables.";
        else if (response.status === 422)
          errorMsg =
            "Analysis returned malformed data — results not displayed. Use DEVELOPMENT FIXTURE mode.";
      } catch {
        // ignore parse error
      }
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorMessage: errorMsg,
      }));
      return;
    }

    // Verify the live mode header
    const mode = response.headers.get("X-Analysis-Mode");

    let body: { bundle?: AnalysisBundleWire };
    try {
      body = await response.json();
    } catch {
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorMessage:
          "Analysis returned malformed data — results not displayed. Use DEVELOPMENT FIXTURE mode.",
      }));
      return;
    }

    if (!body?.bundle) {
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorMessage:
          "Analysis returned malformed data — results not displayed. Use DEVELOPMENT FIXTURE mode.",
      }));
      return;
    }

    // Map validated bundle to domain session
    let liveSession: MeridianReviewSession;
    try {
      liveSession = mapBundleToSession(body.bundle);
    } catch {
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorMessage:
          "Analysis returned malformed data — results not displayed. Use DEVELOPMENT FIXTURE mode.",
      }));
      return;
    }

    // Stage: complete
    setState({
      session: liveSession,
      mode: mode === "live" ? "live" : "fixture",
      stage: "complete",
      errorMessage: null,
    });
  }, [isAnalyzing]);

  const { session, mode, stage, errorMessage } = state;

  // Derive the short filename for the header
  const firstFinding: ReviewReport["findings"][0] | undefined =
    session.report.findings[0];
  const changedFileFull =
    firstFinding?.changedFile ??
    "src/main/java/com/meridian/billing/util/MoneyUtils.java";
  const changedFileShort =
    changedFileFull.split("/").pop() ?? changedFileFull;

  const showProgress = stage !== "idle" && stage !== "complete";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <ReviewHeader
        report={session.report}
        metadata={session.metadata}
        changedFile={changedFileShort}
        analysisMode={mode}
        onAnalyze={handleAnalyze}
        analyzeDisabled={isAnalyzing}
      />

      {/* Progress overlay (shown during analysis) */}
      {showProgress && (
        <div
          className="shrink-0 border-b"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--surface-2)",
          }}
        >
          <AnalysisProgress
            stage={stage as AnalysisStageUI}
            errorMessage={errorMessage ?? undefined}
          />
        </div>
      )}

      {/* Main split workspace */}
      <main className="flex flex-1 overflow-hidden">
        <div
          className="flex-1 overflow-hidden border-r"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <DiffPane diff={MeridianDiff} />
        </div>

        <div className="flex-1 overflow-hidden">
          <FindingsPane
            findings={session.report.findings}
            contract={session.contract}
            intent={session.intent}
            guardrailTest={
              session.guardrailTest &&
              Object.keys(session.guardrailTest).length > 0
                ? session.guardrailTest
                : undefined
            }
            analysisMode={mode}
          />
        </div>
      </main>
    </div>
  );
}
