# -*- coding: utf-8 -*-
"""
Service del modulo budget - logica de negocio.
"""

from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException
from sqlmodel import Session

from projects import service as projects_service

from .models import BudgetSummary, IfcBudgetRow, IfcBudgetSummary
from . import repository


# ---------------------------------------------------------------------------
# Mapa de tipos IFC -> (unidad normalizada, QTO keys a intentar en orden).
# None como valor de keys significa "count = 1" (p.ej. puertas, ventanas).
# ---------------------------------------------------------------------------
_QTO_MAP: dict[tuple[str, str], list[str] | None] = {
    ("IfcWall", "m2"):                  ["NetSideArea", "GrossSideArea", "NetArea", "GrossArea", "Area"],
    ("IfcWallStandardCase", "m2"):      ["NetSideArea", "GrossSideArea", "NetArea", "GrossArea", "Area"],
    ("IfcSlab", "m2"):                  ["NetArea", "GrossArea", "ProjectedArea", "Area"],
    ("IfcRoof", "m2"):                  ["NetArea", "GrossArea", "Area"],
    ("IfcCovering", "m2"):              ["NetArea", "GrossArea", "Area"],
    ("IfcStair", "m2"):                 ["NetArea", "GrossArea", "Area"],
    ("IfcRamp", "m2"):                  ["NetArea", "GrossArea", "Area"],
    ("IfcColumn", "m"):                 ["Length"],
    ("IfcColumnStandardCase", "m"):     ["Length"],
    ("IfcColumn", "m3"):                ["NetVolume", "GrossVolume"],
    ("IfcColumnStandardCase", "m3"):    ["NetVolume", "GrossVolume"],
    ("IfcBeam", "m"):                   ["Length", "Span"],
    ("IfcBeamStandardCase", "m"):       ["Length", "Span"],
    ("IfcBeam", "m3"):                  ["NetVolume", "GrossVolume"],
    ("IfcBeamStandardCase", "m3"):      ["NetVolume", "GrossVolume"],
    ("IfcPile", "m"):                   ["Length"],
    ("IfcPile", "m3"):                  ["NetVolume", "GrossVolume"],
    ("IfcFooting", "m3"):               ["NetVolume", "GrossVolume"],
    ("IfcDoor", "un"):                  None,   # count = 1
    ("IfcWindow", "un"):                None,   # count = 1
    ("IfcFurnishingElement", "un"):     None,
    ("IfcFurniture", "un"):             None,
    ("IfcMember", "m"):                 ["Length"],
    ("IfcMember", "m3"):                ["NetVolume", "GrossVolume"],
}


def get_budget(session: Session, project_id: str) -> BudgetSummary:
    return repository.get_budget(session, project_id)


def get_budget_ifc(session: Session, project_id: str) -> IfcBudgetSummary:
    """Calcula presupuesto desde asignaciones IFC (project_assignments).

    Reglas MVP:
    - Cantidades NO se persisten: se calculan en runtime desde el IFC.
    - Para un elemento con multiples asignaciones, se prioriza `user` sobre `ifc_classification`.
    - Tipos soportados: IfcWall/IfcSlab/IfcRoof/IfcCovering (m2), IfcColumn/IfcBeam/IfcPile/IfcMember
      (m o m3), IfcFooting (m3), IfcDoor/IfcWindow/IfcFurnishingElement/IfcFurniture (un=count 1).
    """
    project = projects_service.get_project(session, project_id)
    if not project.ifc_file_path:
        raise HTTPException(status_code=400, detail="Proyecto sin IFC importado.")

    try:
        import ifcopenshell  # type: ignore
        import ifcopenshell.util.element as ifc_element_util  # type: ignore
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=503, detail=f"ifcopenshell no disponible: {e}")

    try:
        model = ifcopenshell.open(project.ifc_file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo abrir el IFC del proyecto: {e}")

    assignments = repository.list_active_assignments_with_element_and_item(session, project_id=project_id)
    if not assignments:
        return IfcBudgetSummary(
            project_id=project_id,
            rows=[],
            total=Decimal("0"),
            items_count=0,
            items_without_price=0,
            items_without_quantity=0,
        )

    # Elegir 1 asignacion por elemento (user > ifc_classification)
    by_element: dict[str, list[repository.AssignmentElementItem]] = {}
    for row in assignments:
        by_element.setdefault(row.element.id, []).append(row)

    chosen: list[repository.AssignmentElementItem] = []
    for element_id, rows in by_element.items():
        user = [r for r in rows if r.assignment.classification_source == "user"]
        if user:
            chosen.append(user[0])
            continue
        auto = [r for r in rows if r.assignment.classification_source == "ifc_classification"]
        if auto:
            chosen.append(auto[0])

    def _decimal_or_none(value) -> Decimal | None:
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except Exception:
            return None

    def _normalize_unit(unit: str | None) -> str:
        if unit is None:
            return ""
        s = unit.strip().lower().replace(" ", "")
        # Normalizacion defensiva ante strings mal decodificados (p.ej. "mA2" -> "m2").
        s = s.replace("â", "")
        s = s.replace("²", "2").replace("^2", "2")
        s = s.replace("³", "3").replace("^3", "3")
        # Aliases de unidades de area
        if s in ("m²", "mcuadrado", "msq", "m2"):
            return "m2"
        # Aliases de unidades de volumen
        if s in ("m³", "mcubico", "m3"):
            return "m3"
        # Aliases de unidades lineales
        if s in ("ml", "mlineal", "m"):
            return "m"
        # Aliases de unidades de conteo
        if s in ("un", "und", "unidad", "pza", "pieza", "gl", "global"):
            return "un"
        # Aliases de masa
        if s == "kg":
            return "kg"
        # Aliases de volumen liquido
        if s in ("l", "lt", "litro"):
            return "l"
        # Aliases de tiempo
        if s in ("h", "hr", "hora"):
            return "h"
        # Aliases de bolsas
        if s in ("bls", "bolsa"):
            return "bls"
        return s

    def _read_qto(ent, keys: list[str]) -> Decimal | None:
        """Lee el primer valor numerico encontrado de la lista de keys en los QTO del elemento."""
        try:
            psets = ifc_element_util.get_psets(ent, qtos_only=True)
            if not psets:
                return None
            for pset_data in psets.values():
                if not isinstance(pset_data, dict):
                    continue
                for k in keys:
                    val = pset_data.get(k)
                    if val is not None:
                        d = _decimal_or_none(val)
                        if d is not None:
                            return round(d, 3)
        except Exception:
            pass
        return None

    def _quantity_for_element(global_id: str, ifc_type: str, unit: str) -> Decimal | None:
        ent = model.by_guid(global_id)
        if ent is None:
            return None
        norm = _normalize_unit(unit)
        lookup_key = (ifc_type, norm)
        if lookup_key not in _QTO_MAP:
            return None  # tipo/unidad no mapeados
        keys = _QTO_MAP[lookup_key]
        if keys is None:
            # Explicitamente mapeado como count = 1 (p.ej. IfcDoor en "un")
            return Decimal("1")
        return _read_qto(ent, keys)

    # Agrupar por item
    sums: dict[str, dict] = {}
    for r in chosen:
        qty = _quantity_for_element(r.element.global_id, r.element.ifc_type, r.item.unit)
        acc = sums.setdefault(
            r.item.id,
            {
                "item": r.item,
                "qty": Decimal("0"),
                "any_qty": False,
                "elements": 0,
            },
        )
        acc["elements"] += 1
        if qty is not None:
            acc["qty"] += qty
            acc["any_qty"] = True

    rows: list[IfcBudgetRow] = []
    total = Decimal("0")
    without_price = 0
    without_qty = 0

    for item_id, data in sums.items():
        item = data["item"]
        elements_count = int(data["elements"])
        computed_quantity = data["qty"] if data["any_qty"] else None

        subtotal: Decimal | None = None
        if item.unit_price is not None and computed_quantity is not None:
            subtotal = item.unit_price * computed_quantity
            total += subtotal

        if item.unit_price is None:
            without_price += 1
        if computed_quantity is None:
            without_qty += 1

        rows.append(
            IfcBudgetRow(
                item_id=item.id,
                nbr_code=item.nbr_code,
                facet=item.facet,
                description_es=item.description_es,
                unit=item.unit,
                unit_price=item.unit_price,
                currency=item.currency,
                fuente_precios=item.fuente_precios,
                computed_quantity=computed_quantity,
                elements_count=elements_count,
                subtotal=subtotal,
            )
        )

    rows.sort(key=lambda r: (r.facet, r.nbr_code))

    return IfcBudgetSummary(
        project_id=project_id,
        rows=rows,
        total=total,
        items_count=len(rows),
        items_without_price=without_price,
        items_without_quantity=without_qty,
    )
