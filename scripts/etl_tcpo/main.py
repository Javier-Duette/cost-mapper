"""
ETL TCPO V15 — CLI de extracción selectiva del catálogo.

Uso rápido:
    cd scripts/etl_tcpo
    pip install -r requirements.txt

    # Verificar detección de tablas (sin llamar a la API)
    python main.py detect --pages 36

    # Procesar páginas
    python main.py run --pages 36-50
    python main.py run --pages 36,40,45
    python main.py run --pages 36 --force    # re-procesar aunque ya esté en cache

    # Ver estado del progreso
    python main.py status

Requisitos:
    - GEMINI_API_KEY en .env (raíz del repo o carpeta actual)
    - PDF en scripts/data/538948707-TCPO-BIM-15-Edicao.pdf
    - DB en backend/costmapper_dev.db
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import click
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------

_SCRIPT_DIR = Path(__file__).parent
_REPO_ROOT   = _SCRIPT_DIR.parent.parent

load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_SCRIPT_DIR / ".env")  # fallback local

PDF_PATH      = _REPO_ROOT / "scripts" / "data" / "538948707-TCPO-BIM-15-Edicao.pdf"
DB_PATH       = _REPO_ROOT / "backend" / "costmapper_dev.db"
PROGRESS_FILE = _REPO_ROOT / "scripts" / "data" / "tcpo_progress.json"
DEBUG_DIR     = _REPO_ROOT / "scripts" / "data" / "debug_crops"
COST_LOG_FILE = _REPO_ROOT / "scripts" / "data" / "cost_log.csv"


# ---------------------------------------------------------------------------
# Progress tracking
# ---------------------------------------------------------------------------

def _load_progress() -> dict:
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
    return {"processed_pages": {}, "total_items": 0}


def _save_progress(prog: dict) -> None:
    PROGRESS_FILE.write_text(json.dumps(prog, indent=2, ensure_ascii=False), encoding="utf-8")


def _mark_page(prog: dict, page: int, status: str, items: int = 0, error: str = "") -> None:
    prog["processed_pages"][str(page)] = {
        "status": status,
        "items_extracted": items,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if status == "done":
        prog["total_items"] = prog.get("total_items", 0) + items
    _save_progress(prog)


# ---------------------------------------------------------------------------
# Cost tracking
# ---------------------------------------------------------------------------

def _log_cost(page: int, mode: str, usage: dict) -> None:
    if not usage:
        return
    import csv
    file_exists = COST_LOG_FILE.exists()
    
    prompt_tokens = usage.get("prompt_tokens", 0)
    completion_tokens = usage.get("completion_tokens", 0)
    
    # gemini-2.5-flash pricing: $0.075 / 1M prompt, $0.30 / 1M completion
    cost_usd = (prompt_tokens / 1_000_000 * 0.075) + (completion_tokens / 1_000_000 * 0.30)
    
    with COST_LOG_FILE.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "page", "mode", "prompt_tokens", "completion_tokens", "estimated_cost_usd"])
        
        writer.writerow([
            datetime.now(timezone.utc).isoformat(),
            page,
            mode,
            prompt_tokens,
            completion_tokens,
            f"{cost_usd:.6f}"
        ])


# ---------------------------------------------------------------------------
# Parseo de rango de páginas
# ---------------------------------------------------------------------------

def _parse_pages(pages_str: str) -> list[int]:
    """Parsea '36-50' o '36,40,45' en lista de enteros."""
    pages = []
    for part in pages_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            pages.extend(range(int(start), int(end) + 1))
        else:
            pages.append(int(part))
    return sorted(set(pages))


# ---------------------------------------------------------------------------
# Comandos CLI
# ---------------------------------------------------------------------------

@click.group()
def cli():
    """ETL TCPO V15 — extracción selectiva de tablas hacia Cost-Mapper."""
    pass


@cli.command()
@click.option("--pages", required=True, help="Páginas a procesar. Ej: '36-50' o '36,40,45'")
@click.option("--save-crops", is_flag=True, default=False, help="Guardar imágenes de recortes detectados.")
def detect(pages: str, save_crops: bool):
    """Detecta tablas en páginas SIN llamar a la API. Útil para calibrar detección."""
    import detector

    if not PDF_PATH.exists():
        click.echo(f"[ERROR] PDF no encontrado: {PDF_PATH}", err=True)
        sys.exit(1)

    page_list = _parse_pages(pages)
    total_pages = detector.page_count(PDF_PATH)

    for p in page_list:
        if p < 1 or p > total_pages:
            click.echo(f"  [SKIP] Página {p} fuera de rango (1–{total_pages})")
            continue

        click.echo(f"  Página {p}: renderizando...", nl=False)
        page_img = detector.render_page(PDF_PATH, p)
        crops = detector.detect_tables(page_img)
        click.echo(f" {len(crops)} tabla(s) detectadas")

        if save_crops:
            detector.save_debug(page_img, crops, DEBUG_DIR, p)
            click.echo(f"    >> imagenes guardadas en {DEBUG_DIR}")


@cli.command()
@click.option("--pages", required=True, help="Páginas a procesar. Ej: '36-50' o '36,40,45'")
@click.option("--force", is_flag=True, default=False, help="Re-procesar páginas ya completadas.")
@click.option("--dry-run", is_flag=True, default=False, help="Extraer pero NO insertar en DB.")
@click.option("--model", default="gemini-2.5-flash", show_default=True, help="Modelo Gemini a usar.")
@click.option("--single-pass", "single_pass", is_flag=True, default=False,
              help="Desactivar optimizacion 2-pasos: extrae todo sin consultar DB primero.")
@click.option("--json-output", "json_output", is_flag=True, default=False,
              help="Emitir ítems extraídos como JSON a stdout (implica --dry-run). Para uso por la API.")
def run(pages: str, force: bool, dry_run: bool, model: str, single_pass: bool, json_output: bool):
    """Procesa paginas del TCPO: detecta tablas -> Gemini -> inserta en DB.

    Por defecto usa 2 pasos por tabla:
      Paso 1 (barato): pide solo los codigos NBR a Gemini.
      Paso 2 (completo): extrae solo los codigos nuevos (no presentes en DB).

    Usar --single-pass para saltear la optimizacion (util para depuracion).
    Usar --json-output para emitir JSON estructurado a stdout (implica --dry-run).
    """
    import detector
    import extractor
    import loader

    if json_output:
        dry_run = True  # json-output siempre es dry-run

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        click.echo("[ERROR] GEMINI_API_KEY no encontrada en .env", err=True)
        sys.exit(1)

    if not PDF_PATH.exists():
        click.echo(f"[ERROR] PDF no encontrado: {PDF_PATH}", err=True)
        sys.exit(1)

    if not DB_PATH.exists():
        click.echo(f"[ERROR] DB no encontrada: {DB_PATH}", err=True)
        sys.exit(1)

    extractor.init(api_key, model)
    prog = _load_progress()
    page_list = _parse_pages(pages)
    total_pages = detector.page_count(PDF_PATH)

    if not json_output:
        click.echo(f"\nModelo: {model}  |  Modo: {'single-pass' if single_pass else '2-pasos'}")
        click.echo(f"Paginas a procesar: {page_list}")
        click.echo(f"PDF: {PDF_PATH.name} ({total_pages} paginas total)")
        click.echo(f"DB:  {DB_PATH.name}")
        if dry_run:
            click.echo("[DRY-RUN] No se insertara en DB.\n")

    session_items = 0
    session_skipped = 0
    session_errors = 0
    all_session_items: list[dict] = []

    for p in page_list:
        if p < 1 or p > total_pages:
            if not json_output:
                click.echo(f"  [SKIP] Pagina {p} fuera de rango")
            continue

        page_str = str(p)
        already_done = prog["processed_pages"].get(page_str, {}).get("status") == "done"
        if already_done and not force:
            if not json_output:
                prev = prog["processed_pages"][page_str]
                click.echo(f"  [CACHE] Pag {p:4d} - ya procesada ({prev['items_extracted']} items). Usar --force para re-procesar.")
            continue

        if not json_output:
            click.echo(f"  Pag {p:4d}: renderizando...", nl=False)
        try:
            page_img = detector.render_page(PDF_PATH, p)
            crops = detector.detect_tables(page_img)
            if not json_output:
                click.echo(f" {len(crops)} tabla(s)", nl=False)

            all_items: list[dict] = []
            table_errors = 0
            page_skipped = 0

            for crop in crops:
                try:
                    if single_pass:
                        items, usage = extractor.extract_table(crop)
                        _log_cost(p, "single-pass", usage)
                    else:
                        # Paso 1: obtener solo codigos (llamada barata)
                        codes, usage = extractor.extract_codes_only(crop)
                        _log_cost(p, "codes_only", usage)
                        if not codes:
                            page_skipped += 1
                            continue

                        # Paso 2: filtrar contra DB (en json-output siempre extraemos todo)
                        known = set() if dry_run else loader.get_existing_codes(DB_PATH, codes)
                        new_codes = [c for c in codes if c not in known]

                        if not new_codes:
                            page_skipped += 1
                            continue  # todos ya en DB

                        items, usage = extractor.extract_table(crop, target_codes=new_codes)
                        _log_cost(p, "full_table", usage)

                    all_items.extend(items)

                except Exception as e:  # noqa: BLE001
                    table_errors += 1
                    if not json_output:
                        click.echo(f"\n    [WARN] Error en tabla: {e}", nl=False)

            session_skipped += page_skipped
            if not json_output:
                skip_info = f", {page_skipped} ya-en-DB" if page_skipped else ""
                click.echo(f" >> {len(all_items)} item(s) extraidos{skip_info}", nl=False)

            if not dry_run and all_items:
                stats = loader.load_items(DB_PATH, all_items)
                if not json_output:
                    click.echo(
                        f" | DB: +{stats['inserted']} nuevos, ~{stats['updated']} actualizados,"
                        f" {stats['apu_rows']} filas APU"
                        + (f", {len(stats['errors'])} errores" if stats["errors"] else ""),
                    )
                    if stats["errors"]:
                        for err in stats["errors"]:
                            click.echo(f"      [ERR] {err['nbr_code']}: {err['errors']}")
            else:
                if not json_output:
                    click.echo("")

            cache_size = extractor.flush_cache()
            _mark_page(prog, p, "done" if table_errors == 0 else "partial", len(all_items))
            session_items += len(all_items)
            session_errors += table_errors
            all_session_items.extend(all_items)
            if not json_output and cache_size:
                click.echo(f"    cache MD5: {cache_size} traducciones guardadas")

        except Exception as e:  # noqa: BLE001
            if not json_output:
                click.echo(f" [ERROR] {e}")
            _mark_page(prog, p, "error", error=str(e))
            session_errors += 1

    if json_output:
        # Emitir JSON limpio — toda la salida de texto fue suprimida
        output = {
            "items": all_session_items,
            "stats": {
                "extracted": session_items,
                "skipped_in_db": session_skipped,
                "errors": session_errors,
            },
        }
        click.echo(json.dumps(output, ensure_ascii=False))
    else:
        click.echo(f"\nSesion terminada: {session_items} items extraidos, {session_skipped} tablas ya-en-DB, {session_errors} errores.")
        click.echo(f"Total acumulado en progress.json: {prog.get('total_items', 0)} items.")


@cli.command()
def status():
    """Muestra el resumen del progreso de extracción."""
    prog = _load_progress()
    pages = prog.get("processed_pages", {})

    done    = [p for p, v in pages.items() if v["status"] == "done"]
    partial = [p for p, v in pages.items() if v["status"] == "partial"]
    errors  = [p for p, v in pages.items() if v["status"] == "error"]

    cache_count = 0
    if (PROGRESS_FILE.parent / "translation_cache.json").exists():
        import json as _json
        cache_count = len(_json.loads((PROGRESS_FILE.parent / "translation_cache.json").read_text(encoding="utf-8")))

    click.echo(f"\n{'─'*50}")
    click.echo(f"  Paginas procesadas: {len(done)} OK  {len(partial)} parcial  {len(errors)} error")
    click.echo(f"  Items totales extraidos: {prog.get('total_items', 0)}")
    click.echo(f"  Cache MD5 traducciones: {cache_count} entradas")
    click.echo(f"  Progress file: {PROGRESS_FILE}")

    if errors:
        click.echo(f"\n  Páginas con error: {', '.join(errors)}")
    if partial:
        click.echo(f"  Páginas parciales: {', '.join(partial)}")

    if done:
        items_by_page = {p: pages[p]["items_extracted"] for p in done}
        top = sorted(items_by_page.items(), key=lambda x: -x[1])[:5]
        click.echo("\n  Top páginas por ítems:")
        for p, n in top:
            click.echo(f"    Pág {p:>4}: {n} ítems")

    click.echo(f"{'─'*50}\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cli()
