"""ETL runner — endpoint para ejecutar el pipeline TCPO desde la UI."""

import asyncio
import json
import sys
from pathlib import Path

from fastapi import APIRouter
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

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(_SCRIPT_DIR),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=600)
        output = stdout.decode("utf-8", errors="replace")
        return {"ok": proc.returncode == 0, "output": output}
    except asyncio.TimeoutError:
        proc.kill()
        return {"ok": False, "output": "Timeout: el proceso tardó más de 10 minutos."}


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
