"use client";

// ---------------------------------------------------------------------------
// app/components/FindingsPane.tsx — Client Component
// Renders the behavioral risk findings panel (right pane).
// Selection state, finding detail, evidence, confidence, test coverage.
// ---------------------------------------------------------------------------

import { useState } from "react";
import type { ReviewFinding } from "@/lib/analysis/review";
import type { BehavioralContract } from "@/lib/analysis/types";
import type { RevealIntent } from "@/lib/analysis/intent";
import { formatConfidence } from "@/lib/review-workspace/confidence";
import { shortFilePath, formatLineRange } from "@/lib/review-workspace/evidence-format";
import IntentPanel from "@/app/components/IntentPanel";

// ---------------------------------------------------------------------------
// Helper: severity color classes
// ---------------------------------------------------------------------------
function severityColor(severity: ReviewFinding["severity"]): {
  text: string;
  bg: string;
  border: string;
} {
  switch (severity) {
    case "critical":
      return {
        text: "text-[var(--risk-critical)]",
        bg: "bg-[var(--risk-critical-bg)]",
        border: "border-[var(--risk-critical)]",
      };
    case "high":
      return {
        text: "text-[var(--risk-high)]",
        bg: "bg-[var(--risk-high-bg)]",
        border: "border-[var(--risk-high)]",
      };
    case "medium":
      return {
        text: "text-[var(--risk-medium)]",
        bg: "bg-[var(--risk-medium-bg)]",
        border: "border-[var(--risk-medium)]",
      };
    case "low":
      return {
        text: "text-[var(--risk-low)]",
        bg: "bg-[var(--risk-low-bg)]",
        border: "border-[var(--risk-low)]",
      };
    case "info":
    default:
      return {
        text: "text-[var(--risk-info)]",
        bg: "bg-[var(--risk-info-bg)]",
        border: "border-[var(--risk-info)]",
      };
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface FindingsPaneProps {
  findings: ReviewFinding[];
  contract: BehavioralContract;
  intent?: RevealIntent;
}

// ---------------------------------------------------------------------------
// FindingsList — compact left column in the findings pane
// ---------------------------------------------------------------------------
function FindingsList({
  findings,
  selectedIndex,
  onSelect,
}: {
  findings: ReviewFinding[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div
      className="flex flex-col border-b"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className="px-4 py-2 border-b"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <span
          className="text-xs uppercase tracking-widest font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Findings — {findings.length}
        </span>
      </div>
      <div>
        {findings.map((finding, idx) => {
          const colors = severityColor(finding.severity);
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={finding.id}
              type="button"
              onClick={() => onSelect(idx)}
              className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
              style={{
                background: isSelected
                  ? "var(--surface-3)"
                  : "var(--surface-1)",
                borderLeft: isSelected
                  ? `3px solid var(--risk-${finding.severity})`
                  : "3px solid transparent",
                borderBottom: "1px solid var(--border-subtle)",
              }}
              aria-pressed={isSelected}
              aria-label={`Finding: ${finding.title}`}
            >
              {/* Severity tag */}
              <span
                className={`shrink-0 text-xs font-semibold uppercase tracking-wide mt-0.5 ${colors.text}`}
                style={{ minWidth: "3rem" }}
              >
                {finding.severity}
              </span>
              {/* Title */}
              <span
                className="text-sm leading-snug"
                style={{ color: "var(--text-secondary)" }}
              >
                {finding.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EvidenceList — traceable evidence items
// ---------------------------------------------------------------------------
function EvidenceList({ evidence }: { evidence: ReviewFinding["evidence"] }) {
  if (evidence.length === 0) return null;
  return (
    <div>
      <div
        className="text-xs uppercase tracking-widest font-medium mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        Evidence
      </div>
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
              {/* File + symbol + line */}
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
                    color: item.kind === "change"
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// FindingDetail — full detail panel for the selected finding
// ---------------------------------------------------------------------------
function FindingDetail({
  finding,
  contract,
  intent,
  showIntent,
  onToggleIntent,
}: {
  finding: ReviewFinding;
  contract: BehavioralContract;
  intent?: RevealIntent;
  showIntent: boolean;
  onToggleIntent: () => void;
}) {
  const colors = severityColor(finding.severity);
  const conf = formatConfidence(finding.confidence);

  // Look up rule titles from contract
  const ruleEntries = finding.behaviorRuleIds.map((ruleId) => {
    const rule = contract.rules.find((r) => r.id === ruleId);
    return { ruleId, title: rule?.title ?? null };
  });

  const isUncovered =
    finding.testCoverage === "uncovered" || finding.testCoverage === "partial";

  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      {/* Title row */}
      <div className="flex flex-col gap-2">
        {/* Severity badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${colors.text} ${colors.bg}`}
            aria-label={`Severity: ${finding.severity}`}
          >
            {finding.severity}
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {finding.id}
          </span>
        </div>
        <h2
          className="text-base font-semibold leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {finding.title}
        </h2>
      </div>

      {/* Affected behavioral rule(s) */}
      <Section label="Behavioral Rule">
        {ruleEntries.map(({ ruleId, title }) => (
          <div key={ruleId} className="flex flex-col gap-0.5">
            <span
              className="font-mono text-xs font-bold"
              style={{ color: "var(--risk-medium)" }}
            >
              {ruleId}
            </span>
            {title && (
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {title}
              </span>
            )}
          </div>
        ))}
      </Section>

      {/* Summary */}
      <Section label="Summary">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {finding.summary}
        </p>
      </Section>

      {/* Business impact */}
      <Section label="Business Impact">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        >
          {finding.businessImpact}
        </p>
      </Section>

      {/* Confidence + test coverage — side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Confidence */}
        <div
          className="rounded-sm px-3 py-3"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="text-xs uppercase tracking-widest font-medium mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            Confidence
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {conf.pct}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {conf.label}
            </span>
          </div>
        </div>

        {/* Test coverage */}
        <div
          className="rounded-sm px-3 py-3"
          style={{
            background: isUncovered
              ? "var(--risk-high-bg)"
              : "var(--surface-2)",
            border: isUncovered
              ? "1px solid var(--risk-high)"
              : "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="text-xs uppercase tracking-widest font-medium mb-1"
            style={{ color: isUncovered ? "var(--risk-high)" : "var(--text-muted)" }}
          >
            Test Coverage
          </div>
          {isUncovered ? (
            <div>
              <div
                className="text-sm font-semibold"
                style={{ color: "var(--risk-high)" }}
              >
                No characterization test
              </div>
              <div
                className="text-xs mt-0.5 leading-snug"
                style={{ color: "var(--text-secondary)" }}
              >
                Existing tests do not catch this regression
              </div>
            </div>
          ) : (
            <div
              className="text-sm font-semibold capitalize"
              style={{ color: "var(--text-secondary)" }}
            >
              {finding.testCoverage}
            </div>
          )}
        </div>
      </div>

      {/* Evidence */}
      <EvidenceList evidence={finding.evidence} />

      {/* Recommended action */}
      <Section label="Recommended Action">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {finding.recommendedAction}
        </p>
      </Section>

      {/* Reveal Intent toggle — only shown when intent data is available */}
      {intent && (
        <div>
          <button
            type="button"
            onClick={onToggleIntent}
            className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-colors w-full"
            style={{
              background: showIntent
                ? "var(--surface-3)"
                : "var(--surface-2)",
              border: "1px solid var(--border-muted)",
              color: showIntent
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              cursor: "pointer",
            }}
            aria-expanded={showIntent}
          >
            {/* Lens icon */}
            <span
              aria-hidden="true"
              className="inline-block w-3.5 h-3.5 rounded-full border-2 shrink-0"
              style={{
                borderColor: showIntent
                  ? "var(--risk-high)"
                  : "var(--text-muted)",
              }}
            />
            <span>{showIntent ? "Hide Intent" : "Reveal Intent"}</span>
          </button>

          {/* IntentPanel — CSS-transition-based reveal */}
          <div
            style={{
              overflow: "hidden",
              maxHeight: showIntent ? "9999px" : "0",
              opacity: showIntent ? 1 : 0,
              transition: showIntent
                ? "max-height 250ms ease-out, opacity 200ms ease-out"
                : "max-height 150ms ease-in, opacity 120ms ease-in",
            }}
          >
            {showIntent && (
              <IntentPanel intent={intent} contract={contract} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable section wrapper
// ---------------------------------------------------------------------------
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="text-xs uppercase tracking-widest font-medium mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FindingsPane — main export
// ---------------------------------------------------------------------------
export default function FindingsPane({
  findings,
  contract,
  intent,
}: FindingsPaneProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showIntent, setShowIntent] = useState(false);
  const selectedFinding = findings[selectedIndex];

  function handleSelectFinding(idx: number) {
    setSelectedIndex(idx);
    // Collapse intent panel when switching findings
    setShowIntent(false);
  }

  return (
    <section
      className="flex flex-col h-full overflow-hidden"
      aria-label="Behavioral risk findings"
    >
      {/* Pane header */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <span
          className="text-xs uppercase tracking-widest font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Behavioral Risk
        </span>
        {findings.length > 0 && (
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-sm"
            style={{
              background: "var(--risk-high-bg)",
              color: "var(--risk-high)",
            }}
          >
            {findings.length} finding{findings.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Finding list + detail */}
      {findings.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-sm">No findings for this change.</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Findings list */}
          <FindingsList
            findings={findings}
            selectedIndex={selectedIndex}
            onSelect={handleSelectFinding}
          />

          {/* Selected finding detail */}
          {selectedFinding && (
            <div className="flex-1 overflow-y-auto" style={{ background: "var(--surface-1)" }}>
              <FindingDetail
                finding={selectedFinding}
                contract={contract}
                intent={intent}
                showIntent={showIntent}
                onToggleIntent={() => setShowIntent((v) => !v)}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
