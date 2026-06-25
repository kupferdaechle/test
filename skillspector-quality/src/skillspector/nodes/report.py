"""Stub: report node — builds the final security report from filtered findings."""

from __future__ import annotations

import json
from typing import Any

from skillspector.state import SkillspectorState

_SEV_SCORE: dict[str, int] = {"critical": 100, "high": 75, "medium": 40, "low": 10, "info": 0}


def _risk(findings: list[dict[str, Any]]) -> tuple[int, str, str]:
    if not findings:
        return 0, "LOW", "NO ACTION REQUIRED"
    max_score = max(_SEV_SCORE.get(str(f.get("severity", "")).lower(), 0) for f in findings)
    if max_score >= 75:
        return max_score, "HIGH", "REMEDIATE BEFORE DEPLOYMENT"
    if max_score >= 40:
        return max_score, "MEDIUM", "REVIEW RECOMMENDED"
    return max_score, "LOW", "MONITOR"


def report(state: SkillspectorState) -> dict[str, object]:
    """Generate a security report from filtered_findings."""
    findings = state.get("filtered_findings") or []
    risk_score, risk_severity, risk_recommendation = _risk(findings)
    output_format = state.get("output_format") or "json"

    sarif: dict[str, Any] = {
        "version": "2.1.0",
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "runs": [{"tool": {"driver": {"name": "skillspector-stub", "rules": []}}, "results": []}],
    }

    body: dict[str, Any] = {
        "risk_score": risk_score,
        "risk_severity": risk_severity,
        "risk_recommendation": risk_recommendation,
        "findings": findings,
        "stub": True,
    }

    return {
        "report_body": json.dumps(body) if output_format == "json" else str(body),
        "sarif_report": sarif,
        "risk_score": risk_score,
        "risk_severity": risk_severity,
        "risk_recommendation": risk_recommendation,
    }
