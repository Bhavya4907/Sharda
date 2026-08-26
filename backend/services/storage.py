"""
JSON file-based session storage. No database needed for hackathon.
Sessions stored in ./storage/<session_id>.json
"""
import json
import os
from pathlib import Path
from models.schemas import SessionData

STORAGE_DIR = Path(__file__).parent.parent / "storage"
STORAGE_DIR.mkdir(exist_ok=True)


def save_session(session: SessionData) -> None:
    path = STORAGE_DIR / f"{session.id}.json"
    with open(path, "w", encoding="utf-8") as f:
        f.write(session.model_dump_json(indent=2))


def load_session(session_id: str) -> SessionData | None:
    path = STORAGE_DIR / f"{session_id}.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return SessionData.model_validate_json(f.read())


def session_exists(session_id: str) -> bool:
    return (STORAGE_DIR / f"{session_id}.json").exists()
