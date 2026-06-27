"""Trigger-reliability harness.

Builds one judge prompt that (a) invents positive/negative user prompts for each skill
and (b) decides, with ALL skill descriptions in context at once, which skill each prompt
fires. That mirrors how triggering actually works in production and exposes both missed
triggers and cross-skill misfires (the tool-overload failure mode). The LLM call is routed
through the file bridge, so no API key is needed.
"""

from __future__ import annotations

import json
import re
from typing import Any


def build_judge_prompt(skills: list[dict[str, Any]], k: int = 3) -> str:
    """One prompt: generate k positive + k negative test prompts per skill, then self-judge
    which single skill fires for each — given every skill's description at once."""
    catalogue = "\n".join(
        f"- {s.get('name')}: {s.get('description', '')}"
        + (f" | when_to_use: {s.get('when_to_use')}" if s.get("when_to_use") else "")
        for s in skills
    )
    names = ", ".join(str(s.get("name")) for s in skills)
    return (
        "You are evaluating how reliably a set of Claude Code skills TRIGGER.\n\n"
        "Available skills (name: description):\n"
        f"{catalogue}\n\n"
        f"For EACH skill, invent {k} positive user messages (realistic requests that SHOULD "
        f"trigger that skill) and {k} negative user messages (plausible but should NOT trigger "
        "it — including some that belong to a different skill above, to test confusion).\n\n"
        "Then, acting as the agent that sees ALL skill descriptions above at once, decide for "
        "EACH generated message which SINGLE skill fires. The answer must be one of these exact "
        f"names: {names}, or \"none\" if no skill should fire.\n\n"
        "Return ONLY valid JSON, no prose, in exactly this shape:\n"
        '{"skills": {"<skill-name>": {"positive": [{"prompt": "...", "fires": "<name|none>"}], '
        '"negative": [{"prompt": "...", "fires": "<name|none>"}]}}}\n'
    )


def _parse_json(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return {}
    try:
        data = json.loads(match.group(0))
    except (json.JSONDecodeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def score(raw: str, skills: list[dict[str, Any]]) -> dict[str, Any]:
    """Turn the judge's JSON into per-skill and overall trigger metrics."""
    data = _parse_json(raw)
    by_name = (data.get("skills") or {}) if isinstance(data, dict) else {}
    valid_names = {str(s.get("name")) for s in skills}

    per_skill: dict[str, Any] = {}
    tot_pos = tot_pos_hit = tot_neg = tot_false = 0

    for name in valid_names:
        block = by_name.get(name) or {}
        pos = block.get("positive") or []
        neg = block.get("negative") or []

        pos_hit = sum(1 for e in pos if isinstance(e, dict) and e.get("fires") == name)
        pos_cross = sum(
            1
            for e in pos
            if isinstance(e, dict) and e.get("fires") not in (name, "none", None)
        )
        pos_missed = sum(1 for e in pos if isinstance(e, dict) and e.get("fires") == "none")
        false_trig = sum(1 for e in neg if isinstance(e, dict) and e.get("fires") == name)

        per_skill[name] = {
            "positives": len(pos),
            "recall": round(pos_hit / len(pos), 2) if pos else None,
            "cross_misfires": pos_cross,
            "missed": pos_missed,
            "negatives": len(neg),
            "false_triggers": false_trig,
            "false_trigger_rate": round(false_trig / len(neg), 2) if neg else None,
            "samples": {"positive": pos, "negative": neg},
        }
        tot_pos += len(pos)
        tot_pos_hit += pos_hit
        tot_neg += len(neg)
        tot_false += false_trig

    return {
        "ok": bool(per_skill),
        "overall": {
            "selection_accuracy": round(tot_pos_hit / tot_pos, 2) if tot_pos else None,
            "false_trigger_rate": round(tot_false / tot_neg, 2) if tot_neg else None,
            "total_positive": tot_pos,
            "total_negative": tot_neg,
        },
        "per_skill": per_skill,
    }
