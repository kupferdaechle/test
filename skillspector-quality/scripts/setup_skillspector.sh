#!/usr/bin/env bash
#
# setup_skillspector.sh — install the real SkillRater (skillspector) and this package
# into a Python 3.13 virtualenv, enabling full security scanning.
#
# SkillRater is not on PyPI. This script downloads it from GitHub (the HTTPS tarball,
# which works even where the git protocol is blocked) and installs it before this
# package, so the bundled fallback stays dormant and the real 20-analyzer scan runs.
#
# Usage:
#   scripts/setup_skillspector.sh            # downloads SkillRater@main
#   SKILLSPECTOR_REF=v2.1.4 scripts/setup_skillspector.sh
#   SKILLSPECTOR_SRC=/path/to/SkillRater scripts/setup_skillspector.sh  # use a checkout
#
# After it finishes:
#   source .venv/bin/activate
#   python -m webapp.server          # full quality + security web UI
#   python -m skillspector_quality scan ./my-skill --no-llm

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

SKILLSPECTOR_REF="${SKILLSPECTOR_REF:-main}"
VENV="${VENV:-.venv}"

# --- pick a compatible Python (SkillRater requires >=3.12,<3.14) -------------
PY=""
for cand in python3.13 python3.12; do
  if command -v "${cand}" >/dev/null 2>&1; then PY="${cand}"; break; fi
done
if [ -z "${PY}" ]; then
  echo "ERROR: need Python 3.12 or 3.13 (SkillRater requires >=3.12,<3.14)." >&2
  exit 1
fi
echo ">> Using $(${PY} --version 2>&1)"

# --- create the venv ---------------------------------------------------------
"${PY}" -m venv "${VENV}"
# shellcheck disable=SC1091
source "${VENV}/bin/activate"
python -m pip install --upgrade pip >/dev/null

# --- obtain SkillRater source ------------------------------------------------
STAGE=""
if [ -n "${SKILLSPECTOR_SRC:-}" ]; then
  SRC="${SKILLSPECTOR_SRC}"
  echo ">> Using SkillRater checkout: ${SRC}"
else
  STAGE="$(mktemp -d)"
  trap 'rm -rf "${STAGE}"' EXIT
  URL="https://codeload.github.com/larsroettig/SkillRater/tar.gz/refs/heads/${SKILLSPECTOR_REF}"
  echo ">> Downloading SkillRater@${SKILLSPECTOR_REF}"
  curl -sS -L -o "${STAGE}/skillrater.tar.gz" "${URL}"
  tar xzf "${STAGE}/skillrater.tar.gz" -C "${STAGE}"
  SRC="$(find "${STAGE}" -maxdepth 1 -type d -name 'SkillRater-*' | head -1)"
  if [ -z "${SRC}" ]; then
    echo "ERROR: could not find extracted SkillRater source." >&2
    exit 1
  fi
fi

# --- install: SkillRater first, then this package ----------------------------
echo ">> Installing skillspector (SkillRater) and its dependencies"
pip install "${SRC}"

echo ">> Installing skillspector-quality (with code metrics + dev tools)"
pip install -e ".[code,dev]"

# --- verify the real package wins over the bundled fallback ------------------
python - <<'PY'
import skillspector_quality, skillspector
from skillspector.nodes.analyzers import ANALYZER_NODE_IDS
assert not skillspector_quality.SKILLSPECTOR_IS_FALLBACK, "fallback is active — real install failed"
print(f">> OK: real skillspector {skillspector.__version__} active, {len(ANALYZER_NODE_IDS)} analyzers")
PY

echo
echo "Done. Activate and run:"
echo "  source ${VENV}/bin/activate"
echo "  python -m webapp.server"
