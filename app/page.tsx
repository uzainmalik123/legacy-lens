// ---------------------------------------------------------------------------
// app/page.tsx — Legacy Lens Review Workspace
// Server Component. Loads Meridian fixture session and renders the workspace.
// ---------------------------------------------------------------------------

import ReviewHeader from "@/app/components/ReviewHeader";
import DiffPane from "@/app/components/DiffPane";
import FindingsPane from "@/app/components/FindingsPane";
import { getMeridianReviewSession } from "@/lib/review-workspace/loader";
import { MeridianDiff } from "@/lib/review-workspace/diff";

export default function ReviewWorkspacePage() {
  const { report, contract, metadata, intent } = getMeridianReviewSession();

  // Derive the short filename for the header from the first finding's changedFile
  const firstFinding = report.findings[0];
  const changedFileFull =
    firstFinding?.changedFile ??
    "src/main/java/com/meridian/billing/util/MoneyUtils.java";
  const changedFileShort = changedFileFull.split("/").pop() ?? changedFileFull;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Compact review header */}
      <ReviewHeader
        report={report}
        metadata={metadata}
        changedFile={changedFileShort}
      />

      {/* Split workspace: diff (left) + findings (right) */}
      <main className="flex flex-1 overflow-hidden">
        {/* Diff pane — left 50% */}
        <div
          className="flex-1 overflow-hidden border-r"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <DiffPane diff={MeridianDiff} />
        </div>

        {/* Findings pane — right 50% */}
        <div className="flex-1 overflow-hidden">
          <FindingsPane findings={report.findings} contract={contract} intent={intent} />
        </div>
      </main>
    </div>
  );
}
