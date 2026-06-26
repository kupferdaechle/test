"""Stub: build_context node — scans skill directory into file_cache and components."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

import yaml

from ..state import SkillspectorState

logger = logging.getLogger(__name__)

_SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", "dist", "build"}
_EXT_TYPE: dict[str, str] = {
    ".py": "python", ".sh": "shell", ".bash": "shell", ".zsh": "shell",
    ".js": "javascript", ".ts": "typescript", ".yaml": "yaml", ".yml": "yaml",
    ".json": "json", ".md": "markdown", ".txt": "text",
}
_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _file_type(p: Path) -> str:
    return _EXT_TYPE.get(p.suffix.lower(), "other")


def _parse_manifest(skill_dir: Path) -> dict[str, Any]:
    for name in ("SKILL.md", "skill.md"):
        p = skill_dir / name
        if p.exists():
            text = p.read_text(encoding="utf-8", errors="ignore")
            m = _FM_RE.match(text)
            if m:
                try:
                    return yaml.safe_load(m.group(1)) or {}
                except yaml.YAMLError:
                    pass
    return {}


def build_context(state: SkillspectorState) -> dict[str, object]:
    """Scan skill_path into file_cache, components, manifest, and component_metadata."""
    skill_path = state.get("skill_path")
    if not skill_path:
        return {
            "components": [], "file_cache": {}, "ast_cache": {},
            "manifest": {}, "component_metadata": {},
        }

    skill_dir = Path(skill_path)
    if not skill_dir.is_dir():
        return {
            "components": [], "file_cache": {}, "ast_cache": {},
            "manifest": {}, "component_metadata": {},
        }

    file_cache: dict[str, str] = {}
    components: list[dict[str, Any]] = []
    # component_metadata is a LIST of per-file dicts (each carries its own "path"),
    # matching what the report renderer iterates over.
    metadata: list[dict[str, Any]] = []

    for p in sorted(skill_dir.rglob("*")):
        if not p.is_file():
            continue
        if any(part in _SKIP_DIRS for part in p.parts):
            continue
        if p.name.startswith(".") and not p.name.startswith(".claude"):
            continue
        rel = str(p.relative_to(skill_dir))
        try:
            content = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            content = ""
        file_cache[rel] = content
        ftype = _file_type(p)
        components.append({"path": rel, "type": ftype})
        metadata.append({
            "path": rel,
            "type": ftype,
            "lines": content.count("\n") + 1,
            "size": p.stat().st_size,
            "executable": bool(p.stat().st_mode & 0o111),
        })

    return {
        "components": components,
        "file_cache": file_cache,
        "ast_cache": {},
        "manifest": _parse_manifest(skill_dir),
        "component_metadata": metadata,
    }
