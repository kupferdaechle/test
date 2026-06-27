"""Stub: meta_analyzer node — filters and deduplicates security findings."""

from __future__ import annotations

from ..state import MetaAnalyzerResponse, SkillspectorState


def meta_analyzer(state: SkillspectorState) -> MetaAnalyzerResponse:
    """Pass findings through; no LLM enrichment in stub mode."""
    findings = state.get("findings") or []
    seen: set[str] = set()
    filtered = []
    for f in findings:
        key = f"{f.get('rule_id', '')}:{f.get('file', '')}:{f.get('line', '')}"
        if key not in seen:
            seen.add(key)
            filtered.append(f)
    return {"filtered_findings": filtered}
