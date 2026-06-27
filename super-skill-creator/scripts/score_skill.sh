#!/usr/bin/env bash
#
# score_skill.sh — run the deterministic quality + security gate on a skill bundle.
#
# Wraps the skillspector-quality tool deployed in this repository. It prints the
# quality score (0-100) and the security risk, then exits non-zero when the bundle
# falls below the quality threshold so the workflow loop can react.
#
# Usage:
#   scripts/score_skill.sh PATH_TO_SKILL [MIN_SCORE]
#
#   PATH_TO_SKILL  Directory, .zip, or SKILL.md to score.
#   MIN_SCORE      Quality gate threshold (default: 90).
#
# Example:
#   scripts/score_skill.sh ../my-skill 90

set -euo pipefail

# --- arguments ---------------------------------------------------------------
SKILL_PATH="${1:-}"
MIN_SCORE="${2:-90}"
if [ -z "${SKILL_PATH}" ]; then
  echo "usage: scripts/score_skill.sh PATH_TO_SKILL [MIN_SCORE]" >&2
  exit 2
fi

# --- locate the skillspector-quality tool (sibling of this skill) ------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(cd "${SCRIPT_DIR}/../../skillspector-quality" 2>/dev/null && pwd || true)"
if [ -z "${TOOL_DIR}" ]; then
  echo "ERROR: skillspector-quality not found next to this skill." >&2
  echo "       Expected at ../../skillspector-quality (deploy it first)." >&2
  exit 2
fi

# --- prefer the project venv (full security scan) if present -----------------
PYTHON="python3"
if [ -x "${TOOL_DIR}/.venv/bin/python" ]; then
  PYTHON="${TOOL_DIR}/.venv/bin/python"
fi

# --- run the gate: scan in JSON, parse score, enforce the threshold ----------
cd "${TOOL_DIR}"
"${PYTHON}" -m webapp.ci_gate "${SKILL_PATH}" --min-score "${MIN_SCORE}" --json
