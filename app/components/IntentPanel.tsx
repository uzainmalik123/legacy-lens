"use client";

// ---------------------------------------------------------------------------
// app/components/IntentPanel.tsx — Client Component
// Renders structured "Reveal Intent" information for the selected symbol.
// Sources: RevealIntent domain model from lib/analysis/intent.ts
// PRD §FR-016, §19.6, US-008
// ---------------------------------------------------------------------------

import type { RevealIntent } from "@/lib/analysis/intent";
import type { BehavioralContract } from "@/lib/analysis/types";
import { formatConfidence } from "@/lib/review-workspace/confidence";
import {
  shortFilePath,
  formatLineRange,
} from "@/lib/review-workspace/evidence-format";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface IntentPanelProps {
  intent: RevealIntent;
  contract: BehavioralContract;
}

// ---------------------------------------------------------------------------
// InferredBadge — small inline label for inferred content (REQ-006)
// ---------------------------------------------------------------------------
function InferredBadge() {
  return (
    <span
      className="text-xs font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ml-2"
      style={{
        background: "rgba(107, 114, 128, 0.15)",
        color: "var(--text-muted)",
        verticalAlign: "middle",
      }}
    >
      inferred
    </span>
  );
}

// ---------------------------------------------------------------------------
// ObservedBadge — small inline label for observed content (REQ-006)
// ---------------------------------------------------------------------------
function ObservedBadge() {
  return (
    <span
      className="text-xs font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ml-2"
      style={{
        background: "rgba(74, 144, 196, 0.12)",
        color: "var(--risk-low)",
        verticalAlign: "middle",
      }}
    >
      observed
    </span>
  );
}

// ---------------------------------------------------------------------------
// IntentSection — reusable section wrapper matching FindingsPane style
// ---------------------------------------------------------------------------
function IntentSection({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="flex items-center text-xs uppercase tracking-widest font-medium mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
        {badge}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IntentEvidenceList — evidence items using shared formatting utilities
// Mirrors the EvidenceList pattern from FindingsPane (REQ-009)
// ---------------------------------------------------------------------------
function IntentEvidenceList({ evidence }: { evidence: RevealIntent["evidence"] }) {
  if (evidence.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {evidence.map((item, idx) => {
        const lineRange = formatLineRange(item.line);
        return (
          <div
            key={idx}
            className="rounded-sm p-3"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* File + symbol + line + kind */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
              <span
                className="font-mono text-xs"
                style={{ color: "var(--text-secondary)" }}
                title={item.file}
              >
                {shortFilePath(item.file)}
              </span>
              {item.symbol && (
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.symbol}
                </span>
              )}
              {lineRange && (
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {lineRange}
                </span>
              )}
              {/* Kind tag */}
              <span
                className="text-xs uppercase tracking-wide"
                style={{
                  color:
                    item.kind === "change"
                      ? "var(--risk-high)"
                      : item.kind === "test"
                        ? "var(--risk-low)"
                        : "var(--text-muted)",
                }}
              >
                {item.kind}
              </span>
            </div>
            {/* Excerpt */}
            {item.excerpt && (
              <pre
                className="text-xs overflow-x-auto mt-1"
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  color: "var(--text-code)",
                  whiteSpace: "pre",
                  maxHeight: "4.5rem",
                  overflowY: "hidden",
                }}
              >
                {item.excerpt}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IntentPanel — main export
// ---------------------------------------------------------------------------
export default function IntentPanel({ intent, contract }: IntentPanelProps) {
  const conf = formatConfidence(intent.confidence);

  // Resolve rule titles from contract
  const ruleEntries = intent.relatedBehaviorRuleIds.map((ruleId) => {
    const rule = contract.rules.find((r) => r.id === ruleId);
    return { ruleId, title: rule?.title ?? null };
  });

  return (
    <div
      className="flex flex-col gap-5 px-5 py-4"
      style={{
        borderTop: "1px solid var(--border-muted)",
        background: "var(--surface-2)",
      }}
    >
      {/* Panel header */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block w-3.5 h-3.5 rounded-full border-2 shrink-0"
          style={{ borderColor: "var(--risk-high)" }}
        />
        <span
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: "var(--risk-high)" }}
        >
          Revealed Intent
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          {intent.targetSymbol}
        </span>
      </div>

      {/* Business Role — INFERRED */}
      <IntentSection label="Business Role" badge={<InferredBadge />}>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        >
          {intent.businessRole}
        </p>
      </IntentSection>

      {/* Intent Summary — INFERRED */}
      <IntentSection label="Intent Summary" badge={<InferredBadge />}>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {intent.summary}
        </p>
      </IntentSection>

      {/* Behavioral Invariants — OBSERVED */}
      <IntentSection label="Behavioral Invariants" badge={<ObservedBadge />}>
        <ul className="flex flex-col gap-1.5">
          {intent.invariants.map((inv, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span
                className="shrink-0 text-xs mt-1 font-bold"
                style={{ color: "var(--risk-low)" }}
                aria-hidden="true"
              >
                ·
              </span>
              <span
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {inv}
              </span>
            </li>
          ))}
        </ul>
      </IntentSection>

      {/* Related Behavioral Rules */}
      <IntentSection label="Related Behavioral Rules">
        <div className="flex flex-wrap gap-2">
          {ruleEntries.map(({ ruleId, title }) => (
            <div
              key={ruleId}
              className="flex flex-col gap-0.5 rounded-sm px-2.5 py-1.5"
              style={{
                background: "var(--surface-3)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span
                className="font-mono text-xs font-bold"
                style={{ color: "var(--risk-medium)" }}
              >
                {ruleId}
              </span>
              {title && (
                <span
                  className="text-xs leading-snug"
                  style={{ color: "var(--text-muted)" }}
                >
                  {title}
                </span>
              )}
            </div>
          ))}
        </div>
      </IntentSection>

      {/* Dependencies */}
      {intent.dependencies.length > 0 && (
        <IntentSection label="Dependencies">
          <ul className="flex flex-col gap-1">
            {intent.dependencies.map((dep, idx) => (
              <li key={idx}>
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {dep}
                </span>
              </li>
            ))}
          </ul>
        </IntentSection>
      )}

      {/* Confidence */}
      <IntentSection label="Confidence">
        <div
          className="inline-flex items-baseline gap-2 rounded-sm px-3 py-2"
          style={{
            background: "var(--surface-3)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: "var(--text-primary)" }}
          >
            {conf.pct}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {conf.label}
          </span>
        </div>
      </IntentSection>

      {/* Evidence — OBSERVED */}
      <IntentSection label="Evidence" badge={<ObservedBadge />}>
        <IntentEvidenceList evidence={intent.evidence} />
      </IntentSection>
    </div>
  );
}
