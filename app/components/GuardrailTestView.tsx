"use client";

// ---------------------------------------------------------------------------
// app/components/GuardrailTestView.tsx — Client Component
// Displays a fixture-driven generated characterization (guardrail) test.
// All content sourced from the GuardrailTest domain model — no hardcoded Java.
// PRD §FR-011, §FR-019, §19.8, US-007
// ---------------------------------------------------------------------------

import { useState } from "react";
import type { GuardrailTest } from "@/lib/analysis/guardrail-test";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface GuardrailTestViewProps {
  guardrailTest: GuardrailTest;
}

// ---------------------------------------------------------------------------
// GuardrailSection — reusable labeled section matching FindingsPane style
// ---------------------------------------------------------------------------
function GuardrailSection({
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
// GuardrailTestView — main export
// SEC-402: no dangerouslySetInnerHTML; all fields from typed domain model only.
// ---------------------------------------------------------------------------
export default function GuardrailTestView({ guardrailTest }: GuardrailTestViewProps) {
  const [copyLabel, setCopyLabel] = useState<"Copy" | "Copied">("Copy");

  function handleCopy() {
    // SEC-403: clipboard write only; errors silently caught
    navigator.clipboard?.writeText(guardrailTest.code).then(
      () => {
        setCopyLabel("Copied");
        setTimeout(() => setCopyLabel("Copy"), 2000);
      },
      () => {
        // clipboard unavailable — no-op
      }
    );
  }

  const { boundaryScenario } = guardrailTest;

  return (
    <div
      className="flex flex-col gap-4 rounded-sm p-4 mt-1"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-muted)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          {/* Label */}
          <div
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            Guardrail Test
          </div>
          {/* Filename */}
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {guardrailTest.filename}
          </span>
        </div>

        {/* FIXTURE-DRIVEN badge — REQ-009, communicates not live Bob output */}
        <span
          className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0"
          style={{
            background: "rgba(107, 114, 128, 0.15)",
            color: "var(--text-muted)",
          }}
        >
          Fixture-driven
        </span>
      </div>

      {/* Coverage target */}
      <GuardrailSection label="Coverage Target">
        <div className="flex items-start gap-3 flex-wrap">
          <span
            className="font-mono text-xs font-bold px-2 py-1 rounded-sm shrink-0"
            style={{
              background: "var(--surface-3)",
              color: "var(--risk-medium)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {guardrailTest.behaviorRuleId}
          </span>
          <span
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {guardrailTest.protectedBehavior}
          </span>
        </div>
      </GuardrailSection>

      {/* Boundary scenario */}
      <GuardrailSection label="Boundary Scenario">
        <div
          className="rounded-sm p-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-mono"
          style={{
            background: "var(--surface-3)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {[
            { label: "balance", value: boundaryScenario.balance },
            { label: "rate", value: boundaryScenario.rate },
            { label: "raw fee", value: boundaryScenario.rawFee },
            { label: "current (DOWN)", value: boundaryScenario.currentResult },
            { label: "proposed (HALF_UP)", value: boundaryScenario.proposedResult },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-2">
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span style={{ color: "var(--text-code)" }}>{value}</span>
            </div>
          ))}
        </div>
      </GuardrailSection>

      {/* Behavior baseline — current vs proposed */}
      <GuardrailSection label="Expected Detection">
        <div
          className="rounded-sm p-3 flex flex-col gap-2"
          style={{
            background: "var(--surface-3)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-3 text-xs font-mono">
            <span
              className="px-1.5 py-0.5 rounded-sm text-xs uppercase tracking-wide font-semibold"
              style={{
                background: "rgba(74, 144, 196, 0.12)",
                color: "var(--risk-low)",
              }}
            >
              Current
            </span>
            <span style={{ color: "var(--text-code)" }}>
              {boundaryScenario.rawFee} → {boundaryScenario.currentResult}
            </span>
            <span style={{ color: "var(--text-muted)" }}>RoundingMode.DOWN</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span
              className="px-1.5 py-0.5 rounded-sm text-xs uppercase tracking-wide font-semibold"
              style={{
                background: "var(--risk-high-bg)",
                color: "var(--risk-high)",
              }}
            >
              Proposed
            </span>
            <span style={{ color: "var(--text-code)" }}>
              {boundaryScenario.rawFee} → {boundaryScenario.proposedResult}
            </span>
            <span style={{ color: "var(--text-muted)" }}>RoundingMode.HALF_UP</span>
          </div>
          <p
            className="text-xs leading-relaxed mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {guardrailTest.detectionNote}
          </p>
        </div>
      </GuardrailSection>

      {/* Generated test code */}
      <GuardrailSection label="Generated Test">
        <div
          className="rounded-sm overflow-hidden"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          {/* Code toolbar */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{
              background: "var(--surface-3)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="font-mono text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {guardrailTest.language} · {guardrailTest.framework}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs px-2 py-0.5 rounded-sm"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {copyLabel}
            </button>
          </div>
          {/* Code block — no dangerouslySetInnerHTML; plain text in pre */}
          <pre
            className="text-xs overflow-x-auto p-4"
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              color: "var(--text-code)",
              background: "var(--surface-1)",
              maxHeight: "22rem",
              overflowY: "auto",
              whiteSpace: "pre",
              lineHeight: 1.6,
            }}
          >
            {guardrailTest.code}
          </pre>
        </div>
      </GuardrailSection>

      {/* Rationale */}
      <GuardrailSection label="Rationale">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {guardrailTest.rationale}
        </p>
      </GuardrailSection>
    </div>
  );
}
