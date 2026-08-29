// ---------------------------------------------------------------------------
// lib/analysis/prompt.ts
// Builds the single structured Bob analysis prompt.
//
// REQ-004: prompt must NOT include ground-truth answers, canonical expected
// conclusions, or contents of GROUND_TRUTH.md / LEGACY_FIXTURE_SPEC.md /
// ANALYSIS_SCOPE.md / PROPOSED_CHANGE.md.
//
// SEC-607: prompt never includes env var values or credentials.
//
// The prompt requests ONE JSON object matching AnalysisBundleWireSchema.
// ---------------------------------------------------------------------------

import type { AllowedSourcesMap } from "@/lib/analysis/allowlist";

/**
 * Builds the system prompt used for the Bob analysis.
 * Static — does not vary per request.
 */
export function buildSystemPrompt(): string {
  return `You are a senior software engineer performing a rigorous behavioral code analysis of a legacy Java billing system.

Your task is to analyze the provided source code and a proposed change patch, then produce a complete structured analysis.

## What you must analyze independently

From the source code and tests alone, determine:
1. What code was changed by the patch?
2. What business behavior does the changed code implement?
3. What behavioral rules exist around the changed code?
4. Which rule(s) are affected by the proposed change?
5. What downstream code depends on the affected value?
6. What tests currently exist that exercise this behavior?
7. Is the affected behavior currently protected by tests?
8. What is the business impact if this change is merged?
9. What source evidence supports each important conclusion?
10. What characterization/guardrail test would preserve the current behavior?

## Critical constraints

The following documents are NOT available to you and must NOT be referenced:
- GROUND_TRUTH.md
- LEGACY_FIXTURE_SPEC.md
- ANALYSIS_SCOPE.md
- PROPOSED_CHANGE.md

You must derive all conclusions from the Java source files and the patch content only.
Do NOT assume or state what the "correct" answer is supposed to be.
Do NOT mention that you know what the expected finding is.

## Output format

You MUST return ONLY a single JSON object — no explanation, no markdown, no prose before or after.

The JSON object MUST match this exact structure:

{
  "behavioral_contract": {
    "analysis_id": "<string — unique run ID>",
    "generated_at": "<ISO 8601 datetime>",
    "source_fixture": "demo/legacy-billing",
    "rules": [
      {
        "id": "<string e.g. BR-01>",
        "title": "<short rule title>",
        "description": "<full description of the behavior>",
        "business_context": "<why this matters to the business>",
        "invariant": "<the invariant this rule enforces>",
        "evidence": [
          {
            "file": "<relative path>",
            "symbol": "<optional class.method>",
            "line": <line number or [start, end]>,
            "excerpt": "<relevant code snippet>",
            "kind": "source" | "test" | "dependency" | "change"
          }
        ],
        "confidence": <0.0-1.0>,
        "test_coverage": "covered" | "partial" | "uncovered" | "unknown",
        "related_symbols": ["<class.method>"],
        "downstream_dependencies": ["<class.method>"],
        "risk_if_changed": "<what breaks if this rule is violated>"
      }
    ]
  },
  "review": {
    "analysis_id": "<same ID as above>",
    "overall_risk": "critical" | "high" | "medium" | "low" | "info",
    "risk_score": <0-100>,
    "findings": [
      {
        "id": "<string e.g. F-001>",
        "severity": "critical" | "high" | "medium" | "low" | "info",
        "title": "<finding title>",
        "summary": "<what was found>",
        "behavior_rule_ids": ["<BR-xx>"],
        "changed_file": "<relative path to changed file>",
        "changed_lines": [<start>, <end>],
        "business_impact": "<impact on business/customers>",
        "evidence": [<same evidence structure as above>],
        "confidence": <0.0-1.0>,
        "test_coverage": "covered" | "partial" | "uncovered" | "unknown",
        "recommended_action": "<what the reviewer should do>"
      }
    ],
    "affected_behavior_rule_ids": ["<BR-xx>"]
  },
  "metadata": {
    "analysis_id": "<same ID>",
    "repository": "demo/legacy-billing",
    "base_revision": "main",
    "target_revision": "proposed-change",
    "started_at": "<ISO 8601>",
    "completed_at": "<ISO 8601>",
    "duration_ms": <integer>,
    "status": "complete",
    "current_stage": "complete",
    "files_inspected": <integer>,
    "functions_traced": <integer>,
    "behavior_rules_discovered": <integer>,
    "affected_behavior_rules": <integer>,
    "untested_affected_rules": <integer>,
    "high_risk_findings": <integer>,
    "generated_tests": <integer>
  },
  "intent": {
    "analysis_id": "<same ID>",
    "target_symbol": "<primary changed symbol e.g. MoneyUtils.roundLateFee>",
    "target_file": "<relative path>",
    "business_role": "<one sentence — what this function does for the business>",
    "summary": "<fuller explanation of intent>",
    "invariants": ["<invariant 1>", "<invariant 2>"],
    "related_behavior_rule_ids": ["<BR-xx>"],
    "dependencies": ["<symbol>"],
    "evidence": [<evidence objects>],
    "confidence": <0.0-1.0>
  },
  "guardrail_test": {
    "id": "<GT-xxx>",
    "behavior_rule_id": "<BR-xx>",
    "analysis_id": "<same ID>",
    "filename": "<TestClassName.java>",
    "framework": "JUnit 5",
    "language": "Java",
    "code": "<complete Java test file as a string>",
    "rationale": "<why this test was written>",
    "status": "generated",
    "protected_behavior": "<what behavior the test preserves>",
    "boundary_scenario": {
      "balance": "<string decimal>",
      "rate": "<string decimal>",
      "raw_fee": "<string decimal>",
      "current_result": "<string decimal>",
      "proposed_result": "<string decimal>"
    },
    "detection_note": "<how the test would catch the proposed regression>"
  }
}

If you cannot produce a valid guardrail_test (e.g. insufficient evidence), set "guardrail_test" to null.

Return ONLY the JSON object. No markdown fences. No explanation.`;
}

/**
 * Builds the user message containing the source files for analysis.
 *
 * SEC-607: includes only allowed source content — no env vars, no credentials,
 * no paths beyond the allowlisted analysis inputs.
 */
export function buildUserMessage(sources: AllowedSourcesMap): string {
  const parts: string[] = [
    "Analyze the following Java legacy billing system source code and the proposed change patch.\n",
    "Generate a complete analysis JSON object as specified in the system prompt.\n",
    "---\n",
  ];

  // Separate the patch from source files for clarity
  const patchPath = "demo/legacy-billing/proposed-change.patch";
  const pomPath = "demo/legacy-billing/pom.xml";

  // Add source files first
  for (const [filePath, content] of Object.entries(sources)) {
    if (filePath === patchPath || filePath === pomPath) continue;
    parts.push(`## FILE: ${filePath}\n\`\`\`java\n${content}\n\`\`\`\n`);
  }

  // Add pom.xml
  if (pomPath in sources) {
    parts.push(`## FILE: ${pomPath}\n\`\`\`xml\n${sources[pomPath]}\n\`\`\`\n`);
  }

  // Add the patch last — it's the change being reviewed
  if (patchPath in sources) {
    parts.push(`## PROPOSED CHANGE PATCH: ${patchPath}\n\`\`\`diff\n${sources[patchPath]}\n\`\`\`\n`);
  }

  parts.push("---\nNow produce the analysis JSON object. Return ONLY valid JSON, no prose.");

  return parts.join("\n");
}
