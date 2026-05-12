"""
Service del mÃ³dulo budget â€” lÃ³gica de negocio.
"""

from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException
from sqlmodel import Session

from projects import service as projects_service

from .models import BudgetSummary, IfcBudgetRow, IfcBudgetSummary
from . import repository


def get_budget(session: Session, project_id: str) -> BudgetSummary:
    return repository.get_budget(session, project_id)


def get_budget_ifc(session: Session, project_id: str) -> IfcBudgetSummary:
    """Calcula presupuesto desde asignaciones IFC (project_assignments).

    Reglas MVP:
    - Cantidades NO se persisten: se calculan en runtime desde el IFC.
    - Para un elemento con múltiples asignaciones, se prioriza `user` sobre `ifc_classification`.
    - En esta iteración: `IfcWall` se computa en m² (best-effort vía QTO) y solo si el ítem está en m².
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

    # Elegir 1 asignación por elemento (user > ifc_classification)
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
        # Normalización defensiva ante strings mal decodificados (p.ej. "mÂ²" -> "m2").
        s = s.replace("â", "")
        s = s.replace("²", "2").replace("^2", "2")
        s = s.replace("³", "3").replace("^3", "3")
        return s

    def _wall_area_m2(ifc_entity) -> Decimal | None:
        qsets = ifc_element_util.get_psets(ifc_entity, qtos_only=True) or {}
        for qset in qsets.values():
            if not isinstance(qset, dict):
                continue
            for key in ("NetSideArea", "GrossSideArea", "NetArea", "GrossArea", "Area"):
                if key in qset:
                    d = _decimal_or_none(qset.get(key))
                    if d is not None:
                        return d
        return None

    def _quantity_for_element(global_id: str, ifc_type: str, unit: str) -> Decimal | None:
        ent = model.by_guid(global_id)
        if ent is None:
            return None
        if ifc_type == "IfcWall":
            if _normalize_unit(unit) != "m2":
                return None
            return _wall_area_m2(ent)
        return None

    # Agrupar por ítem
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
