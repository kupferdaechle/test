"""File-queue LLM bridge — lets a human/agent act as the model without an API key.

The app enqueues a prompt as a JSON file under .bridge/requests/. Whoever is driving
this session (e.g. Claude in a chat) reads the pending request, writes the answer to
.bridge/responses/<id>.json, and the waiting request resolves. No network, no key.

This is deliberately simple: one prompt → one response, polled off disk.
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

BRIDGE_DIR = Path(__file__).resolve().parent.parent / ".bridge"
REQ_DIR = BRIDGE_DIR / "requests"
RES_DIR = BRIDGE_DIR / "responses"


def _ensure_dirs() -> None:
    REQ_DIR.mkdir(parents=True, exist_ok=True)
    RES_DIR.mkdir(parents=True, exist_ok=True)


def enqueue(prompt: str, meta: dict[str, Any] | None = None) -> str:
    """Write a request file and return its id."""
    _ensure_dirs()
    req_id = uuid.uuid4().hex[:12]
    (REQ_DIR / f"{req_id}.json").write_text(
        json.dumps({"id": req_id, "prompt": prompt, "meta": meta or {}, "created": time.time()}),
        encoding="utf-8",
    )
    return req_id


def wait_for(req_id: str, timeout: float = 300.0, poll: float = 1.0) -> str | None:
    """Block until the response file appears (or timeout). Returns the answer text or None.

    Cleans up both request and response files on success.
    """
    res_path = RES_DIR / f"{req_id}.json"
    deadline = time.time() + timeout
    while time.time() < deadline:
        if res_path.exists():
            try:
                answer = json.loads(res_path.read_text(encoding="utf-8")).get("answer", "")
            except (json.JSONDecodeError, OSError):
                answer = ""
            res_path.unlink(missing_ok=True)
            (REQ_DIR / f"{req_id}.json").unlink(missing_ok=True)
            return answer
        time.sleep(poll)
    return None


def pending() -> list[dict[str, Any]]:
    """List queued requests that have no response yet."""
    _ensure_dirs()
    out: list[dict[str, Any]] = []
    for p in sorted(REQ_DIR.glob("*.json")):
        if (RES_DIR / p.name).exists():
            continue
        try:
            out.append(json.loads(p.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue
    return out


def respond(req_id: str, answer: str) -> bool:
    """Write an answer for a queued request id. Returns False if no such request."""
    _ensure_dirs()
    if not (REQ_DIR / f"{req_id}.json").exists():
        return False
    (RES_DIR / f"{req_id}.json").write_text(json.dumps({"answer": answer}), encoding="utf-8")
    return True
