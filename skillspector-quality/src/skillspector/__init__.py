"""Stub for skillspector (SkillRater) — satisfies imports when the real package is absent.

Replace this directory with a real skillspector installation to enable full security scanning.
Source: https://github.com/larsroettig/SkillRater
"""

from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("skillspector")
except PackageNotFoundError:
    __version__ = "2.1.4-stub"
