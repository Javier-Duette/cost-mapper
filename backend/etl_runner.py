"""ETL runner — endpoint para ejecutar el pipeline TCPO desde la UI."""

import json
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

router = APIRouter(prefix="/api/etl", tags=["etl"])

_SCRIPT_DIR = Path(__file__).parent.parent / "scripts" / "etl_tcpo"
_PROGRESS   = Path(__file__).parent.parent / "scripts" / "data" / "tcpo_progress.json"


class RunRequest(BaseModel):
    pages:   str
    dry_run: bool = False
    force:   bool = False


@router.post("/run")
async def run_etl(req: RunRequest):
    """Ejecuta el ETL TCPO en un subproceso y devuelve el output completo."""
    cmd = [sys.executable, "main.py", "run", "--pages", req.pages]
    if req.dry_run:
        cmd.append("--dry-run")
    if req.force:
        cmd.append("--force")

    def _run():
        result = subprocess.run(
            cmd,
            cwd=str(_SCRIPT_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=600,
        )
        output = result.stdout.decode("utf-8", errors="replace")
        return {"ok": result.returncode == 0, "output": output}

    return await run_in_threadpool(_run)


@router.get("/status")
async def get_status():
    """Devuelve el resumen de progreso desde tcpo_progress.json."""
    if not _PROGRESS.exists():
        return {"total_items": 0, "pages": {}}
    data = json.loads(_PROGRESS.read_text(encoding="utf-8"))
    return {
        "total_items": data.get("total_items", 0),
        "pages": data.get("processed_pages", {}),
    }
