#!/bin/bash
set -euo pipefail

# Nur in Remote-Sessions ausführen
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# ── 1. Pipeline-Skills aus diesem Repo global verfügbar machen ────────────────
SKILLS_SRC="${PROJECT_DIR}/.claude/skills"
SKILLS_DEST="${HOME}/.claude/skills"
mkdir -p "${SKILLS_DEST}"

if [ -d "${SKILLS_SRC}" ]; then
  for skill_dir in "${SKILLS_SRC}"/*/; do
    skill_name=$(basename "${skill_dir}")
    if [ ! -d "${SKILLS_DEST}/${skill_name}" ]; then
      cp -r "${skill_dir}" "${SKILLS_DEST}/${skill_name}"
    fi
  done
fi

# ── 2. Planungs-Agent-Skills holen (falls Repo gepusht) ──────────────────────
AGENT_REPO="https://github.com/kupferdaechle/planungs-agent.git"
AGENT_DIR="/tmp/planungs-agent"

if [ ! -d "${AGENT_DIR}/.git" ]; then
  git clone --depth 1 "${AGENT_REPO}" "${AGENT_DIR}" 2>/dev/null || true
fi

if [ -d "${AGENT_DIR}/.claude/skills" ]; then
  for skill_dir in "${AGENT_DIR}/.claude/skills"/*/; do
    skill_name=$(basename "${skill_dir}")
    cp -r "${skill_dir}" "${SKILLS_DEST}/${skill_name}"
  done
fi

# ── 3. skillspector-quality installieren (falls im Planungs-Agent enthalten) ─
SQ_DIR="${AGENT_DIR}/skillspector-quality"
if [ -d "${SQ_DIR}" ] && [ -f "${SQ_DIR}/pyproject.toml" ]; then
  pip install -q -e "${SQ_DIR}"
fi

# ── 4. KNX GUI Dependencies (falls vorhanden) ────────────────────────────────
if [ -f "${PROJECT_DIR}/knx-gui/package.json" ]; then
  cd "${PROJECT_DIR}/knx-gui" && npm install --silent
fi
