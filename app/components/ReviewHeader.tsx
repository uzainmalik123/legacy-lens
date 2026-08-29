"use client";
// ---------------------------------------------------------------------------
// app/components/ReviewHeader.tsx — Client Component
// Compact workspace header: Legacy Lens identity + review context.
// Max height 48px on desktop. Not a hero section.
//
// REQ-007: analysisMode prop renders LIVE BOB ANALYSIS / DEVELOPMENT FIXTURE indicator.
// The ANALYZE CHANGE button is rendered here and forwarded via onAnalyze.
//
// Design intent:
//   Right zone reads left→right as: mode indicator → action → risk
//   Risk badge is always the visually dominant right element (Priority 2).
//   ANALYZE is a primary action, not a risk signal — no risk color used.
//   Mode indicator in fixture state is demoted metadata; in live state it is
//   a left-border accent strip that signals trustworthy live data.
// ---------------------------------------------------------------------------

import type { ReviewReport } from "@/lib/analysis/review";
import type { AnalysisMetadata } from "@/lib/analysis/metadata";

interface ReviewHeaderProps {
  report: ReviewReport;
  metadata: AnalysisMetadata;
  /** Shortened filename to display in the header (e.g. "MoneyUtils.java") */
  changedFile: string;
  /** Whether the current result is live Bob output or the development fixture */
  analysisMode?: "fixture" | "live";
  /** Called when the user clicks ANALYZE CHANGE */
  onAnalyze?: () => void;
  /** Disables the ANALYZE CHANGE button during in-flight requests */
  analyzeDisabled?: boolean;
}

function riskColor(severity: ReviewReport["overallRisk"]): string {
  switch (severity) {
    case "critical":
      return "text-[var(--risk-critical)] bg-[var(--risk-critical-bg)]";
    case "high":
      return "text-[var(--risk-high)] bg-[var(--risk-high-bg)]";
    case "medium":
      return "text-[var(--risk-medium)] bg-[var(--risk-medium-bg)]";
    case "low":
      return "text-[var(--risk-low)] bg-[var(--risk-low-bg)]";
    case "info":
    default:
      return "text-[var(--risk-info)] bg-[var(--risk-info-bg)]";
  }
}

function riskLabel(severity: ReviewReport["overallRisk"]): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1) + " risk";
}

function shortRepo(repo: string): string {
  // "demo/legacy-billing" → "legacy-billing"
  const parts = repo.split("/");
  return parts[parts.length - 1] ?? repo;
}

export default function ReviewHeader({
  report,
  metadata,
  changedFile,
  analysisMode,
  onAnalyze,
  analyzeDisabled = false,
}: ReviewHeaderProps) {
  const isLive = analysisMode === "live";
  const isFixture = analysisMode === "fixture";

  return (
    <header
      className="flex items-center gap-0 border-b shrink-0"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border-subtle)",
        height: "48px",
      }}
    >
      {/* Left: Product identity */}
      <div
        className="flex items-center gap-3 px-4 border-r h-full shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Minimal lens mark: circle with a right-notch suggesting a lens at angle */}
          <span
            aria-hidden="true"
            className="inline-block w-3.5 h-3.5 rounded-full border-2 shrink-0"
            style={{ borderColor: "var(--risk-high)" }}
          />
          <span
            className="text-xs font-semibold tracking-[0.12em] uppercase"
            style={{ color: "var(--text-primary)" }}
          >
            Legacy Lens
          </span>
        </div>
      </div>

      {/* Center: Review context — repo / change / file — flex-1 takes remaining space */}
      <div className="flex items-center gap-0 flex-1 px-0 h-full overflow-hidden min-w-0">
        {/* Repository */}
        <div
          className="flex items-center gap-1.5 px-4 border-r h-full shrink-0"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span
            className="text-[10px] uppercase tracking-widest font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            repo
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            {metadata.repository}
          </span>
        </div>

        {/* Changed file — gets remaining space, truncates */}
        <div
          className="flex items-center gap-1.5 px-4 border-r h-full min-w-0"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span
            className="text-[10px] uppercase tracking-widest font-medium shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            change
          </span>
          <span
            className="text-xs font-mono truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {changedFile}
          </span>
        </div>

        {/* Analysis stats — visible only at wide viewports */}
        <div className="hidden xl:flex items-center gap-4 px-4 h-full">
          <StatPill label="rules" value={metadata.behaviorRulesDiscovered} />
          <StatPill label="affected" value={metadata.affectedBehaviorRules} />
          <StatPill
            label="untested"
            value={metadata.untestedAffectedRules}
            dimmed
          />
        </div>
      </div>

      {/* Right: mode indicator · analyze action · risk — strict left→right priority */}
      <div
        className="flex items-center h-full shrink-0"
        style={{ gap: "1px", borderLeft: "1px solid var(--border-subtle)" }}
      >
        {/* ── Mode indicator ────────────────────────────────────────────────── */}
        {isLive && (
          // Live mode: left-border accent strip — trustworthy, not decorative
          <div
            className="flex items-center h-full px-3 shrink-0"
            style={{
              borderLeft: "2px solid #4ade80",
              background: "rgba(74, 222, 128, 0.06)",
            }}
            aria-label="Analysis mode: live Bob analysis"
          >
            <span
              className="text-[10px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: "#4ade80" }}
            >
              Live
            </span>
          </div>
        )}

        {isFixture && (
          // Fixture mode: demoted text-only label — contextual metadata, not prominent
          <div
            className="flex items-center h-full px-3 shrink-0"
            aria-label="Analysis mode: development fixture"
          >
            <span
              className="text-[10px] tracking-[0.08em] uppercase font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Fixture
            </span>
          </div>
        )}

        {/* ── ANALYZE CHANGE action ─────────────────────────────────────────── */}
        {onAnalyze && (
          <div
            className="flex items-center h-full px-3 shrink-0"
            style={{ borderLeft: "1px solid var(--border-subtle)" }}
          >
            {analyzeDisabled ? (
              // In-flight: pulse dot + label — honest state, no spinner theatrics
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                  style={{ background: "var(--text-muted)" }}
                  aria-hidden="true"
                />
                <span
                  className="text-[10px] uppercase tracking-[0.1em] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Analyzing
                </span>
              </div>
            ) : (
              // Ready: clean sharp-corner button — primary action, neutral palette
              <button
                onClick={onAnalyze}
                disabled={false}
                className="flex items-center gap-1.5 px-2.5 py-1 shrink-0 cursor-pointer"
                style={{
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "2px",
                  color: "var(--text-secondary)",
                }}
                aria-label="Analyze Change"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--text-muted)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border-muted)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-secondary)";
                }}
              >
                {/* Minimal "run" triangle — functional, not decorative */}
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M1.5 1L6.5 4L1.5 7V1Z" fill="currentColor" />
                </svg>
                <span className="text-[10px] uppercase tracking-[0.1em] font-semibold">
                  Analyze
                </span>
              </button>
            )}
          </div>
        )}

        {/* ── Risk badge — always the final, dominant right element ─────────── */}
        <div
          className="flex items-center h-full px-4 shrink-0"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          <span
            className={`text-xs font-semibold px-2 py-0.5 uppercase tracking-wide ${riskColor(report.overallRisk)}`}
            style={{ borderRadius: "2px" }}
            aria-label={`Overall risk: ${report.overallRisk}`}
          >
            {riskLabel(report.overallRisk)}
          </span>
        </div>
      </div>
    </header>
  );
}

function StatPill({
  label,
  value,
  dimmed = false,
}: {
  label: string;
  value: number;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: dimmed ? "var(--risk-medium)" : "var(--text-secondary)" }}
      >
        {value}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

// re-export shortRepo for use in tests / other components
export { shortRepo };
