# ANALYSIS_SCOPE.md
# Meridian Loan Servicing — Analysis Boundary for Legacy Lens

**Status:** Authoritative boundary definition for Legacy Lens analysis pipeline.  
**Version:** 1.0  
**Purpose:** Defines exactly what the Legacy Lens analysis pipeline is permitted to read.

---

## Allowed Analysis Inputs

The Legacy Lens analysis pipeline MAY read the following paths and only these paths:

```
demo/legacy-billing/src/main/java/**
demo/legacy-billing/src/test/java/**
demo/legacy-billing/pom.xml
demo/legacy-billing/proposed-change.patch
```

Specifically:

| Path                                                        | Permitted |
|-------------------------------------------------------------|-----------|
| `demo/legacy-billing/src/main/java/com/meridian/billing/**` | ✅ YES    |
| `demo/legacy-billing/src/test/java/com/meridian/billing/**` | ✅ YES    |
| `demo/legacy-billing/pom.xml`                               | ✅ YES    |
| `demo/legacy-billing/proposed-change.patch`                 | ✅ YES    |

---

## Forbidden Analysis Inputs

The Legacy Lens analysis pipeline MUST NOT read the following paths under any
circumstances:

| Path                                         | Reason                                                  |
|----------------------------------------------|---------------------------------------------------------|
| `demo/legacy-billing/LEGACY_FIXTURE_SPEC.md` | Contains design rationale and pre-answered behavior descriptions |
| `demo/legacy-billing/GROUND_TRUTH.md`        | The private answer sheet; reading it invalidates evaluation |
| `demo/legacy-billing/ANALYSIS_SCOPE.md`      | This file itself; meta-document not part of source      |
| `demo/legacy-billing/PROPOSED_CHANGE.md`     | Human-readable summary of the patch; not source code    |
| `demo/legacy-billing/target/**`              | Compiled class files and build artifacts                |
| Any previously generated Legacy Lens reports | Analysis output is not analysis input                   |
| Any conversation history containing ground-truth answers | Contamination of evaluation baseline  |

---

## Allowlist Enforcement Rule

> **Legacy Lens analysis MUST use an ALLOWLIST approach.**

**DO NOT** scan `demo/legacy-billing/**` broadly and then filter out forbidden files
afterward. That approach is insufficient because:

1. Forbidden documents (particularly `GROUND_TRUTH.md` and `LEGACY_FIXTURE_SPEC.md`)
   contain pre-answered descriptions of the exact behaviors Legacy Lens must discover.
2. Even incidental exposure to those files — e.g., reading a directory listing that
   includes their filenames and descriptions — can contaminate the analysis.
3. Post-hoc filtering cannot guarantee that an LLM-based agent did not incorporate
   information from forbidden files before filtering was applied.

**The analysis pipeline MUST:**

1. Construct its file context using only the explicit allowed paths listed above.
2. Never list or traverse `demo/legacy-billing/` at the root level and then select
   files from the result.
3. Enumerate only the allowed directories (`src/main/java`, `src/test/java`) and the
   two allowed individual files (`pom.xml`, `proposed-change.patch`).
4. Enforce this constraint at the tool/function-call level, not at the prompt level.

---

## Rationale

The six hidden business behaviors (BR-01 through BR-06) must be discovered by reading
**source code and tests alone** — the same way a developer would approach an unfamiliar
legacy codebase. The evaluation measures whether Legacy Lens can perform that reverse
engineering task correctly without hints.

`GROUND_TRUTH.md` contains the answers. `LEGACY_FIXTURE_SPEC.md` contains the design
rationale and behavioral descriptions. Both documents would trivially allow any agent
to produce a correct-looking analysis without performing any actual code analysis.

The value of the demo and the validity of any benchmark score depend entirely on
maintaining this separation.

---

## Future Enforcement

This rule must be enforced by the Legacy Lens analysis pipeline implementation.
Specifically:

- The tool or function that loads analysis context must accept only a verified allowlist
  of paths, not a directory glob.
- The system prompt for the analysis agent must state explicitly that
  `GROUND_TRUTH.md`, `LEGACY_FIXTURE_SPEC.md`, `ANALYSIS_SCOPE.md`, and
  `PROPOSED_CHANGE.md` are not available as inputs.
- Any evaluation harness must verify, before scoring, that none of the forbidden paths
  were opened during the analysis session.
