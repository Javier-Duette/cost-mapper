"""
Loader TCPO — valida e inserta ítems extraídos en catalog_items y apu_components.

Los ítems se insertan con is_work_item=True y unit_price=NULL.
Los precios se cargan en un paso separado (cruce con Mandu'a, post-MVP).

Idempotente: si un nbr_code ya existe, actualiza descripción y marca is_work_item=1.
"""

from __future__ import annotations

import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# Unidades válidas conocidas en TCPO (para validación básica)
_KNOWN_UNITS = {
    "m²", "m2", "m³", "m3", "m", "cm", "mm",
    "h", "hr", "hora",
    "kg", "g", "t",
    "un", "unid", "unidade",
    "l", "lt", "litro",
    "bls", "bolsa",
    "vb", "verba",
    "cx",
}

# Patrón básico de código NBR: letra(s) + dígitos separados por espacios
_CODE_RE = re.compile(r"^[A-Z0-9]{1,3}(\s+\d{2}){1,8}(_UNCERTAIN)?$")


def validate_item(item: dict) -> list[str]:
    """Devuelve lista de errores. Lista vacía = ítem válido."""
    errors = []
    if not item.get("nbr_code"):
        errors.append("nbr_code vacío")
    elif not _CODE_RE.match(item["nbr_code"].replace("_UNCERTAIN", "")):
        errors.append(f"nbr_code con formato inválido: {item['nbr_code']!r}")

    if not item.get("description_es"):
        errors.append("description_es vacío")

    if not item.get("unit"):
        errors.append("unit vacío")

    for i, comp in enumerate(item.get("components", [])):
        if not comp.get("nbr_code"):
            errors.append(f"componente {i}: nbr_code vacío")
        if comp.get("quantity", 0) <= 0:
            errors.append(f"componente {i}: quantity inválida ({comp.get('quantity')})")

    return errors


def _infer_facet(nbr_code: str) -> str:
    """Extrae la faceta (ej. '3E', '2N', '3R') del código NBR."""
    return nbr_code.split()[0] if nbr_code else ""


def _infer_parent_nbr_code(nbr_code: str) -> str | None:
    """Infiere el código padre truncando el último segmento no-cero.

    Ej: "3E 04 07 01 00 00" → "3E 04 07 00 00 00"
    Si todos los segmentos son cero o hay solo uno, devuelve None.
    """
    parts = nbr_code.split()
    if len(parts) <= 1:
        return None

    # Encontrar el último segmento distinto de "00"
    last_nonzero = -1
    for i in range(len(parts) - 1, 0, -1):
        if parts[i] != "00":
            last_nonzero = i
            break

    if last_nonzero <= 0:
        return None

    parent_parts = parts[:last_nonzero] + ["00"] * (len(parts) - last_nonzero)
    return " ".join(parent_parts)


def upsert_catalog_item(cur: sqlite3.Cursor, item: dict, source: str = "etl_tcpo") -> str:
    """Inserta o actualiza un ítem en catalog_items. Devuelve el id."""
    cur.execute("SELECT id FROM catalog_items WHERE nbr_code = ?", (item["nbr_code"],))
    row = cur.fetchone()

    if row:
        cur.execute(
            """UPDATE catalog_items SET
               description_es  = ?,
               description_pt  = ?,
               unit             = ?,
               is_work_item     = 1,
               fuente_factores  = 'tcpo_v15',
               modificado_por   = ?,
               updated_at       = ?
               WHERE id = ?""",
            (
                item["description_es"],
                item.get("description_pt", item["description_es"]),
                item["unit"],
                source,
                _now(),
                row[0],
            ),
        )
        return row[0]

    item_id = _uuid()
    facet = _infer_facet(item["nbr_code"])
    parent = _infer_parent_nbr_code(item["nbr_code"])

    cur.execute(
        """INSERT INTO catalog_items
           (id, nbr_code, facet, description_pt, description_es, unit,
            unit_price, currency, fuente_precios, fuente_factores,
            bim_taggable, relevant_py, oficial, uuid_status,
            creado_por, classification_source, confidence,
            parent_nbr_code, modificado_por, is_work_item,
            created_at, updated_at)
           VALUES (?,?,?,?,?,?,NULL,NULL,NULL,'tcpo_v15',?,1,1,'provisional',?,
                   'v15_official',90,?,NULL,1,?,?)""",
        (
            item_id,
            item["nbr_code"],
            facet,
            item.get("description_pt", item["description_es"]),
            item["description_es"],
            item["unit"],
            1 if facet in ("3E", "4U", "2C") else 0,  # bim_taggable
            source,
            parent,
            _now(),
            _now(),
        ),
    )
    return item_id


def load_items(db_path: Path, items: list[dict], source: str = "etl_tcpo") -> dict:
    """Carga una lista de ítems validados en la base de datos.

    Args:
        db_path: Ruta al archivo SQLite.
        items: Lista de dicts con esquema de ítem (ya validados).
        source: Identificador del proceso de carga (para auditoría).

    Returns:
        Dict con estadísticas: {"inserted": int, "updated": int, "apu_rows": int, "errors": list}
    """
    stats = {"inserted": 0, "updated": 0, "apu_rows": 0, "errors": []}

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    for item in items:
        errors = validate_item(item)
        if errors:
            stats["errors"].append({"nbr_code": item.get("nbr_code"), "errors": errors})
            continue

        try:
            # ¿Es nuevo o existente?
            cur.execute("SELECT id FROM catalog_items WHERE nbr_code = ?", (item["nbr_code"],))
            existing = cur.fetchone()

            parent_id = upsert_catalog_item(cur, item, source)

            if existing:
                stats["updated"] += 1
            else:
                stats["inserted"] += 1

            # Insertar componentes APU
            # Borrar los existentes para este ítem padre (idempotente)
            cur.execute("DELETE FROM apu_components WHERE item_id = ?", (parent_id,))

            for comp in item.get("components", []):
                comp_id = upsert_catalog_item(cur, comp, source)

                cur.execute(
                    """INSERT INTO apu_components
                       (id, item_id, component_id, quantity, unit, source)
                       VALUES (?,?,?,?,?,?)""",
                    (_uuid(), parent_id, comp_id, comp["quantity"], comp["unit"], "tcpo_v15"),
                )
                stats["apu_rows"] += 1

        except Exception as e:  # noqa: BLE001
            stats["errors"].append({"nbr_code": item.get("nbr_code"), "errors": [str(e)]})
            conn.rollback()
            continue

    conn.commit()
    conn.close()
    return stats
