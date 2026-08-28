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
#   0  — all available checks passed (verification_status = passed)
#   1  — one or more checks failed   (verification_status = failed)
#   2  — insufficient tooling for confidence (verification_status = incomplete)
# =============================================================================

set -uo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[verify] $*" >&2; }
warn() { echo "[verify] WARN: $*" >&2; }
die()  { echo "[verify] ERROR: $*" >&2; exit 2; }

# ---------------------------------------------------------------------------
# Resolve and cd to git repository root
# ---------------------------------------------------------------------------
if ! GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  # Not inside a git repo — fall back to requiring package.json in cwd
  GIT_ROOT="$(pwd)"
fi
cd "${GIT_ROOT}" || die "Cannot cd to repository root: ${GIT_ROOT}"

if [[ ! -f "package.json" ]]; then
  die "package.json not found in repository root (${GIT_ROOT})."
fi

# ---------------------------------------------------------------------------
# Constants (after cd so relative paths are correct)
# ---------------------------------------------------------------------------
readonly MAX_ITERATIONS=10
readonly REPORT_DIR=".agent/reports"
readonly HISTORY_DIR=".agent/reports/history"
readonly STATE_FILE=".agent/state/workflow.json"
readonly LATEST_JSON="${REPORT_DIR}/latest.json"
readonly LATEST_MD="${REPORT_DIR}/latest.md"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
readonly TIMESTAMP
ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
readonly ISO_TIMESTAMP
# Max bytes of output to store per check (sanitized)
readonly OUTPUT_LIMIT=2000

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
    echo "npm"
  fi
}

PM=$(detect_package_manager)
log "Package manager detected: ${PM}"

if ! command -v "${PM}" &>/dev/null; then
  die "Package manager '${PM}' not found in PATH. Cannot run checks."
fi

# ---------------------------------------------------------------------------
# Discover available scripts from package.json
# ---------------------------------------------------------------------------
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

# Returns the command value of a script (for display only, never eval'd)
get_script_cmd() {
  local script_name="$1"
  node --input-type=module <<EOF 2>/dev/null || echo "${PM} run ${script_name}"
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
process.stdout.write((pkg.scripts || {})['${script_name}'] || '${PM} run ${script_name}');
EOF
}

# ---------------------------------------------------------------------------
# Detect TypeScript compiler (fallback if no typecheck script)
# ---------------------------------------------------------------------------
has_tsc() {
  [[ -f "node_modules/.bin/tsc" ]] && [[ -f "tsconfig.json" ]]
}

# ---------------------------------------------------------------------------
# Check runner
# ---------------------------------------------------------------------------
# Tracks results as parallel arrays (bash 3 compatible)
CHECK_NAMES=()
CHECK_COMMANDS=()
CHECK_STATUSES=()
CHECK_EXIT_CODES=()
CHECK_OUTPUTS=()

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

run_check() {
  local name="$1"
  shift
  local cmd=("$@")
  local display_cmd="${cmd[*]}"

  log "Running: ${name} — ${display_cmd}"

  local output exit_code
  # Never eval; always execute the literal array
  output=$("${cmd[@]}" 2>&1) && exit_code=0 || exit_code=$?

  # Sanitize: strip ANSI escape codes, truncate
  local safe_output
  safe_output=$(printf '%s' "${output}" | sed 's/\x1b\[[0-9;]*m//g; s/\x1b\[[0-9;]*[A-Za-z]//g')
  safe_output="${safe_output:0:${OUTPUT_LIMIT}}"

  local status
  if [[ ${exit_code} -eq 0 ]]; then
    status="PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
    log "PASS: ${name}"
  else
    status="FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    log "FAIL: ${name} (exit ${exit_code})"
  fi

  CHECK_NAMES+=("${name}")
  CHECK_COMMANDS+=("${display_cmd}")
  CHECK_STATUSES+=("${status}")
  CHECK_EXIT_CODES+=("${exit_code}")
  CHECK_OUTPUTS+=("${safe_output}")
}

skip_check() {
  local name="$1"
  local reason="$2"
  log "SKIP: ${name} — ${reason}"
  CHECK_NAMES+=("${name}")
  CHECK_COMMANDS+=("")
  CHECK_STATUSES+=("SKIPPED")
  CHECK_EXIT_CODES+=("null")
  CHECK_OUTPUTS+=("Skipped: ${reason}")
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

# ---------------------------------------------------------------------------
# Run available non-mutating checks
# Priority order: format:check, lint, typecheck/check-types,
#                 test:run, test, test:unit, test:integration, build
# Dedup: once a logical slot is filled, skip equivalent alternatives.
# ---------------------------------------------------------------------------

# 1. Format check (read-only variant only — never run bare "format")
if has_script "format:check"; then
  run_check "format:check" "${PM}" run format:check
else
  skip_check "format:check" "no 'format:check' script in package.json"
fi

# 2. Lint
if has_script "lint"; then
  run_check "lint" "${PM}" run lint
else
  skip_check "lint" "no 'lint' script in package.json"
fi

# 3. Type-check (first match wins; avoid running two equivalent checks)
TYPE_CHECK_RAN=false
if has_script "typecheck"; then
  run_check "typecheck" "${PM}" run typecheck
  TYPE_CHECK_RAN=true
elif has_script "type-check"; then
  run_check "typecheck" "${PM}" run type-check
  TYPE_CHECK_RAN=true
elif has_script "check-types"; then
  run_check "typecheck" "${PM}" run check-types
  TYPE_CHECK_RAN=true
fi

if [[ "${TYPE_CHECK_RAN}" == "false" ]]; then
  if has_tsc; then
    run_check "typecheck" node_modules/.bin/tsc --noEmit
    TYPE_CHECK_RAN=true
  else
    skip_check "typecheck" "no typecheck script and tsc not available"
  fi
fi

# 4. Tests (first available match wins to avoid duplicate runs)
TEST_RAN=false
if has_script "test:run"; then
  run_check "test" "${PM}" run test:run
  TEST_RAN=true
elif has_script "test:ci"; then
  run_check "test" "${PM}" run test:ci
  TEST_RAN=true
elif has_script "test"; then
  run_check "test" "${PM}" run test
  TEST_RAN=true
fi

if [[ "${TEST_RAN}" == "false" ]]; then
  skip_check "test" "no test script found in package.json"
fi

# 5. Unit tests (only if no general test ran, or if explicitly separate)
# Run test:unit only when it's distinct from what we already ran
if [[ "${TEST_RAN}" == "true" ]]; then
  # Already ran a test suite — only add test:unit if it exists AND no test:run/test:ci ran
  # (test:unit is likely a subset of test, so skip to avoid duplication)
  if has_script "test:unit" && ! has_script "test:run" && ! has_script "test:ci" && ! has_script "test"; then
    run_check "test:unit" "${PM}" run test:unit
  fi
else
  if has_script "test:unit"; then
    run_check "test:unit" "${PM}" run test:unit
    TEST_RAN=true
  fi
fi

# 6. Integration tests (always run separately if present, distinct from unit)
if has_script "test:integration"; then
  run_check "test:integration" "${PM}" run test:integration
elif [[ "${TEST_RAN}" == "false" ]]; then
  skip_check "test:integration" "no integration test script in package.json"
fi

# 7. Build
if has_script "build"; then
  run_check "build" "${PM}" run build
else
  skip_check "build" "no 'build' script in package.json"
fi

# ---------------------------------------------------------------------------
# Determine overall verification status
# ---------------------------------------------------------------------------
# Rules:
#   passed     — every non-skipped check passed (at least one ran)
#   failed     — at least one check failed
#   incomplete — only skipped checks (no tooling to establish confidence)

determine_verification_status() {
  if [[ ${FAIL_COUNT} -gt 0 ]]; then
    echo "failed"
  elif [[ ${PASS_COUNT} -eq 0 ]]; then
    echo "incomplete"
  else
    echo "passed"
  fi
}

VERIFICATION_STATUS=$(determine_verification_status)
log "Verification status: ${VERIFICATION_STATUS}"

# ---------------------------------------------------------------------------
# JSON escape helper (no external deps)
# ---------------------------------------------------------------------------
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"       # backslash
  s="${s//\"/\\\"}"       # double-quote
  s="${s//$'\n'/\\n}"     # newline
  s="${s//$'\r'/\\r}"     # carriage return
  s="${s//$'\t'/\\t}"     # tab
  printf '%s' "${s}"
}

# ---------------------------------------------------------------------------
# Build JSON checks array
# ---------------------------------------------------------------------------
checks_json="["
for i in "${!CHECK_NAMES[@]}"; do
  [[ ${i} -gt 0 ]] && checks_json+=","
  name=$(json_escape "${CHECK_NAMES[$i]}")
  cmd_str=$(json_escape "${CHECK_COMMANDS[$i]}")
  status="${CHECK_STATUSES[$i]}"
  exit_code="${CHECK_EXIT_CODES[$i]}"
  out=$(json_escape "${CHECK_OUTPUTS[$i]}")

  checks_json+=$(cat <<ENDJSON
{
      "name": "${name}",
      "command": "${cmd_str}",
      "status": "${status}",
      "exit_code": ${exit_code},
      "output_summary": "${out}"
    }
ENDJSON
)
done
checks_json+="]"

# ---------------------------------------------------------------------------
# Git context (best-effort)
# ---------------------------------------------------------------------------
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | head -50 || echo "")

changed_json="["
first=true
while IFS= read -r f; do
  [[ -z "${f}" ]] && continue
  ${first} || changed_json+=","
  first=false
  changed_json+="\"$(json_escape "${f}")\""
done <<< "${CHANGED_FILES}"
changed_json+="]"

# ---------------------------------------------------------------------------
# Feature ID from active approval token (best-effort)
# ---------------------------------------------------------------------------
FEATURE_ID="null"
for token in .agent/state/approval-*.json; do
  [[ -f "${token}" ]] || continue
  fid=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('${token}','utf8'));if(d.status==='approved')console.log(d.feature_id);}catch(e){}" 2>/dev/null || echo "")
  if [[ -n "${fid}" ]]; then
    FEATURE_ID="\"${fid}\""
    break
  fi
done

# ---------------------------------------------------------------------------
# Iteration counter
# ---------------------------------------------------------------------------
PREV_ITERATION=0
if [[ -f "${LATEST_JSON}" ]]; then
  PREV_ITERATION=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('${LATEST_JSON}','utf8'));console.log(d.iteration||0);}catch(e){console.log(0);}" 2>/dev/null || echo "0")
fi
ITERATION=$((PREV_ITERATION + 1))

# ---------------------------------------------------------------------------
# Write reports
# ---------------------------------------------------------------------------
mkdir -p "${REPORT_DIR}" "${HISTORY_DIR}"

# latest.json
cat > "${LATEST_JSON}" <<ENDJSON
{
  "workflow_id": "verification",
  "feature_id": ${FEATURE_ID},
  "iteration": ${ITERATION},
  "timestamp": "${ISO_TIMESTAMP}",
  "verification_status": "${VERIFICATION_STATUS}",
  "overall_status": "${VERIFICATION_STATUS}",
  "summary": {
    "passed": ${PASS_COUNT},
    "failed": ${FAIL_COUNT},
    "skipped": ${SKIP_COUNT}
  },
  "checks": ${checks_json},
  "findings": [],
  "metadata": {
    "git_branch": "${GIT_BRANCH}",
    "git_commit": "${GIT_COMMIT}",
    "package_manager": "${PM}",
    "changed_files": ${changed_json},
    "contract_path": null,
    "previous_report": null
  }
}
ENDJSON

# latest.md
{
  echo "# Verification Report"
  echo ""
  echo "| Field | Value |"
  echo "|---|---|"
  echo "| Timestamp | ${ISO_TIMESTAMP} |"
  echo "| Branch | \`${GIT_BRANCH}\` |"
  echo "| Commit | \`${GIT_COMMIT}\` |"
  echo "| Iteration | ${ITERATION} |"
  echo "| Package Manager | ${PM} |"
  echo "| **Status** | **${VERIFICATION_STATUS^^}** |"
  echo ""
  echo "## Checks"
  echo ""
  echo "| Check | Command | Status | Exit Code |"
  echo "|---|---|---|---|"
  for i in "${!CHECK_NAMES[@]}"; do
    echo "| ${CHECK_NAMES[$i]} | \`${CHECK_COMMANDS[$i]}\` | ${CHECK_STATUSES[$i]} | ${CHECK_EXIT_CODES[$i]} |"
  done
  echo ""
  echo "**Summary:** ${PASS_COUNT} passed · ${FAIL_COUNT} failed · ${SKIP_COUNT} skipped"
  echo ""

  # Failure details
  if [[ ${FAIL_COUNT} -gt 0 ]]; then
    echo "## Failures"
    echo ""
    for i in "${!CHECK_NAMES[@]}"; do
      if [[ "${CHECK_STATUSES[$i]}" == "FAIL" ]]; then
        echo "### ${CHECK_NAMES[$i]}"
        echo ""
        echo '```'
        echo "${CHECK_OUTPUTS[$i]}"
        echo '```'
        echo ""
      fi
    done
  fi

  # Incomplete notice
  if [[ "${VERIFICATION_STATUS}" == "incomplete" ]]; then
    echo "## ⚠ Incomplete"
    echo ""
    echo "No verification tooling was found. Add lint, typecheck, or test scripts"
    echo "to \`package.json\` to establish confidence."
    echo ""
  fi

  echo "---"
  echo "_Generated by \`scripts/verification/verify.sh\`_"
} > "${LATEST_MD}"

# Archive
cp "${LATEST_JSON}" "${HISTORY_DIR}/${TIMESTAMP}-verification.json"
cp "${LATEST_MD}"   "${HISTORY_DIR}/${TIMESTAMP}-verification.md"

log "Reports written:"
log "  ${LATEST_JSON}"
log "  ${LATEST_MD}"
log "  ${HISTORY_DIR}/${TIMESTAMP}-verification.*"

# ---------------------------------------------------------------------------
# Update .agent/state/workflow.json
# ---------------------------------------------------------------------------
if [[ -f "${STATE_FILE}" ]]; then
  node --input-type=module <<EOF 2>/dev/null && log "Updated ${STATE_FILE}" || warn "Could not update ${STATE_FILE}"
import { readFileSync, writeFileSync } from 'fs';
const path = '${STATE_FILE}';
let state;
try {
  state = JSON.parse(readFileSync(path, 'utf8'));
} catch (e) {
  process.exit(1);
}
state.verification_status = '${VERIFICATION_STATUS}';
state.last_updated = '${ISO_TIMESTAMP}';
writeFileSync(path, JSON.stringify(state, null, 2) + '\n');
EOF
else
  warn "${STATE_FILE} not found — skipping workflow state update"
fi

# ---------------------------------------------------------------------------
# Exit
# ---------------------------------------------------------------------------
case "${VERIFICATION_STATUS}" in
  passed)
    log "All checks passed."
    exit 0
    ;;
  failed)
    log "One or more checks failed. See ${LATEST_MD} for details."
    exit 1
    ;;
  incomplete)
    log "Insufficient verification tooling to establish confidence."
    exit 2
    ;;
esac
