// ---------------------------------------------------------------------------
// lib/analysis/bundle.ts
// Aggregate wire schema for the full Bob analysis response.
//
// SEC-605: all Bob response fields are accessed only after safeParse() passes.
// The bundle is the single validation gate — callers must not access any
// field on the raw Bob response body.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { BehavioralContractWireSchema } from "@/lib/analysis/parser";
import { ReviewReportWireSchema } from "@/lib/analysis/review";
import { AnalysisMetadataWireSchema } from "@/lib/analysis/metadata";
import { RevealIntentWireSchema } from "@/lib/analysis/intent";
import { GuardrailTestWireSchema } from "@/lib/analysis/guardrail-test";
import { BlastRadiusResultWireSchema } from "@/lib/analysis/blast-radius";

// ---------------------------------------------------------------------------
// AnalysisBundleWireSchema — matches the JSON object Bob must return
// ---------------------------------------------------------------------------

export const AnalysisBundleWireSchema = z.object({
  behavioral_contract: BehavioralContractWireSchema,
  review: ReviewReportWireSchema,
  metadata: AnalysisMetadataWireSchema,
  intent: RevealIntentWireSchema,
  /** Nullable — Bob may not have enough evidence for a guardrail test */
  guardrail_test: GuardrailTestWireSchema.nullable(),
  /** Optional — forward compatibility; not rendered in this feature */
  blast_radius: BlastRadiusResultWireSchema.optional(),
});

export type AnalysisBundleWire = z.infer<typeof AnalysisBundleWireSchema>;
