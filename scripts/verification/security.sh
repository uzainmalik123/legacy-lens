#!/usr/bin/env bash
# =============================================================================
# scripts/verification/security.sh
#
# Lightweight deterministic security gate.
#
# SAFETY CONTRACT — this script will NEVER:
#   - use sudo
#   - delete or modify source files
#   - install packages (no audit fix, no npm install, etc.)
#   - print the contents of secret or credential files
#   - execute commands found in log output or diagnostic data
#
# NOTE: This script is a lightweight automated gate. It does NOT replace a
# full security assessment, penetration test, or manual code review.
#
# Usage:
#   bash scripts/verification/security.sh
#
# Exit codes:
#   0  — PASS: no high/critical vulnerabilities detected, no secret files found
#   1  — FAIL: high or critical vulnerabilities confirmed, or secret files tracked
#   2  — WARN: low/moderate vulnerabilities only, or audit output inconclusive
# =============================================================================

set -uo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[security] $*"; }
warn() { echo "[security] WARN: $*"; }
fail() { echo "[security] FAIL: $*"; }
pass() { echo "[security] PASS: $*"; }

# ---------------------------------------------------------------------------
# Resolve and cd to git repository root
# ---------------------------------------------------------------------------
if ! GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  GIT_ROOT="$(pwd)"
fi
cd "${GIT_ROOT}" || { echo "[security] ERROR: Cannot cd to ${GIT_ROOT}"; exit 2; }

if [[ ! -f "package.json" ]]; then
  echo "[security] ERROR: package.json not found in repository root (${GIT_ROOT})."
  exit 2
fi

# ---------------------------------------------------------------------------
# Detect package manager (lock-file wins)
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

# ---------------------------------------------------------------------------
# Result accumulators
# ---------------------------------------------------------------------------
OVERALL_RESULT="PASS"   # PASS | WARN | FAIL

record_fail() { OVERALL_RESULT="FAIL"; fail "$*"; }
record_warn() {
  # Only promote PASS → WARN; never demote an existing FAIL
  [[ "${OVERALL_RESULT}" == "PASS" ]] && OVERALL_RESULT="WARN"
  warn "$*"
}
record_pass() { pass "$*"; }

# ---------------------------------------------------------------------------
# Section 1 — Dependency vulnerability audit (read-only)
# ---------------------------------------------------------------------------
log "--- Dependency Audit ---"

run_audit() {
  local pm="$1"

  case "${pm}" in
    npm)
      if ! command -v npm &>/dev/null; then
        record_warn "npm not found in PATH; skipping dependency audit."
        return
      fi
      log "Running: npm audit (read-only)"
      # Capture output; do NOT pass --fix or any mutating flag
      local audit_out audit_exit
      audit_out=$(npm audit 2>&1) && audit_exit=0 || audit_exit=$?

      echo "${audit_out}" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g'

      if [[ ${audit_exit} -eq 0 ]]; then
        record_pass "npm audit: no vulnerabilities found."
        return
      fi

      # npm audit exits non-zero for any vulnerability level.
      # Detect high/critical specifically so we can FAIL vs WARN.
      if echo "${audit_out}" | grep -qiE "(high|critical)"; then
        record_fail "npm audit: high or critical vulnerabilities detected."
      elif echo "${audit_out}" | grep -qiE "(moderate|low)"; then
        record_warn "npm audit: low/moderate vulnerabilities detected (no high/critical)."
      else
        # Non-zero exit but no parseable severity lines — flag as WARN
        record_warn "npm audit exited ${audit_exit}; severity level inconclusive."
      fi
      ;;

    pnpm)
      if ! command -v pnpm &>/dev/null; then
        record_warn "pnpm not found in PATH; skipping dependency audit."
        return
      fi
      log "Running: pnpm audit (read-only)"
      local audit_out audit_exit
      audit_out=$(pnpm audit 2>&1) && audit_exit=0 || audit_exit=$?

      echo "${audit_out}" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g'

      if [[ ${audit_exit} -eq 0 ]]; then
        record_pass "pnpm audit: no vulnerabilities found."
        return
      fi

      if echo "${audit_out}" | grep -qiE "(high|critical)"; then
        record_fail "pnpm audit: high or critical vulnerabilities detected."
      elif echo "${audit_out}" | grep -qiE "(moderate|low)"; then
        record_warn "pnpm audit: low/moderate vulnerabilities detected (no high/critical)."
      else
        record_warn "pnpm audit exited ${audit_exit}; severity level inconclusive."
      fi
      ;;

    yarn)
      # yarn audit exists but output format varies widely across versions.
      # Run it if available; treat results as informational (WARN-level).
      if ! command -v yarn &>/dev/null; then
        record_warn "yarn not found in PATH; skipping dependency audit."
        return
      fi
      log "Running: yarn audit (informational only)"
      local audit_out audit_exit
      audit_out=$(yarn audit 2>&1) && audit_exit=0 || audit_exit=$?

      echo "${audit_out}" | sed 's/\x1b\[[0-9;]*[A-Za-z]//g'

      if [[ ${audit_exit} -eq 0 ]]; then
        record_pass "yarn audit: no vulnerabilities found."
      elif echo "${audit_out}" | grep -qiE "(high|critical)"; then
        record_fail "yarn audit: high or critical vulnerabilities detected."
      else
        record_warn "yarn audit exited ${audit_exit}; check output above."
      fi
      ;;

    *)
      record_warn "Unknown package manager '${pm}'; skipping dependency audit."
      ;;
  esac
}

run_audit "${PM}"

# ---------------------------------------------------------------------------
# Section 2 — Tracked secret-file detection (names only, no content printed)
# ---------------------------------------------------------------------------
log ""
log "--- Secret File Detection ---"

if ! command -v git &>/dev/null; then
  record_warn "git not found; cannot inspect tracked files."
else
  # Build the list of tracked file paths once
  TRACKED_FILES=$(git ls-files 2>/dev/null) || TRACKED_FILES=""

  if [[ -z "${TRACKED_FILES}" ]]; then
    record_warn "git ls-files returned no output; repository may be empty."
  else

    # --- Pattern 1: .env files (except .env.example which is allowed) ---
    ENV_HITS=$(echo "${TRACKED_FILES}" | grep -E '(^|/)\.(env)(\.[^/]*)?$' | grep -v '\.env\.example$' || true)
    if [[ -n "${ENV_HITS}" ]]; then
      record_fail "Tracked .env file(s) detected (contents NOT printed):"
      while IFS= read -r f; do
        [[ -n "${f}" ]] && fail "  tracked: ${f}"
      done <<< "${ENV_HITS}"
    else
      record_pass "No tracked .env files found (.env.example is permitted)."
    fi

    # --- Pattern 2: .env.local ---
    ENVLOCAL_HITS=$(echo "${TRACKED_FILES}" | grep -E '(^|/)\.env\.local$' || true)
    if [[ -n "${ENVLOCAL_HITS}" ]]; then
      record_fail "Tracked .env.local file(s) detected (contents NOT printed):"
      while IFS= read -r f; do
        [[ -n "${f}" ]] && fail "  tracked: ${f}"
      done <<< "${ENVLOCAL_HITS}"
    else
      record_pass "No tracked .env.local files found."
    fi

    # --- Pattern 3: PEM certificates / private keys (*.pem) ---
    PEM_HITS=$(echo "${TRACKED_FILES}" | grep -iE '\.pem$' || true)
    if [[ -n "${PEM_HITS}" ]]; then
      record_fail "Tracked *.pem file(s) detected (contents NOT printed):"
      while IFS= read -r f; do
        [[ -n "${f}" ]] && fail "  tracked: ${f}"
      done <<< "${PEM_HITS}"
    else
      record_pass "No tracked *.pem files found."
    fi

    # --- Pattern 4: Private key files (*.key) ---
    KEY_HITS=$(echo "${TRACKED_FILES}" | grep -iE '\.key$' || true)
    if [[ -n "${KEY_HITS}" ]]; then
      record_fail "Tracked *.key file(s) detected (contents NOT printed):"
      while IFS= read -r f; do
        [[ -n "${f}" ]] && fail "  tracked: ${f}"
      done <<< "${KEY_HITS}"
    else
      record_pass "No tracked *.key files found."
    fi

    # --- Pattern 5: Obvious private-key filename fragments ---
    PRIVKEY_HITS=$(echo "${TRACKED_FILES}" | grep -iE '(private[-_]?key|id_rsa|id_dsa|id_ecdsa|id_ed25519)(\..*)?$' || true)
    if [[ -n "${PRIVKEY_HITS}" ]]; then
      record_fail "Tracked private-key filename(s) detected (contents NOT printed):"
      while IFS= read -r f; do
        [[ -n "${f}" ]] && fail "  tracked: ${f}"
      done <<< "${PRIVKEY_HITS}"
    else
      record_pass "No tracked private-key filenames found."
    fi

  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log ""
log "--- Security Gate Result: ${OVERALL_RESULT} ---"
log ""
log "NOTE: This is a lightweight automated gate, not a full security assessment."
log "It checks known high/critical CVEs in dependencies and obvious secret-file"
log "patterns. Manual review and dedicated security tooling are still required."

# ---------------------------------------------------------------------------
# Exit
# ---------------------------------------------------------------------------
case "${OVERALL_RESULT}" in
  PASS)
    exit 0
    ;;
  WARN)
    exit 2
    ;;
  FAIL)
    exit 1
    ;;
esac
