"""Stub: resolve_input node — normalises input_path to a local skill_path."""

from __future__ import annotations

import logging
from pathlib import Path

from ..state import SkillspectorState

logger = logging.getLogger(__name__)


def resolve_input(state: SkillspectorState) -> dict[str, object]:
    """Return skill_path resolved from input_path or skill_path in state."""
    input_path = state.get("input_path")
    skill_path = state.get("skill_path")

    if input_path:
        p = Path(input_path).resolve()
        if p.exists():
            return {"skill_path": str(p), "temp_dir_for_cleanup": None}
        raise FileNotFoundError(f"input path does not exist: {input_path}")

    if skill_path:
        return {"skill_path": str(Path(skill_path).resolve()), "temp_dir_for_cleanup": None}

    return {"skill_path": None, "temp_dir_for_cleanup": None}
