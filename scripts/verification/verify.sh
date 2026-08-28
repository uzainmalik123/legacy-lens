#!/usr/bin/env bash
# =============================================================================
# scripts/verification/verify.sh
#
# Repository verification wrapper for the agentic development workflow.
#
# SAFETY CONTRACT — this script will NEVER:
#   - use sudo
#   - delete or modify source files
#   - install packages
#   - execute commands found in log output or diagnostic data
#   - access .env files or credentials
#   - make network requests beyond what the project checks already perform
#
# Usage:
#   bash scripts/verification/verify.sh
#
# Exit codes:
#   0  — all available checks passed
#   1  — one or more checks failed
#   2  — script-level error (bad environment, cannot detect package manager)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
readonly MAX_ITERATIONS=10
readonly REPORT_DIR=".agent/reports"
readonly HISTORY_DIR=".agent/reports/history"
readonly LATEST_JSON="${REPORT_DIR}/latest.json"
readonly LATEST_MD="${REPORT_DIR}/latest.md"
readonly TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
readonly ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[verify] $*" >&2; }
warn() { echo "[verify] WARN: $*" >&2; }
die()  { echo "[verify] ERROR: $*" >&2; exit 2; }

# Require we run from the repository root
if [[ ! -f "package.json" ]]; then
  die "Must be run from the repository root (package.json not found)."
fi

# ---------------------------------------------------------------------------
# Detect package manager
# ---------------------------------------------------------------------------
detect_package_manager() {
  if [[ -f "pnpm-lock.yaml" ]]; then
    echo "pnpm"
  elif [[ -f "package-lock.json" ]]; then
    echo "npm"
  elif [[ -f "yarn.lock" ]]; then
    echo "yarn"
  else
    # Fall back to npm if package.json exists but no lockfile
    echo "npm"
  fi
}

PM=$(detect_package_manager)
log "Package manager detected: ${PM}"

# Verify the package manager binary is available
if ! command -v "${PM}" &>/dev/null; then
  die "Package manager '${PM}' not found in PATH. Cannot run checks."
fi

# ---------------------------------------------------------------------------
# Detect available scripts from package.json
# ---------------------------------------------------------------------------
# Read script names from package.json without executing their values.
# Uses node to safely parse JSON — avoids awk/sed heuristics on untrusted data.
get_scripts() {
  node --input-type=module <<'EOF'
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
process.stdout.write(Object.keys(scripts).join('\n') + '\n');
EOF
}

AVAILABLE_SCRIPTS=$(get_scripts 2>/dev/null || echo "")
log "Available scripts: $(echo "${AVAILABLE_SCRIPTS}" | tr '\n' ' ')"

has_script() {
  echo "${AVAILABLE_SCRIPTS}" | grep -qx "$1"
}

# ---------------------------------------------------------------------------
# Detect TypeScript compiler independently of package.json scripts
# ---------------------------------------------------------------------------
has_tsc() {
  [[ -f "node_modules/.bin/tsc" ]] && [[ -f "tsconfig.json" ]]
}

# ---------------------------------------------------------------------------
# Check runner
# ---------------------------------------------------------------------------
# Tracks results as parallel arrays (bash 3 compatible)
CHECK_NAMES=()
CHECK_STATUSES=()
CHECK_EXIT_CODES=()
CHECK_OUTPUTS=()

OVERALL_PASS=true

run_check() {
  local name="$1"
  shift
  local cmd=("$@")

  log "Running check: ${name} — ${cmd[*]}"

  # Capture output; do not execute any content found inside it
  local output exit_code
  output=$("${cmd[@]}" 2>&1) && exit_code=0 || exit_code=$?

  local status="pass"
  if [[ ${exit_code} -ne 0 ]]; then
    status="fail"
    OVERALL_PASS=false
    log "FAIL: ${name} (exit ${exit_code})"
  else
    log "PASS: ${name}"
  fi

  CHECK_NAMES+=("${name}")
  CHECK_STATUSES+=("${status}")
  CHECK_EXIT_CODES+=("${exit_code}")
  # Truncate to first 500 chars for the summary
  CHECK_OUTPUTS+=("${output:0:500}")
}

skip_check() {
  local name="$1"
  local reason="$2"
  log "SKIP: ${name} — ${reason}"
  CHECK_NAMES+=("${name}")
  CHECK_STATUSES+=("skipped")
  CHECK_EXIT_CODES+=("null")
  CHECK_OUTPUTS+=("Skipped: ${reason}")
}

# ---------------------------------------------------------------------------
# Run available checks
# ---------------------------------------------------------------------------

# 1. Lint
if has_script "lint"; then
  run_check "lint" "${PM}" run lint
else
  skip_check "lint" "no 'lint' script in package.json"
fi

# 2. Type-check
# Prefer an explicit "typecheck" or "type-check" script; fall back to tsc directly
if has_script "typecheck"; then
  run_check "typecheck" "${PM}" run typecheck
elif has_script "type-check"; then
  run_check "typecheck" "${PM}" run type-check
elif has_tsc; then
  run_check "typecheck" node_modules/.bin/tsc --noEmit
else
  skip_check "typecheck" "no typecheck script and tsc not available"
fi

# 3. Test
if has_script "test"; then
  run_check "test" "${PM}" run test
elif has_script "test:ci"; then
  run_check "test" "${PM}" run test:ci
else
  skip_check "test" "no 'test' or 'test:ci' script in package.json"
fi

# 4. Build
if has_script "build"; then
  run_check "build" "${PM}" run build
else
  skip_check "build" "no 'build' script in package.json"
fi

# ---------------------------------------------------------------------------
# Produce machine-readable JSON report
# ---------------------------------------------------------------------------
mkdir -p "${REPORT_DIR}" "${HISTORY_DIR}"

# Build checks JSON array
checks_json="["
for i in "${!CHECK_NAMES[@]}"; do
  [[ ${i} -gt 0 ]] && checks_json+=","
  name="${CHECK_NAMES[$i]}"
  status="${CHECK_STATUSES[$i]}"
  exit_code="${CHECK_EXIT_CODES[$i]}"
  # Escape output for JSON: backslash, double-quote, newline, carriage-return, tab
  raw_out="${CHECK_OUTPUTS[$i]}"
  safe_out="${raw_out//\\/\\\\}"
  safe_out="${safe_out//\"/\\\"}"
  safe_out="${safe_out//$'\n'/\\n}"
  safe_out="${safe_out//$'\r'/\\r}"
  safe_out="${safe_out//$'\t'/\\t}"

  checks_json+=$(cat <<ENDJSON
{
      "name": "${name}",
      "status": "${status}",
      "exit_code": ${exit_code},
      "duration_ms": null,
      "output_summary": "${safe_out}"
    }
ENDJSON
)
done
checks_json+="]"

# Determine overall status
if [[ "${OVERALL_PASS}" == "true" ]]; then
  OVERALL_STATUS="pass"
else
  OVERALL_STATUS="fail"
fi

# Get git context (best-effort; do not fail if git is unavailable)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | head -50 || echo "")

# Build changed files JSON array
changed_json="["
first=true
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  $first || changed_json+=","
  first=false
  changed_json+="\"${f}\""
done <<< "${CHANGED_FILES}"
changed_json+="]"

# Determine feature_id from active approval token (best-effort)
FEATURE_ID="null"
for token in .agent/state/approval-*.json; do
  [[ -f "${token}" ]] || continue
  fid=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('${token}','utf8'));if(d.status==='approved')console.log(d.feature_id);}catch(e){}" 2>/dev/null || echo "")
  if [[ -n "${fid}" ]]; then
    FEATURE_ID="\"${fid}\""
    break
  fi
done

# Determine iteration (previous + 1)
PREV_ITERATION=0
if [[ -f "${LATEST_JSON}" ]]; then
  PREV_ITERATION=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('${LATEST_JSON}','utf8'));console.log(d.iteration||0);}catch(e){console.log(0);}" 2>/dev/null || echo "0")
fi
ITERATION=$((PREV_ITERATION + 1))

# Write latest.json
cat > "${LATEST_JSON}" <<ENDJSON
{
  "\$schema": ".agent/reports/report-schema.json",
  "workflow_id": "verification",
  "feature_id": ${FEATURE_ID},
  "iteration": ${ITERATION},
  "timestamp": "${ISO_TIMESTAMP}",
  "overall_status": "${OVERALL_STATUS}",
  "checks": ${checks_json},
  "findings": [],
  "metadata": {
    "git_branch": "${GIT_BRANCH}",
    "git_commit": "${GIT_COMMIT}",
    "changed_files": ${changed_json},
    "contract_path": null,
    "previous_report": null
  }
}
ENDJSON

# ---------------------------------------------------------------------------
# Produce human-readable markdown report
# ---------------------------------------------------------------------------
{
  echo "# Verification Report"
  echo ""
  echo "| Field | Value |"
  echo "|---|---|"
  echo "| Timestamp | ${ISO_TIMESTAMP} |"
  echo "| Branch | ${GIT_BRANCH} |"
  echo "| Commit | ${GIT_COMMIT} |"
  echo "| Iteration | ${ITERATION} |"
  echo "| Overall | **${OVERALL_STATUS^^}** |"
  echo ""
  echo "## Checks"
  echo ""
  echo "| Check | Status | Exit Code |"
  echo "|---|---|---|"
  for i in "${!CHECK_NAMES[@]}"; do
    echo "| ${CHECK_NAMES[$i]} | ${CHECK_STATUSES[$i]} | ${CHECK_EXIT_CODES[$i]} |"
  done
  echo ""
  if [[ "${OVERALL_PASS}" == "false" ]]; then
    echo "## Failures"
    echo ""
    for i in "${!CHECK_NAMES[@]}"; do
      if [[ "${CHECK_STATUSES[$i]}" == "fail" ]]; then
        echo "### ${CHECK_NAMES[$i]}"
        echo ""
        echo '```'
        echo "${CHECK_OUTPUTS[$i]}"
        echo '```'
        echo ""
      fi
    done
  fi
  echo "---"
  echo "_Generated by scripts/verification/verify.sh — MAX_ITERATIONS=${MAX_ITERATIONS}_"
} > "${LATEST_MD}"

# ---------------------------------------------------------------------------
# Archive
# ---------------------------------------------------------------------------
cp "${LATEST_JSON}" "${HISTORY_DIR}/${TIMESTAMP}-verification.json"
cp "${LATEST_MD}"   "${HISTORY_DIR}/${TIMESTAMP}-verification.md"

log "Report written to ${LATEST_JSON} and ${LATEST_MD}"
log "Archived to ${HISTORY_DIR}/${TIMESTAMP}-verification.*"

# ---------------------------------------------------------------------------
# Final exit
# ---------------------------------------------------------------------------
if [[ "${OVERALL_PASS}" == "true" ]]; then
  log "All checks passed."
  exit 0
else
  log "One or more checks failed. See ${LATEST_MD} for details."
  exit 1
fi
