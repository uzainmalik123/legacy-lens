import { z } from "zod";
import { BehavioralEvidenceSchema } from "@/lib/analysis/types";

// ---------------------------------------------------------------------------
// RevealIntent — PRD §FR-004, §FR-016
// Structured "Reveal Intent" information for a target symbol/function.
// ---------------------------------------------------------------------------

export const RevealIntentSchema = z.object({
  analysisId: z.string(),
  targetSymbol: z.string(),
  targetFile: z.string(),
  businessRole: z.string(),
  summary: z.string(),
  invariants: z.array(z.string()),
  relatedBehaviorRuleIds: z.array(z.string()),
  dependencies: z.array(z.string()),
  evidence: z.array(BehavioralEvidenceSchema),
  confidence: z.number().min(0).max(1),
});
export type RevealIntent = z.infer<typeof RevealIntentSchema>;

// ---------------------------------------------------------------------------
// RevealIntentWireSchema — snake_case wire format
// Uses .passthrough() for forward compatibility and _fixture_note support.
// ---------------------------------------------------------------------------

export const RevealIntentWireSchema = z
  .object({
    analysis_id: z.string(),
    target_symbol: z.string(),
    target_file: z.string(),
    business_role: z.string(),
    summary: z.string(),
    invariants: z.array(z.string()),
    related_behavior_rule_ids: z.array(z.string()),
    dependencies: z.array(z.string()),
    evidence: z.array(
      z
        .object({
          file: z.string(),
          symbol: z.string().optional(),
          line: z
            .union([
              z.number().int().min(1),
              z
                .tuple([z.number().int().min(1), z.number().int().min(1)])
                .refine(([s, e]) => e >= s, {
                  message: "line range end must be >= start",
                }),
            ])
            .optional(),
          excerpt: z.string().optional(),
          kind: z.enum(["source", "test", "dependency", "change"]),
        })
        .passthrough()
    ),
    confidence: z.number().min(0).max(1),
  })
  .passthrough();

export type RevealIntentWire = z.infer<typeof RevealIntentWireSchema>;

// ---------------------------------------------------------------------------
// intentFromWireFormat — maps snake_case wire object to camelCase RevealIntent
// SEC-001: caller must parse through RevealIntentWireSchema before calling this.
// ---------------------------------------------------------------------------

export function intentFromWireFormat(wire: RevealIntentWire): RevealIntent {
  return {
    analysisId: wire.analysis_id,
    targetSymbol: wire.target_symbol,
    targetFile: wire.target_file,
    businessRole: wire.business_role,
    summary: wire.summary,
    invariants: wire.invariants,
    relatedBehaviorRuleIds: wire.related_behavior_rule_ids,
    dependencies: wire.dependencies,
    evidence: wire.evidence.map((e) => ({
      file: e.file,
      symbol: e.symbol,
      line: e.line,
      excerpt: e.excerpt,
      kind: e.kind,
    })),
    confidence: wire.confidence,
  };
}
