import { z } from "zod";
import {
  BehavioralContract,
  BehavioralContractSchema,
} from "@/lib/analysis/types";

// ---------------------------------------------------------------------------
// ContractValidationError
// ---------------------------------------------------------------------------

export class ContractValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractValidationError";
  }
}

// ---------------------------------------------------------------------------
// parseContract — validates camelCase BehavioralContract from unknown input
// SEC-001: all field access goes through Zod before anything is touched
// ---------------------------------------------------------------------------

export function parseContract(input: unknown): BehavioralContract {
  const result = BehavioralContractSchema.safeParse(input);
  if (!result.success) {
    throw new ContractValidationError(
      `Invalid BehavioralContract: ${result.error.message}`
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// BehavioralContractWireSchema — snake_case wire format (PRD §20.1)
// Uses .passthrough() so that _fixture_note and other unknown keys are allowed
// ---------------------------------------------------------------------------

const BehavioralEvidenceWireSchema = z
  .object({
    file: z.string(),
    symbol: z.string().optional(),
    line: z
      .union([
        z.number().int().min(1),
        z
          .tuple([z.number().int().min(1), z.number().int().min(1)])
          .refine(([start, end]) => end >= start, {
            message: "line range end must be >= start",
          }),
      ])
      .optional(),
    excerpt: z.string().optional(),
    kind: z.enum(["source", "test", "dependency", "change"]),
  })
  .passthrough();

const BehavioralRuleWireSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    business_context: z.string(),
    invariant: z.string(),
    evidence: z.array(BehavioralEvidenceWireSchema).min(1),
    confidence: z.number().min(0).max(1),
    test_coverage: z.enum(["covered", "partial", "uncovered", "unknown"]),
    related_symbols: z.array(z.string()),
    downstream_dependencies: z.array(z.string()),
    risk_if_changed: z.string(),
  })
  .passthrough();

export const BehavioralContractWireSchema = z
  .object({
    analysis_id: z.string(),
    generated_at: z.string().datetime(),
    source_fixture: z.string(),
    rules: z.array(BehavioralRuleWireSchema).min(1),
  })
  .passthrough();

export type BehavioralContractWire = z.infer<typeof BehavioralContractWireSchema>;

// ---------------------------------------------------------------------------
// fromWireFormat — maps snake_case wire object to camelCase BehavioralContract
// ---------------------------------------------------------------------------

export function fromWireFormat(wire: BehavioralContractWire): BehavioralContract {
  return {
    analysisId: wire.analysis_id,
    generatedAt: wire.generated_at,
    sourceFixture: wire.source_fixture,
    rules: wire.rules.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      businessContext: r.business_context,
      invariant: r.invariant,
      evidence: r.evidence.map((e) => ({
        file: e.file,
        symbol: e.symbol,
        line: e.line,
        excerpt: e.excerpt,
        kind: e.kind,
      })),
      confidence: r.confidence,
      testCoverage: r.test_coverage,
      relatedSymbols: r.related_symbols,
      downstreamDependencies: r.downstream_dependencies,
      riskIfChanged: r.risk_if_changed,
    })),
  };
}
