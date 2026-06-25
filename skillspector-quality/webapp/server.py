"""Web UI for skillspector-quality.

Thin FastAPI wrapper around the quality + security scoring pipeline. The browser drops
one or more skills (as folders or .zip files); each skill is reconstructed into a temp
directory, run through the LangGraph pipeline, and returned as JSON.

When the real skillspector (SkillRater) package is installed the security analysis
runs in full. Otherwise the bundled stub provides no-op security nodes so the quality
scoring, token-cost, redundancy, and triggerability features continue to work.

Source for the real skillspector: https://github.com/larsroettig/SkillRater

Run:
    uvicorn webapp.server:app --reload --port 8000
or:
    python -m webapp.server
"""

from __future__ import annotations

import asyncio
import io
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel

from skillspector_quality.graph import graph
from skillspector_quality.quality.models import QualityReport
from skillspector_quality.quality.render import quality_json_dict
from webapp import bridge, metrics, trigger_eval

# Load LLM provider credentials from the project-root .env (provider creds are read
# at request time, so loading here is sufficient). Safe no-op if the file is absent.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="skillspector-quality UI")


def _merge_json(result: dict[str, Any], report: QualityReport) -> dict[str, Any]:
    """Reproduce the CLI's JSON output: upstream security report + quality block."""
    report_body = result.get("report_body") or ""
    try:
        data = json.loads(report_body) if report_body else {}
    except json.JSONDecodeError:
        data = {}
    data["quality_assessment"] = quality_json_dict(report)
    return data


def _safe_join(root: Path, relative: str) -> Path:
    """Join a user-supplied relative path under root, refusing escapes."""
    target = (root / relative).resolve()
    if not str(target).startswith(str(root.resolve())):
        raise HTTPException(status_code=400, detail=f"Unsafe path: {relative}")
    return target


def _run_scan(input_path: str, use_llm: bool) -> dict[str, Any]:
    """Invoke the quality-augmented graph and merge to JSON, cleaning up temp dirs."""
    state: dict[str, object] = {
        "input_path": input_path,
        "output_format": "json",
        "use_llm": use_llm,
    }
    config: RunnableConfig = {"run_name": "skillspector-quality-webui"}
    result = graph.invoke(state, config=config)
    try:
        report = QualityReport.from_dict(result.get("quality_report") or {"score": 0})
        return _merge_json(result, report)
    finally:
        temp_dir = result.get("temp_dir_for_cleanup")
        if (
            temp_dir
            and isinstance(temp_dir, str)
            and os.path.isdir(temp_dir)
            and os.path.abspath(temp_dir).startswith(tempfile.gettempdir())
        ):
            shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/api/scan")
async def scan(
    skill_name: str = Form(...),
    use_llm: bool = Form(False),
    paths: list[str] = Form(...),
    files: list[UploadFile] = Form(...),
) -> JSONResponse:
    """Scan one skill.

    The frontend posts the skill's files with their relative paths. A ``.zip`` is
    extracted, a folder is rebuilt verbatim; either way the bundle lands in one temp
    directory that gets both the token-cost estimate and the security/quality scan.
    """
    if len(paths) != len(files):
        raise HTTPException(status_code=400, detail="paths/files length mismatch")

    work = Path(tempfile.mkdtemp(prefix="ssq_upload_"))
    skill_root = work / "skill"
    skill_root.mkdir(parents=True, exist_ok=True)
    try:
        if len(files) == 1 and paths[0].lower().endswith(".zip"):
            try:
                with zipfile.ZipFile(io.BytesIO(await files[0].read())) as zf:
                    for member in zf.namelist():
                        if member.endswith("/"):
                            continue
                        dest = _safe_join(skill_root, member)
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(zf.read(member))
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail="Invalid zip file") from None
        else:
            for rel, upload in zip(paths, files):
                dest = _safe_join(skill_root, rel)
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(await upload.read())

        token_cost = metrics.compute_token_cost(skill_root)
        skill_meta = metrics.extract_skill_meta(skill_root)
        redundancy = metrics.compute_redundancy(skill_root)

        try:
            data = _run_scan(str(skill_root), use_llm)
        except (FileNotFoundError, ValueError) as e:
            return JSONResponse(
                status_code=200, content={"skill_name": skill_name, "error": str(e)}
            )
        except Exception as e:  # pragma: no cover - defensive
            return JSONResponse(
                status_code=200, content={"skill_name": skill_name, "error": str(e)}
            )

        data["skill_name"] = skill_name
        data["token_cost"] = token_cost
        data["skill_meta"] = skill_meta
        data["redundancy"] = redundancy
        return JSONResponse(content=data)
    finally:
        shutil.rmtree(work, ignore_errors=True)


class SkillRef(BaseModel):
    name: str
    description: str = ""
    when_to_use: str = ""


class TriggerEvalRequest(BaseModel):
    skills: list[SkillRef]
    k: int = 3


class BridgeAnswer(BaseModel):
    id: str
    answer: str


@app.post("/api/trigger-eval")
async def trigger_eval_endpoint(req: TriggerEvalRequest) -> JSONResponse:
    """Run the trigger-reliability harness via the file bridge (the session acts as the LLM)."""
    skills = [s.model_dump() for s in req.skills]
    if not skills:
        raise HTTPException(status_code=400, detail="no skills provided")
    prompt = trigger_eval.build_judge_prompt(skills, k=max(1, min(req.k, 5)))
    req_id = bridge.enqueue(prompt, meta={"kind": "trigger-eval", "skills": [s["name"] for s in skills]})
    raw = await asyncio.to_thread(bridge.wait_for, req_id, 600.0)
    if raw is None:
        return JSONResponse(
            status_code=200,
            content={"ok": False, "error": "bridge timeout — no answer was provided", "request_id": req_id},
        )
    result = trigger_eval.score(raw, skills)
    result["request_id"] = req_id
    return JSONResponse(content=result)


@app.get("/api/bridge/pending")
async def bridge_pending() -> dict[str, Any]:
    """List queued bridge requests awaiting an answer (used by whoever drives the session)."""
    return {"pending": bridge.pending()}


@app.post("/api/bridge/respond")
async def bridge_respond(body: BridgeAnswer) -> dict[str, Any]:
    """Provide an answer for a queued bridge request."""
    if not bridge.respond(body.id, body.answer):
        raise HTTPException(status_code=404, detail="no such pending request")
    return {"ok": True}


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
