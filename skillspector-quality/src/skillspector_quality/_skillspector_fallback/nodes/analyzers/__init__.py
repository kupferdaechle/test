"""Stub analyzer registry — no security checks are run in stub mode.

Replace the parent skillspector directory with a real installation to enable the full
20-analyzer security scan.  Source: https://github.com/larsroettig/SkillRater
"""

from __future__ import annotations

from typing import Any

# Empty list and dict: no analyzers run, no findings produced.
ANALYZER_NODE_IDS: list[str] = []
ANALYZER_NODES: dict[str, Any] = {}
