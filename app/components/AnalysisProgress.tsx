"use client";
// ---------------------------------------------------------------------------
// app/components/AnalysisProgress.tsx — Client Component
// Honest pipeline stage progress indicator for Bob analysis.
//
// REQ-008: stages are: preparing | analyzing | validating | complete | error
// "analyzing" copy is "IBM Bob analyzing…" — no fabricated sub-agent stages.
// ---------------------------------------------------------------------------

export type AnalysisStageUI =
  | "preparing"
  | "analyzing"
  | "validating"
  | "complete"
  | "error";

interface AnalysisProgressProps {
  stage: AnalysisStageUI;
  errorMessage?: string;
}

const STAGES: { key: AnalysisStageUI; label: string }[] = [
  { key: "preparing", label: "Preparing" },
  { key: "analyzing", label: "IBM Bob analyzing…" },
  { key: "validating", label: "Validating" },
  { key: "complete", label: "Complete" },
];

const STAGE_ORDER: Record<AnalysisStageUI, number> = {
  preparing: 0,
  analyzing: 1,
  validating: 2,
  complete: 3,
  error: -1,
};

export default function AnalysisProgress({
  stage,
  errorMessage,
}: AnalysisProgressProps) {
  const isError = stage === "error";
  const currentIndex = STAGE_ORDER[stage];

  return (
    <div
      className="flex flex-col gap-3 px-5 py-4"
      role="status"
      aria-live="polite"
      aria-label={`Analysis status: ${stage}`}
    >
      {isError ? (
        <div
          className="flex flex-col gap-2 px-3 py-3 rounded"
          style={{
            background: "var(--risk-critical-bg)",
            border: "1px solid var(--risk-critical)",
          }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--risk-critical)" }}
          >
            Analysis failed
          </span>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {errorMessage ?? "An unexpected error occurred."}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {STAGES.map((s, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;

            return (
              <div key={s.key} className="flex items-center gap-2">
                {/* Stage indicator dot */}
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: isCurrent
                      ? "var(--risk-high)"
                      : isPast
                        ? "var(--text-muted)"
                        : "var(--border-muted)",
                  }}
                  aria-hidden="true"
                />
                <span
                  className={`text-sm ${isCurrent ? "font-semibold" : ""}`}
                  style={{
                    color: isCurrent
                      ? "var(--text-primary)"
                      : isPast
                        ? "var(--text-muted)"
                        : isFuture
                          ? "var(--border-muted)"
                          : "var(--text-muted)",
                  }}
                >
                  {s.label}
                </span>
                {isPast && (
                  <span
                    className="text-xs ml-auto"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
