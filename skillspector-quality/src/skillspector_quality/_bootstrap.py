"""Register the bundled skillspector fallback when the real package is absent.

skillspector_quality imports the upstream ``skillspector`` (SkillRater) package for its
security graph nodes and analyzer registry. SkillRater is not on PyPI, so when it is not
installed we alias the bundled fallback subpackage under the ``skillspector`` name. When
the real package IS installed, it is used unchanged and the fallback stays dormant.

Source for the real package: https://github.com/larsroettig/SkillRater
"""

from __future__ import annotations

import importlib
import importlib.util
import sys

_FALLBACK_BASE = "skillspector_quality._skillspector_fallback"

# Real skillspector module name -> import suffix under the fallback base. Listed
# parent-first so each parent package object exists before its children register.
_MODULE_MAP: list[tuple[str, str]] = [
    ("skillspector", ""),
    ("skillspector.state", ".state"),
    ("skillspector.llm_utils", ".llm_utils"),
    ("skillspector.nodes", ".nodes"),
    ("skillspector.nodes.resolve_input", ".nodes.resolve_input"),
    ("skillspector.nodes.build_context", ".nodes.build_context"),
    ("skillspector.nodes.meta_analyzer", ".nodes.meta_analyzer"),
    ("skillspector.nodes.report", ".nodes.report"),
    ("skillspector.nodes.analyzers", ".nodes.analyzers"),
]


def install_fallback() -> bool:
    """Alias the bundled fallback as ``skillspector`` if the real package is missing.

    Returns True when the fallback was installed, False when the real SkillRater
    package is present and left untouched. Idempotent: a second call is a no-op.
    """
    # Already registered (real or fallback) — nothing to do.
    if "skillspector" in sys.modules:
        return getattr(sys.modules["skillspector"], "__name__", "").startswith(_FALLBACK_BASE)

    # Real SkillRater installed and importable — use it.
    if importlib.util.find_spec("skillspector") is not None:
        return False

    # Register each fallback module under its real skillspector.* name.
    for alias, suffix in _MODULE_MAP:
        sys.modules[alias] = importlib.import_module(_FALLBACK_BASE + suffix)
    return True
