"""
JSON file-based session storage.
Optimised for both local dev and serverless cloud runtimes (Vercel / Lambda).
"""
import json
import os
import tempfile
from pathlib import Path
from models.schemas import SessionData

# On Vercel / serverless, current directory is read-only; use system temp directory
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    STORAGE_DIR = Path(tempfile.gettempdir()) / "sharda_storage"
else:
    STORAGE_DIR = Path(__file__).parent.parent / "storage"

try:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    STORAGE_DIR = Path(tempfile.gettempdir()) / "sharda_storage"
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def save_session(session: SessionData) -> None:
    try:
        path = STORAGE_DIR / f"{session.id}.json"
        with open(path, "w", encoding="utf-8") as f:
            f.write(session.model_dump_json(indent=2))
    except Exception:
        # Fallback to /tmp if primary STORAGE_DIR is not writable
        tmp_dir = Path(tempfile.gettempdir()) / "sharda_storage"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        path = tmp_dir / f"{session.id}.json"
        with open(path, "w", encoding="utf-8") as f:
            f.write(session.model_dump_json(indent=2))


def load_session(session_id: str) -> SessionData | None:
    path = STORAGE_DIR / f"{session_id}.json"
    if not path.exists():
        tmp_path = Path(tempfile.gettempdir()) / "sharda_storage" / f"{session_id}.json"
        if tmp_path.exists():
            path = tmp_path
        else:
            return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return SessionData.model_validate_json(f.read())
    except Exception:
        return None


def session_exists(session_id: str) -> bool:
    if (STORAGE_DIR / f"{session_id}.json").exists():
        return True
    tmp_path = Path(tempfile.gettempdir()) / "sharda_storage" / f"{session_id}.json"
    return tmp_path.exists()
