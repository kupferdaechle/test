"""Deterministic skill metrics shared by the web server and the CI gate.

All functions here are LLM-free and reproducible: token cost (split by when content
loads), cross-file redundancy, frontmatter extraction, and triggerability of the
description. The CI gate and the web UI call the exact same code.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
_TEXT_SUFFIXES = {".md", ".markdown", ".txt"}

# Real tokenizer when available (offline); chars/4 fallback otherwise.
try:
    import tiktoken

    _ENC = tiktoken.get_encoding("cl100k_base")
    TOKENIZER_EXACT = True
except Exception:  # pragma: no cover
    _ENC = None
    TOKENIZER_EXACT = False

_TRIGGER_VERB = re.compile(r"\b(use|using|invoke|trigger|call|apply|run|activate|nutze|verwende)\b", re.I)
_NEGATION = re.compile(r"\b(do ?not|don'?t|never|not for|avoid|skip|nicht für|keine)\b", re.I)
_CONDITION = re.compile(r"\b(when|if|while|wenn|falls)\b", re.I)

_STOPWORDS = set(
    (
        "the and for with that this when from into your you use used uses using user "
        "should into onto only also able about which what whom whose into not non "
        "skill skills claude code file files input output json markdown task tasks "
        "oder und für mit wenn eine einen eines dem den die das nicht auch über "
        "verwende nutze wird werden soll sollte diese dieser dieses beim einem"
    ).split()
)


def est_tokens(text: str) -> int:
    """Token count via tiktoken when available, else a chars/4 estimate."""
    if _ENC is not None:
        return len(_ENC.encode(text, disallowed_special=()))
    return round(len(text) / 4)


def _find_skill_md(skill_dir: Path) -> Path | None:
    for p in sorted(skill_dir.rglob("*")):
        if p.is_file() and p.name.lower() == "skill.md":
            return p
    return None


def compute_token_cost(skill_dir: Path) -> dict[str, Any]:
    """Token footprint split by load time: frontmatter (always), body (per call), docs (on demand)."""
    skill_md = _find_skill_md(skill_dir)
    always_on = per_invocation = on_demand = 0
    if skill_md is not None:
        text = skill_md.read_text(encoding="utf-8", errors="ignore")
        m = _FRONTMATTER_RE.match(text)
        if m:
            always_on = est_tokens(m.group(1))
            body = text[m.end() :]
        else:
            body = text
        per_invocation = est_tokens(body)
    for p in sorted(skill_dir.rglob("*")):
        if p.is_file() and p != skill_md and p.suffix.lower() in _TEXT_SUFFIXES:
            on_demand += est_tokens(p.read_text(encoding="utf-8", errors="ignore"))
    return {
        "estimated": not TOKENIZER_EXACT,
        "tokenizer": "tiktoken/cl100k_base" if TOKENIZER_EXACT else "chars/4 heuristic",
        "always_on_tokens": always_on,
        "per_invocation_tokens": per_invocation,
        "on_demand_tokens": on_demand,
        "total_tokens": always_on + per_invocation + on_demand,
    }


def _word_shingles(text: str, n: int) -> set[str]:
    words = re.findall(r"[a-z0-9äöüß]+", text.lower())
    if len(words) < n:
        return set()
    return {" ".join(words[i : i + n]) for i in range(len(words) - n + 1)}


def compute_redundancy(skill_dir: Path, n: int = 8) -> dict[str, Any]:
    """How much of the SKILL.md body is verbatim/near-verbatim duplicated in supporting docs."""
    skill_md = _find_skill_md(skill_dir)
    if skill_md is None:
        return {"duplication_pct": 0.0, "by_file": {}, "ngram": n}
    text = skill_md.read_text(encoding="utf-8", errors="ignore")
    m = _FRONTMATTER_RE.match(text)
    body_sh = _word_shingles(text[m.end() :] if m else text, n)
    if not body_sh:
        return {"duplication_pct": 0.0, "by_file": {}, "ngram": n}
    by_file: dict[str, float] = {}
    union_shared: set[str] = set()
    for p in sorted(skill_dir.rglob("*")):
        if p.is_file() and p != skill_md and p.suffix.lower() in _TEXT_SUFFIXES:
            shared = body_sh & _word_shingles(p.read_text(encoding="utf-8", errors="ignore"), n)
            if shared:
                by_file[str(p.relative_to(skill_dir))] = round(len(shared) / len(body_sh) * 100, 1)
                union_shared |= shared
    return {
        "duplication_pct": round(len(union_shared) / len(body_sh) * 100, 1),
        "by_file": by_file,
        "ngram": n,
    }


def extract_skill_meta(skill_dir: Path) -> dict[str, Any]:
    """Pull name/description/when_to_use from SKILL.md frontmatter."""
    skill_md = _find_skill_md(skill_dir)
    if skill_md is not None:
        text = skill_md.read_text(encoding="utf-8", errors="ignore")
        m = _FRONTMATTER_RE.match(text)
        if m:
            try:
                fm = yaml.safe_load(m.group(1)) or {}
            except yaml.YAMLError:
                fm = {}
            if isinstance(fm, dict):
                return {
                    "name": fm.get("name"),
                    "description": str(fm.get("description") or ""),
                    "when_to_use": str(fm.get("when_to_use") or ""),
                }
    return {"name": None, "description": "", "when_to_use": ""}


def _keywords(meta: dict[str, Any]) -> set[str]:
    text = ((meta.get("description") or "") + " " + (meta.get("when_to_use") or "")).lower()
    return {w for w in re.split(r"[^a-z0-9äöüß]+", text) if len(w) >= 4 and w not in _STOPWORDS}


def compute_triggerability(meta: dict[str, Any], min_keywords: int = 6) -> dict[str, Any]:
    """Score how reliably the description will make the skill fire (and not misfire)."""
    d = (meta.get("description") or "")
    w = (meta.get("when_to_use") or "")
    both = f"{d} {w}"
    checks = [
        (bool(_TRIGGER_VERB.search(both)), "trigger verb (use / invoke …)"),
        (bool(_NEGATION.search(both)), "exclusion (\"do not use for …\")"),
        (bool(_CONDITION.search(both)), "condition (when / if …)"),
        (len(d) >= 60, "description ≥ 60 chars"),
        (len(w) >= 80, "when_to_use ≥ 80 chars"),
        (len(_keywords(meta)) >= min_keywords, f"≥{min_keywords} concrete keywords"),
    ]
    passed = sum(1 for ok, _ in checks if ok)
    return {
        "score": round(passed / len(checks) * 100),
        "checks": [{"ok": ok, "label": label} for ok, label in checks],
        "missing": [label for ok, label in checks if not ok],
    }
