// ---------------------------------------------------------------------------
// lib/review-workspace/loader.ts
// Loads the Meridian development fixture data, validates it through Zod wire
// schemas, and maps it to typed domain models. This is the only module that
// imports fixture JSON directly. All UI components receive domain model types.
// ---------------------------------------------------------------------------

import reviewWireJson from "@/lib/analysis/fixtures/meridian-sample-review.json";
import contractWireJson from "@/lib/analysis/fixtures/meridian-sample-contract.json";
import metadataWireJson from "@/lib/analysis/fixtures/meridian-sample-metadata.json";
import intentWireJson from "@/lib/analysis/fixtures/meridian-sample-intent.json";
import guardrailTestWireJson from "@/lib/analysis/fixtures/meridian-sample-guardrail-test.json";

import {
  ReviewReportWireSchema,
  reviewFromWireFormat,
  type ReviewReport,
} from "@/lib/analysis/review";

import {
  BehavioralContractWireSchema,
  fromWireFormat,
} from "@/lib/analysis/parser";
import type { BehavioralContract } from "@/lib/analysis/types";

import {
  AnalysisMetadataWireSchema,
  metadataFromWireFormat,
  type AnalysisMetadata,
} from "@/lib/analysis/metadata";

import {
  RevealIntentWireSchema,
  intentFromWireFormat,
  type RevealIntent,
} from "@/lib/analysis/intent";

import {
  GuardrailTestWireSchema,
  guardrailTestFromWireFormat,
  type GuardrailTest,
} from "@/lib/analysis/guardrail-test";

// ---------------------------------------------------------------------------
// MeridianReviewSession — the complete dataset for the review workspace
// ---------------------------------------------------------------------------

export interface MeridianReviewSession {
  report: ReviewReport;
  contract: BehavioralContract;
  metadata: AnalysisMetadata;
  intent: RevealIntent;
  guardrailTest: GuardrailTest;
}

// ---------------------------------------------------------------------------
// getMeridianReviewSession — parse and map all fixture data
// SEC-001: all JSON goes through WireSchema.parse() before any field is accessed.
// SEC-301: intent JSON flows through RevealIntentWireSchema.parse() before mapping.
// SEC-401: guardrailTest JSON flows through GuardrailTestWireSchema.parse() before mapping.
// ---------------------------------------------------------------------------

export function getMeridianReviewSession(): MeridianReviewSession {
  const reportWire = ReviewReportWireSchema.parse(reviewWireJson);
  const contractWire = BehavioralContractWireSchema.parse(contractWireJson);
  const metadataWire = AnalysisMetadataWireSchema.parse(metadataWireJson);
  const intentWire = RevealIntentWireSchema.parse(intentWireJson);
  const guardrailTestWire = GuardrailTestWireSchema.parse(guardrailTestWireJson);

  return {
    report: reviewFromWireFormat(reportWire),
    contract: fromWireFormat(contractWire),
    metadata: metadataFromWireFormat(metadataWire),
    intent: intentFromWireFormat(intentWire),
    guardrailTest: guardrailTestFromWireFormat(guardrailTestWire),
  };
}
