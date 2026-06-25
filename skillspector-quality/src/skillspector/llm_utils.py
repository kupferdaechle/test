"""Stub: LLM utility functions."""

from __future__ import annotations


def is_llm_available() -> tuple[bool, str | None]:
    """Return (available, error_message). Always False in stub mode."""
    return False, "skillspector stub — no LLM configured"


def chat_completion(prompt: str, *, model: str | None = None) -> str:
    """Stub: raises so callers degrade gracefully."""
    raise RuntimeError("skillspector stub — LLM calls are not available")
