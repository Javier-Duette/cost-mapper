"""
Seed de un ítem TCPO V15 demo completo con componentes APU.

Crea un ítem compuesto 3E (Mampostería de ladrillo cerámico) con sus
insumos (2C materiales, 2N mano de obra, 2Q equipos) y precios en Guaraníes.

Permite probar el flujo completo:
  CatalogView → "Agregar al proyecto" → BudgetView con subtotales reales.

Uso:
  cd backend
  python ../scripts/seed_tcpo_demo_item.py

Puede ejecutarse múltiples veces (idempotente por nbr_code).
"""

import sys
import os
import uuid
from decimal import Decimal
from datetime import datetime, timezone

# --- path setup ---
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../backend")

import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../backend/costmapper_dev.db")


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Datos del ítem demo (basados en TCPO V15 + precios Mandu'a PY 2026)
# ---------------------------------------------------------------------------

# Insumos: (nbr_code, facet, description_es, unit, unit_price)
INSUMOS = [
    ("2C 06 01 11 80 00", "2C", "Ladrillo cerámico hueco 15×20×30cm",        "un",  Decimal("2450")),
    ("2C 03 01 04 50 00", "2C", "Cemento Portland CP-II — bolsa 50kg",        "bls", Decimal("62000")),
    ("2C 03 03 01 20 00", "2C", "Arena lavada media",                          "m³",  Decimal("130000")),
    ("2N 01 02 00 50 00", "2N", "Albañil oficial",                             "hr",  Decimal("68000")),
    ("2N 01 02 01 20 00", "2N", "Ayudante de albañil",                         "hr",  Decimal("42000")),
    ("2Q 02 08 01 60 00", "2Q", "Betonera 320L — alquiler horario",            "hr",  Decimal("180000")),
]

# APU: (nbr_code_insumo, quantity, unit, source)
# Rendimientos TCPO V15 — mampostería 15cm
APU = [
    ("2C 06 01 11 80 00", Decimal("12.500"), "un",  "tcpo"),  # 12.5 ladrillos/m²
    ("2C 03 01 04 50 00", Decimal("0.065"),  "bls", "tcpo"),  # 0.065 bolsas cemento/m²
    ("2C 03 03 01 20 00", Decimal("0.016"),  "m³",  "tcpo"),  # 0.016 m³ arena/m²
    ("2N 01 02 00 50 00", Decimal("0.750"),  "hr",  "tcpo"),  # 0.75 hr albañil/m²
    ("2N 01 02 01 20 00", Decimal("0.750"),  "hr",  "tcpo"),  # 0.75 hr ayudante/m²
    ("2Q 02 08 01 60 00", Decimal("0.080"),  "hr",  "tcpo"),  # 0.08 hr betonera/m²
]

# Precio unitario = suma de (coef × precio)
UNIT_PRICE_CALCULATED = sum(
    qty * next(p for c, _, __, ___, p in INSUMOS if c == code)
    for code, qty, *_ in APU
)

PARENT_NBR = "3E 04 07 01 00 00"
PARENT_ITEM = {
    "nbr_code":       PARENT_NBR,
    "facet":          "3E",
    "description_pt": "Alvenaria de tijolos cerâmicos furados 15×20×30cm, espessura 15cm",
    "description_es": "Mampostería de ladrillo cerámico hueco 15×20×30cm, espesor 15cm",
    "unit":           "m²",
    "unit_price":     UNIT_PRICE_CALCULATED,
    "currency":       "PYG",
    "fuente_precios": "mandua_2026",
    "fuente_factores": "tcpo_v15",
    "bim_taggable":   True,
    "relevant_py":    True,
    "oficial":        True,
    "uuid_status":    "provisional",
    "creado_por":     "seed_tcpo_demo",
    "classification_source": "v15_official",
    "confidence":     95,
}


# ---------------------------------------------------------------------------
def upsert_item(cur, data: dict) -> str:
    """Inserta o devuelve el id del ítem con ese nbr_code.

    Todos los ítems creados por este seed son is_work_item=1 (ADR-011):
    son ítems TCPO presupuestables, no nodos de clasificación NBR.
    """
    cur.execute("SELECT id FROM catalog_items WHERE nbr_code = ?", (data["nbr_code"],))
    row = cur.fetchone()
    if row:
        cur.execute(
            """UPDATE catalog_items SET
               unit_price = ?, currency = ?, description_es = ?,
               fuente_precios = ?, fuente_factores = ?, is_work_item = 1,
               updated_at = ?
               WHERE id = ?""",
            (str(data.get("unit_price")), data.get("currency"),
             data.get("description_es"), data.get("fuente_precios"),
             data.get("fuente_factores"), _now(), row[0]),
        )
        return row[0]

    item_id = _uuid()
    cur.execute(
        """INSERT INTO catalog_items
           (id, nbr_code, facet, description_pt, description_es, unit,
            unit_price, currency, fuente_precios, fuente_factores,
            bim_taggable, relevant_py, oficial, uuid_status, creado_por,
            classification_source, confidence, parent_nbr_code,
            modificado_por, is_work_item, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            item_id,
            data["nbr_code"],
            data["facet"],
            data.get("description_pt"),
            data["description_es"],
            data["unit"],
            str(data.get("unit_price")) if data.get("unit_price") is not None else None,
            data.get("currency"),
            data.get("fuente_precios"),
            data.get("fuente_factores"),
            1 if data.get("bim_taggable") else 0,
            1 if data.get("relevant_py", True) else 0,
            1 if data.get("oficial") else 0,
            data.get("uuid_status", "local"),
            data.get("creado_por", "seed"),
            data.get("classification_source", "user"),
            data.get("confidence"),
            data.get("parent_nbr_code"),
            data.get("modificado_por"),
            1,  # is_work_item — todos los ítems TCPO son presupuestables (ADR-011)
            _now(),
            _now(),
        ),
    )
    return item_id


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print(f"DB: {DB_PATH}")
    print(f"Precio calculado del item 3E: Gs. {UNIT_PRICE_CALCULATED:,.0f}/m2\n")

    # 1. Insumos
    insumo_ids: dict[str, str] = {}
    for nbr, facet, desc_es, unit, price in INSUMOS:
        item_id = upsert_item(cur, {
            "nbr_code":       nbr,
            "facet":          facet,
            "description_es": desc_es,
            "unit":           unit,
            "unit_price":     price,
            "currency":       "PYG",
            "fuente_precios": "mandua_2026",
            "fuente_factores": "tcpo_v15",
            "bim_taggable":   facet in ("2C",),
            "relevant_py":    True,
            "oficial":        True,
            "uuid_status":    "provisional",
            "creado_por":     "seed_tcpo_demo",
            "classification_source": "v15_official",
        })
        insumo_ids[nbr] = item_id
        print(f"  OK insumo {facet} {nbr} - Gs. {price:,} -> id {item_id[:8]}...")

    # 2. Ítem padre 3E
    parent_id = upsert_item(cur, PARENT_ITEM)
    print(f"\n  OK item 3E {PARENT_NBR} - Gs. {UNIT_PRICE_CALCULATED:,.0f}/m2 -> id {parent_id[:8]}...")

    # 3. APU components
    cur.execute("DELETE FROM apu_components WHERE item_id = ?", (parent_id,))
    for nbr, qty, unit, source in APU:
        comp_id = insumo_ids[nbr]
        cur.execute(
            """INSERT INTO apu_components (id, item_id, component_id, quantity, unit, source)
               VALUES (?,?,?,?,?,?)""",
            (_uuid(), parent_id, comp_id, str(qty), unit, source),
        )
    print(f"  OK {len(APU)} componentes APU insertados\n")

    conn.commit()
    conn.close()
    print("Seed completo. Recarga el Catalogo en el browser - busca '3E 04 07 01' o 'mamposteria'.")


if __name__ == "__main__":
    main()
