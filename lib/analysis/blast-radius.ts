import { z } from "zod";

// ---------------------------------------------------------------------------
// BlastRadiusNodeKind — the category of a node in the impact graph
// ---------------------------------------------------------------------------

export const BlastRadiusNodeKindSchema = z.enum([
  "changed_symbol",
  "behavior_rule",
  "function",
  "service",
  "test",
]);
export type BlastRadiusNodeKind = z.infer<typeof BlastRadiusNodeKindSchema>;

// ---------------------------------------------------------------------------
// BlastRadiusNode — a vertex in the impact graph
// ---------------------------------------------------------------------------

export const BlastRadiusNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: BlastRadiusNodeKindSchema,
  file: z.string().optional(),
  symbol: z.string().optional(),
});
export type BlastRadiusNode = z.infer<typeof BlastRadiusNodeSchema>;

// ---------------------------------------------------------------------------
// BlastRadiusRelationship — the type of an edge in the impact graph
// ---------------------------------------------------------------------------

export const BlastRadiusRelationshipSchema = z.enum([
  "calls",
  "implements",
  "tested_by",
  "affects_rule",
  "downstream_of",
]);
export type BlastRadiusRelationship = z.infer<
  typeof BlastRadiusRelationshipSchema
>;

// ---------------------------------------------------------------------------
// BlastRadiusEdge — a directed edge in the impact graph
// ---------------------------------------------------------------------------

export const BlastRadiusEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  relationship: BlastRadiusRelationshipSchema,
});
export type BlastRadiusEdge = z.infer<typeof BlastRadiusEdgeSchema>;

// ---------------------------------------------------------------------------
// BlastRadiusResult — full impact graph for an analysis run (PRD §FR-017)
// ---------------------------------------------------------------------------

export const BlastRadiusResultSchema = z.object({
  analysisId: z.string(),
  rootChange: z.string(),
  nodes: z.array(BlastRadiusNodeSchema).min(1),
  edges: z.array(BlastRadiusEdgeSchema),
  affectedBehaviorRuleIds: z.array(z.string()),
});
export type BlastRadiusResult = z.infer<typeof BlastRadiusResultSchema>;

// ---------------------------------------------------------------------------
// BlastRadiusResultWireSchema — snake_case wire format
// Uses .passthrough() for forward compatibility and _fixture_note support.
// ---------------------------------------------------------------------------

const BlastRadiusNodeWireSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    kind: BlastRadiusNodeKindSchema,
    file: z.string().optional(),
    symbol: z.string().optional(),
  })
  .passthrough();

const BlastRadiusEdgeWireSchema = z
  .object({
    source: z.string(),
    target: z.string(),
    relationship: BlastRadiusRelationshipSchema,
  })
  .passthrough();

export const BlastRadiusResultWireSchema = z
  .object({
    analysis_id: z.string(),
    root_change: z.string(),
    nodes: z.array(BlastRadiusNodeWireSchema).min(1),
    edges: z.array(BlastRadiusEdgeWireSchema),
    affected_behavior_rule_ids: z.array(z.string()),
  })
  .passthrough();

export type BlastRadiusResultWire = z.infer<typeof BlastRadiusResultWireSchema>;

// ---------------------------------------------------------------------------
// blastRadiusFromWireFormat — maps snake_case wire to camelCase BlastRadiusResult
// SEC-001: caller must parse through BlastRadiusResultWireSchema before calling this.
// ---------------------------------------------------------------------------

export function blastRadiusFromWireFormat(
  wire: BlastRadiusResultWire
): BlastRadiusResult {
  return {
    analysisId: wire.analysis_id,
    rootChange: wire.root_change,
    nodes: wire.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      file: n.file,
      symbol: n.symbol,
    })),
    edges: wire.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relationship: e.relationship,
    })),
    affectedBehaviorRuleIds: wire.affected_behavior_rule_ids,
  };
}
