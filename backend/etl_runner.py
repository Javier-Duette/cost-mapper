"""ETL runner — endpoint para ejecutar el pipeline TCPO desde la UI."""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/etl", tags=["etl"])

_SCRIPT_DIR = Path(__file__).parent.parent / "scripts" / "etl_tcpo"
_PROGRESS   = Path(__file__).parent.parent / "scripts" / "data" / "tcpo_progress.json"
_COST_LOG   = Path(__file__).parent.parent / "scripts" / "data" / "cost_log.csv"
_API_LOG    = Path(__file__).parent.parent / "scripts" / "data" / "api_debug.jsonl"
_DB_PATH    = Path(__file__).parent / "costmapper_dev.db"


class RunRequest(BaseModel):
    pages:   str
    dry_run: bool = False
    force:   bool = False


class PreviewRequest(BaseModel):
    pages: str
    force: bool = False


class CommitRequest(BaseModel):
    items: list[dict[str, Any]]


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


@router.get("/cost-log")
async def get_cost_log():
    """Descarga el log de costos CSV."""
    if not _COST_LOG.exists():
        raise HTTPException(status_code=404, detail="El log de costos aún no existe. Ejecuta el ETL primero.")
    
    return FileResponse(
        path=_COST_LOG,
        media_type="text/csv",
        filename="etl_cost_log.csv"
    )


@router.post("/preview")
async def preview_etl(req: PreviewRequest):
    """Extrae ítems de las páginas indicadas y retorna JSON estructurado SIN insertar en DB.

    Usa --json-output --dry-run en el CLI. Ideal para verificar traducciones antes de confirmar.
    """
    cmd = [
        sys.executable, "main.py", "run",
        "--pages", req.pages,
        "--dry-run",
        "--json-output",
    ]
    if req.force:
        cmd.append("--force")

    def _run():
        result = subprocess.run(
            cmd,
            cwd=str(_SCRIPT_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=600,
        )
        stdout = result.stdout.decode("utf-8", errors="replace").strip()
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        if result.returncode != 0:
            return {"ok": False, "items": [], "stats": {}, "error": stderr or stdout}
        try:
            data = json.loads(stdout)
            return {"ok": True, "items": data.get("items", []), "stats": data.get("stats", {})}
        except json.JSONDecodeError:
            return {"ok": False, "items": [], "stats": {}, "error": f"Salida inesperada: {stdout[:500]}"}

    return await run_in_threadpool(_run)


@router.post("/commit")
async def commit_etl(req: CommitRequest):
    """Inserta en DB la lista de ítems revisados por el usuario.

    Los ítems con `_skip: true` son ignorados (archivados/excluidos en la UI).
    """
    if not _DB_PATH.exists():
        raise HTTPException(status_code=500, detail=f"DB no encontrada: {_DB_PATH}")

    # Importar loader desde scripts/etl_tcpo
    import importlib.util
    loader_path = _SCRIPT_DIR / "loader.py"
    spec = importlib.util.spec_from_file_location("etl_loader", loader_path)
    etl_loader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(etl_loader)

    items_to_insert = [it for it in req.items if not it.get("_skip", False)]

    def _run():
        return etl_loader.load_items(_DB_PATH, items_to_insert, source="etl_tcpo_ui")

    stats = await run_in_threadpool(_run)
    return {"ok": True, **stats}


@router.get("/api-log")
async def get_api_log():
    """Descarga el log completo de intercambio con la API de Gemini (JSONL)."""
    if not _API_LOG.exists():
        raise HTTPException(status_code=404, detail="El log de API aún no existe. Ejecuta el ETL primero.")

    return FileResponse(
        path=_API_LOG,
        media_type="application/x-ndjson",
        filename="etl_api_debug.jsonl"
    )
