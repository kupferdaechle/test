"""Deterministic CI gate for skills — no LLM, no API key, suitable for pipelines.

Checks a skill against budgets you set (quality score, always-on / per-invocation token
cost, cross-file redundancy, triggerability) and exits non-zero if any fails. Reuses the
exact metrics the web UI shows (webapp.metrics) plus skillspector-quality's score.

Usage:
    python -m webapp.ci_gate path/to/skill [--min-score 70] [--max-always-on 250]
        [--max-per-invocation 1500] [--max-redundancy 15] [--min-triggerability 67] [--json]

Exit codes: 0 = all checks pass, 1 = a gate failed, 2 = error.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from skillspector_quality.quality import score_quality

from webapp import metrics


def _resolve(path: str) -> tuple[Path, str | None]:
    """Return (skill_dir, temp_dir_to_clean). Accepts a directory, .zip, or single .md."""
    p = Path(path)
    if p.is_dir():
        return p, None
    if not p.exists():
        raise FileNotFoundError(f"no such path: {path}")
    tmp = tempfile.mkdtemp(prefix="ssq_ci_")
    root = Path(tmp)
    if p.suffix.lower() == ".zip":
        with zipfile.ZipFile(p) as zf:
            for member in zf.namelist():
                if member.endswith("/"):
                    continue
                dest = (root / member).resolve()
                if not str(dest).startswith(str(root.resolve())):
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(zf.read(member))
    else:
        (root / p.name).write_bytes(p.read_bytes())
    return root, tmp


def _file_cache(skill_dir: Path) -> dict[str, str]:
    cache: dict[str, str] = {}
    for f in sorted(skill_dir.rglob("*")):
        if f.is_file():
            cache[str(f.relative_to(skill_dir))] = f.read_text(encoding="utf-8", errors="ignore")
    return cache


def evaluate(skill_dir: Path) -> dict[str, Any]:
    """Compute all deterministic metrics for a skill directory."""
    report = score_quality(_file_cache(skill_dir))
    return {
        "score": report.score,
        "token_cost": metrics.compute_token_cost(skill_dir),
        "redundancy": metrics.compute_redundancy(skill_dir),
        "triggerability": metrics.compute_triggerability(metrics.extract_skill_meta(skill_dir)),
    }


def run_gate(m: dict[str, Any], args: argparse.Namespace) -> list[tuple[str, bool, str]]:
    """Return a list of (check_name, passed, detail). Only checks with a threshold run."""
    checks: list[tuple[str, bool, str]] = []
    tc = m["token_cost"]
    if args.min_score is not None:
        checks.append(("quality score", m["score"] >= args.min_score, f"{m['score']} (min {args.min_score})"))
    if args.max_always_on is not None:
        v = tc["always_on_tokens"]
        checks.append(("always-on tokens", v <= args.max_always_on, f"{v} (max {args.max_always_on})"))
    if args.max_per_invocation is not None:
        v = tc["per_invocation_tokens"]
        checks.append(("per-invocation tokens", v <= args.max_per_invocation, f"{v} (max {args.max_per_invocation})"))
    if args.max_redundancy is not None:
        v = m["redundancy"]["duplication_pct"]
        checks.append(("redundancy %", v <= args.max_redundancy, f"{v}% (max {args.max_redundancy}%)"))
    if args.min_triggerability is not None:
        v = m["triggerability"]["score"]
        checks.append(("triggerability", v >= args.min_triggerability, f"{v} (min {args.min_triggerability})"))
    return checks


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="skillspector-quality-ci", description=__doc__)
    ap.add_argument("path", help="Skill directory, .zip, or SKILL.md")
    ap.add_argument("--min-score", type=int, help="Fail if quality score is below this (0-100)")
    ap.add_argument("--max-always-on", type=int, help="Fail if frontmatter (always-on) tokens exceed this")
    ap.add_argument("--max-per-invocation", type=int, help="Fail if SKILL.md body tokens exceed this")
    ap.add_argument("--max-redundancy", type=float, help="Fail if cross-file duplication %% exceeds this")
    ap.add_argument("--min-triggerability", type=int, help="Fail if triggerability is below this (0-100)")
    ap.add_argument("--json", action="store_true", help="Emit machine-readable JSON")
    args = ap.parse_args(argv)

    skill_dir, tmp = None, None
    try:
        skill_dir, tmp = _resolve(args.path)
        m = evaluate(skill_dir)
        checks = run_gate(m, args)
        passed = all(ok for _, ok, _ in checks)

        if args.json:
            print(json.dumps({"metrics": m, "checks": [
                {"name": n, "passed": ok, "detail": d} for n, ok, d in checks
            ], "passed": passed}, indent=2))
        else:
            tc = m["token_cost"]
            print(f"Skill: {args.path}")
            print(f"  quality score      : {m['score']}/100")
            print(f"  tokens (always-on) : {tc['always_on_tokens']}")
            print(f"  tokens (per call)  : {tc['per_invocation_tokens']}")
            print(f"  tokens (on-demand) : {tc['on_demand_tokens']}")
            print(f"  redundancy         : {m['redundancy']['duplication_pct']}%")
            print(f"  triggerability     : {m['triggerability']['score']}/100")
            if not checks:
                print("\nNo thresholds set — nothing to gate. Pass --min-score etc. to enforce.")
            else:
                print("\nGate:")
                for name, ok, detail in checks:
                    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")
                print(f"\n{'PASSED' if passed else 'FAILED'}")

        return 0 if passed else 1
    except (FileNotFoundError, ValueError, zipfile.BadZipFile) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
