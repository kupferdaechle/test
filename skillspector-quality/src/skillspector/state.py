"""Stub: SkillspectorState TypedDict used by quality layer."""

from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict


class SkillspectorState(TypedDict, total=False):
    # Input
    input_path: str | None
    skill_path: str | None
    temp_dir_for_cleanup: str | None
    # Context
    components: list[dict[str, Any]]
    file_cache: dict[str, str]
    ast_cache: dict[str, Any]
    manifest: dict[str, Any]
    component_metadata: dict[str, Any]
    # Findings (reducer: concat lists across parallel branches)
    findings: Annotated[list[dict[str, Any]], operator.add]
    filtered_findings: list[dict[str, Any]]
    # Config
    model_config: dict[str, str]
    use_llm: bool
    yara_rules_dir: str | None
    # Output
    output_format: str
    report_body: str
    sarif_report: dict[str, Any]
    risk_score: int
    risk_severity: str
    risk_recommendation: str


class AnalyzerNodeResponse(TypedDict, total=False):
    findings: list[dict[str, Any]]


class MetaAnalyzerResponse(TypedDict, total=False):
    filtered_findings: list[dict[str, Any]]
