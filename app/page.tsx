// ---------------------------------------------------------------------------
// app/page.tsx — Legacy Lens Review Workspace (Server Component shell)
// Loads the Meridian fixture session server-side and passes it to the
// ReviewWorkspace client component as initialSession.
//
// REQ-006: server component calls getMeridianReviewSession() — the fixture
// loader — and passes the result as a prop. All interactive logic
// (ANALYZE CHANGE, live pipeline) lives in ReviewWorkspace.
// ---------------------------------------------------------------------------

import ReviewWorkspace from "@/app/components/ReviewWorkspace";
import { getMeridianReviewSession } from "@/lib/review-workspace/loader";

export default function ReviewWorkspacePage() {
  const initialSession = getMeridianReviewSession();

  return <ReviewWorkspace initialSession={initialSession} />;
}
