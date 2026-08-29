// ---------------------------------------------------------------------------
// app/components/ReviewHeader.tsx — Server Component
// Compact workspace header: Legacy Lens identity + review context.
// Max height 48px on desktop. Not a hero section.
// ---------------------------------------------------------------------------

import type { ReviewReport } from "@/lib/analysis/review";
import type { AnalysisMetadata } from "@/lib/analysis/metadata";

interface ReviewHeaderProps {
  report: ReviewReport;
  metadata: AnalysisMetadata;
  /** Shortened filename to display in the header (e.g. "MoneyUtils.java") */
  changedFile: string;
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
}: ReviewHeaderProps) {
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
        className="flex items-center gap-3 px-4 border-r h-full"
        style={{ borderColor: "var(--border-subtle)", minWidth: 0 }}
      >
        {/* Wordmark */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Minimal lens icon using CSS */}
          <span
            aria-hidden="true"
            className="inline-block w-4 h-4 rounded-full border-2 relative shrink-0"
            style={{ borderColor: "var(--risk-high)" }}
          />
          <span
            className="text-sm font-semibold tracking-wide"
            style={{ color: "var(--text-primary)", letterSpacing: "0.05em" }}
          >
            LEGACY LENS
          </span>
        </div>
      </div>

      {/* Center: Review context */}
      <div className="flex items-center gap-0 flex-1 px-4 h-full overflow-hidden">
        {/* Repository */}
        <div className="flex items-center gap-1.5 pr-4 border-r h-full shrink-0"
          style={{ borderColor: "var(--border-subtle)" }}>
          <span
            className="text-xs uppercase tracking-widest font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            repo
          </span>
          <span
            className="text-sm font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            {metadata.repository}
          </span>
        </div>

        {/* Change target */}
        <div className="flex items-center gap-1.5 px-4 border-r h-full shrink-0"
          style={{ borderColor: "var(--border-subtle)" }}>
          <span
            className="text-xs uppercase tracking-widest font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            change
          </span>
          <span
            className="text-sm font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            {metadata.targetRevision}
          </span>
        </div>

        {/* Changed file */}
        <div className="flex items-center gap-1.5 px-4 border-r h-full min-w-0"
          style={{ borderColor: "var(--border-subtle)" }}>
          <span
            className="text-xs uppercase tracking-widest font-medium shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            file
          </span>
          <span
            className="text-sm font-mono truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {changedFile}
          </span>
        </div>

        {/* Analysis scope stats — compact */}
        <div className="hidden xl:flex items-center gap-4 px-4 h-full">
          <StatPill label="rules discovered" value={metadata.behaviorRulesDiscovered} />
          <StatPill label="affected" value={metadata.affectedBehaviorRules} />
          <StatPill label="untested" value={metadata.untestedAffectedRules} dimmed />
        </div>
      </div>

      {/* Right: Risk + status */}
      <div className="flex items-center gap-3 px-4 h-full shrink-0">
        {/* Status */}
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
          title={`Analysis status: ${metadata.status}`}
        >
          {metadata.status === "complete" ? "Analysis complete" : metadata.status}
        </span>

        {/* Risk badge */}
        <span
          className={`text-xs font-semibold px-2.5 py-0.5 rounded-sm uppercase tracking-wide ${riskColor(report.overallRisk)}`}
          aria-label={`Overall risk: ${report.overallRisk}`}
        >
          {riskLabel(report.overallRisk)}
        </span>
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
        className="text-sm font-semibold tabular-nums"
        style={{ color: dimmed ? "var(--risk-medium)" : "var(--text-secondary)" }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

// re-export shortRepo for use in tests / other components
export { shortRepo };
