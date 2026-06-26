"""skillspector-quality: a quality rating layer on top of SkillSpector."""

from __future__ import annotations

from skillspector_quality._bootstrap import install_fallback

__version__ = "0.1.0"

# Register the bundled skillspector fallback if the real SkillRater package is not
# installed. Runs before any submodule imports ``skillspector``. No-op when the real
# package is present.
SKILLSPECTOR_IS_FALLBACK = install_fallback()
