"""
Seed de precios demo + normalizaciÃ³n de unidades para pruebas locales.

Objetivo: permitir probar el flujo completo (CatÃ¡logo â†’ Biblioteca/Mapeo â†’ Presupuesto)
sin depender de que el catÃ¡logo tenga precios reales cargados.

Acciones:
- Normaliza unidades conocidas (m2->mÂ², m3->mÂ³, hr/h prod->h).
- Elimina work items con unidades no soportadas *o* no canÃ³nicas (si se ejecuta con `--delete-noncanonical`) y limpia referencias en DB local.
- Asigna precios aproximados (determinÃ­sticos) a work items sin precio.

Uso:
  python scripts/seed_demo_prices.py
  python scripts/seed_demo_prices.py --dry-run
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sqlite3


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(REPO_ROOT, "backend", "costmapper_dev.db")

ALLOWED_UNITS = {"m²", "m³", "m", "un", "kg", "l", "h", "bls"}

UNIT_NORMALIZATION = {
    "m2": "m²",
    "m^2": "m²",
    "m²": "m²",
    "m³": "m³",
    "m3": "m³",
    "m^3": "m³",
    "hr": "h",
    "hora": "h",
    "hprod": "h",
    "h prod": "h",
}

# Rangos en PYG (Gs.). Ajustes deliberadamente groseros (solo para testing).
RANGE_BY_FACET_AND_UNIT: dict[tuple[str, str], tuple[int, int]] = {
    ("2N", "h"): (35_000, 110_000),   # mano de obra
    ("2Q", "h"): (80_000, 250_000),   # equipos (alquiler)
    ("2C", "kg"): (1_000, 40_000),    # materiales por kg
    ("2C", "l"): (2_000, 60_000),     # materiales por litro
    ("2C", "m"): (5_000, 180_000),    # materiales por metro
    ("2C", "un"): (2_000, 350_000),   # materiales por unidad
    ("2C", "bls"): (25_000, 140_000), # bolsas
    ("2C", "m²"): (8_000, 250_000),  # materiales por m2
    ("2C", "m³"): (30_000, 500_000), # materiales por m3

    ("3R", "un"): (40_000, 800_000),
    ("3R", "m"): (30_000, 400_000),
    ("3R", "m²"): (60_000, 650_000),
    ("3R", "m³"): (90_000, 1_200_000),

    ("3E", "m"): (30_000, 450_000),
    ("3E", "m²"): (120_000, 1_100_000),
    ("3E", "m³"): (250_000, 2_000_000),
    ("3E", "un"): (80_000, 1_500_000),
}

DEFAULT_RANGE_BY_UNIT: dict[str, tuple[int, int]] = {
    "m²": (80_000, 800_000),
    "m³": (150_000, 1_800_000),
    "m": (10_000, 300_000),
    "un": (10_000, 600_000),
    "kg": (1_000, 50_000),
    "l": (2_000, 60_000),
    "h": (35_000, 200_000),
    "bls": (25_000, 140_000),
}


def _norm_unit(raw: str | None) -> str:
    if not raw:
        return ""
    s = raw.strip().lower().replace(" ", "")
    return UNIT_NORMALIZATION.get(s, raw.strip())


def _ratio_for_key(key: str) -> float:
    h = hashlib.md5(key.encode("utf-8")).hexdigest()[:8]
    n = int(h, 16)
    return n / 0xFFFFFFFF


def _demo_price_pyg(*, nbr_code: str, facet: str, unit: str) -> int:
    lo, hi = RANGE_BY_FACET_AND_UNIT.get((facet, unit), DEFAULT_RANGE_BY_UNIT.get(unit, (10_000, 500_000)))
    r = _ratio_for_key(nbr_code)
    val = int(lo + r * (hi - lo))
    # Redondeo a 100 Gs para que se vea mÃ¡s "real"
    return int(round(val / 100.0) * 100)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="No escribe cambios en la DB")
    ap.add_argument(
        "--delete-noncanonical",
        action="store_true",
        help="Elimina work items cuya unidad no sea canÃ³nica (en vez de normalizar).",
    )
    args = ap.parse_args()

    if not os.path.exists(DB_PATH):
        raise SystemExit(f"DB no encontrada: {DB_PATH}")

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    cur.execute("SELECT id, nbr_code, facet, unit, unit_price FROM catalog_items WHERE is_work_item = 1")
    items = cur.fetchall()

    to_delete: list[str] = []
    updated_units = 0
    updated_prices = 0

    for item_id, nbr_code, facet, unit, unit_price in items:
        norm = _norm_unit(unit)

        if args.delete_noncanonical and norm and norm != unit:
            to_delete.append(item_id)
            continue

        if norm and norm != unit:
            updated_units += 1
            if not args.dry_run:
                cur.execute("UPDATE catalog_items SET unit = ? WHERE id = ?", (norm, item_id))

        if norm not in ALLOWED_UNITS:
            to_delete.append(item_id)
            continue

        if unit_price is None:
            price = _demo_price_pyg(nbr_code=nbr_code, facet=facet, unit=norm)
            updated_prices += 1
            if not args.dry_run:
                cur.execute(
                    "UPDATE catalog_items SET unit_price = ?, currency = ?, fuente_precios = ? WHERE id = ?",
                    (str(price), "PYG", "demo_approx_2026_05", item_id),
                )

    deleted = 0
    if to_delete and not args.dry_run:
        # Limpiar referencias en DB local (solo para testing).
        qmarks = ",".join("?" for _ in to_delete)
        cur.execute(f"DELETE FROM apu_components WHERE item_id IN ({qmarks}) OR component_id IN ({qmarks})", (*to_delete, *to_delete))
        cur.execute(f"DELETE FROM project_library WHERE item_id IN ({qmarks})", to_delete)
        cur.execute(f"DELETE FROM project_assignments WHERE item_id IN ({qmarks})", to_delete)
        cur.execute(f"DELETE FROM catalog_items WHERE id IN ({qmarks})", to_delete)
        deleted = len(to_delete)

    if args.dry_run:
        con.rollback()
    else:
        con.commit()

    con.close()

    print(f"DB: {DB_PATH}")
    print(f"Unidades normalizadas: {updated_units}")
    print(f"Precios demo asignados: {updated_prices}")
    print(f"Work items eliminados por unidad no soportada: {deleted}" + (" (dry-run)" if args.dry_run else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
