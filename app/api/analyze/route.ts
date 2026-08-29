// ---------------------------------------------------------------------------
// app/api/analyze/route.ts — Next.js Route Handler
// POST /api/analyze — orchestrates the Bob analysis pipeline.
//
// REQ-001: reads only allowlisted sources, calls Bob once, returns bundle.
// REQ-005: all credentials from process.env only — never exposed to client.
// REQ-011: returns X-Analysis-Mode: live header on success.
// SEC-601/602: BOB_API_KEY never in response body or logs.
// SEC-604: readAllowedSources() uses only hard-coded ALLOWED_PATHS.
// SEC-605: raw Bob response validated through AnalysisBundleWireSchema.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { readAllowedSources } from "@/lib/analysis/allowlist";
import { callBobAnalysis, BobApiError, isBobConfigured } from "@/lib/analysis/bob-client";
import { AnalysisBundleWireSchema } from "@/lib/analysis/bundle";

export async function POST(): Promise<NextResponse> {
  // REQ-005: check configuration before doing any work
  if (!isBobConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "Analysis not configured — check environment variables." },
      { status: 503 }
    );
  }

  // Step 1: Read only the allowlisted source files
  let sources;
  try {
    sources = await readAllowedSources();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error reading source files";
    return NextResponse.json(
      { error: "source_read_failed", message },
      { status: 500 }
    );
  }

  // Step 2: Call Bob — single LLM request, no timeout imposed (local demo)
  let rawBobOutput: unknown;
  try {
    rawBobOutput = await callBobAnalysis(sources);
  } catch (err) {
    if (err instanceof BobApiError) {
      const status = err.statusCode >= 500 ? 502 : err.statusCode;
      return NextResponse.json(
        { error: "bob_api_error", message: err.message },
        { status }
      );
    }
    return NextResponse.json(
      { error: "bob_api_error", message: "Bob analysis request failed" },
      { status: 502 }
    );
  }

  // Step 3: Validate through the aggregate wire schema
  // SEC-605: no field is accessed before safeParse() succeeds
  const parseResult = AnalysisBundleWireSchema.safeParse(rawBobOutput);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        details: parseResult.error.message,
      },
      { status: 422 }
    );
  }

  // Step 4: Return the validated bundle with the live mode header
  return NextResponse.json(
    { bundle: parseResult.data },
    {
      status: 200,
      headers: {
        "X-Analysis-Mode": "live",
      },
    }
  );
}
