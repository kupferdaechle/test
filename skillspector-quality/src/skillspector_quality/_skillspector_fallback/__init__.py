"""Bundled fallback for skillspector (SkillRater).

This subpackage is registered under the name ``skillspector`` by
``skillspector_quality._bootstrap`` ONLY when the real SkillRater package is not
installed. It provides no-op security nodes (no findings, risk_score 0) so the
quality scoring, token-cost, redundancy, and triggerability features keep working.

Install the real package for full security analysis:
    https://github.com/larsroettig/SkillRater
"""

__version__ = "0.0.0-fallback"
