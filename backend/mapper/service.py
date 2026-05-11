"""
Service del módulo mapper — lógica de negocio.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlmodel import Session

from catalog.models import CatalogItem
from ifc_importer.models import IfcElement, snapshot_md5
from projects import service as projects_service

from .models import (
    AssignmentCreate,
    AssignmentRead,
    AutoAssignSummary,
    CatalogItemSummary,
    MappingSuggestion,
    ProjectAssignment,
)
from . import repository


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_nbr_code(raw: str) -> str:
    code = (raw or "").replace(".", " ").strip()
    # colapsar múltiples espacios
    parts = [p for p in code.split(" ") if p]
    return " ".join(parts)


def list_mapping_elements(
    session: Session,
    *,
    project_id: str,
    tab: str,
    offset: int,
    limit: int,
    query: str | None,
) -> dict:
    projects_service.get_project(session, project_id)

    if tab not in {"auto", "unassigned", "conflicts"}:
        raise HTTPException(status_code=400, detail="tab inválido. Use auto|unassigned|conflicts.")

    # Para conflicts, filtramos por hash en Python (MVP) y aplicamos paginación luego.
    if tab == "conflicts":
        candidates = repository.list_elements_for_tab(
            session,
            project_id=project_id,
            tab=tab,
            offset=0,
            limit=5000,
            query=query,
        )
        candidate_ids = [e.id for e in candidates]
        assignments = repository.list_assignments_for_elements(session, project_id=project_id, element_ids=candidate_ids)
        by_element: dict[str, list[ProjectAssignment]] = {}
        for a in assignments:
            by_element.setdefault(a.ifc_element_id, []).append(a)

        conflicts: list[IfcElement] = []
        for element in candidates:
            element_assignments = [a for a in by_element.get(element.id, []) if a.classification_source == "user"]
            if not element_assignments:
                continue
            # Conflicto si cualquier asignación user tiene snapshot hash distinto al actual
            if any(snapshot_md5(a.qualitative_snapshot_at_assignment) != element.geometry_hash for a in element_assignments):
                conflicts.append(element)

        total = len(conflicts)
        page = conflicts[offset : offset + limit]
        element_ids = [e.id for e in page]
        page_assignments = [a for a in assignments if a.ifc_element_id in set(element_ids)]
        return _build_mapping_response(session, project_id=project_id, elements=page, assignments=page_assignments, offset=offset, limit=limit, total=total)

    elements = repository.list_elements_for_tab(
        session,
        project_id=project_id,
        tab=tab,
        offset=offset,
        limit=limit,
        query=query,
    )
    total = repository.count_elements_for_tab(session, project_id=project_id, tab=tab, query=query)

    element_ids = [e.id for e in elements]
    assignments = repository.list_assignments_for_elements(session, project_id=project_id, element_ids=element_ids)
    return _build_mapping_response(session, project_id=project_id, elements=elements, assignments=assignments, offset=offset, limit=limit, total=total)


def _build_mapping_response(
    session: Session,
    *,
    project_id: str,
    elements: list[IfcElement],
    assignments: list[ProjectAssignment],
    offset: int,
    limit: int,
    total: int,
) -> dict:
    # Cache de Ã­tems de catÃ¡logo para enriquecer asignaciones (UX MVP)
    item_ids = sorted({a.item_id for a in assignments})
    items_by_id: dict[str, CatalogItem] = {}
    if item_ids:
        from sqlmodel import select

        items = session.exec(select(CatalogItem).where(CatalogItem.id.in_(item_ids))).all()
        items_by_id = {i.id: i for i in items}

    assignments_by_element: dict[str, list[ProjectAssignment]] = {}
    for a in assignments:
        assignments_by_element.setdefault(a.ifc_element_id, []).append(a)

    rows = []
    for element in elements:
        element_assignments = assignments_by_element.get(element.id, [])
        suggestions = _suggest_for_element(session, project_id=project_id, element=element)

        rows.append(
            {
                "element": element.model_dump(),
                "assignments": [
                    AssignmentRead(
                        **AssignmentRead.model_validate(a).model_dump(exclude={"item"}),
                        item=(
                            CatalogItemSummary.model_validate(items_by_id[a.item_id])
                            if a.item_id in items_by_id
                            else None
                        ),
                    )
                    for a in element_assignments
                ],
                "suggestions": suggestions,
            }
        )

    return {"items": rows, "total": total, "offset": offset, "limit": limit}


def _suggest_for_element(
    session: Session,
    *,
    project_id: str,
    element: IfcElement,
) -> list[MappingSuggestion]:
    # Regla 1: match exacto por NBR (100)
    if element.nbr_classification:
        normalized = _normalize_nbr_code(element.nbr_classification)
        exact = repository.suggestions_by_exact_nbr_code(session, nbr_code=normalized, limit=5)
        if exact:
            return [
                MappingSuggestion(
                    item_id=i.id,
                    nbr_code=i.nbr_code,
                    facet=i.facet,
                    description_es=i.description_es,
                    unit=i.unit,
                    confidence=Decimal("100.00"),
                )
                for i in exact
            ]

        # Regla 2: prefijo simple (70)
        prefix = repository.suggestions_by_prefix_nbr_code(session, nbr_code_prefix=normalized, limit=5)
        if prefix:
            return [
                MappingSuggestion(
                    item_id=i.id,
                    nbr_code=i.nbr_code,
                    facet=i.facet,
                    description_es=i.description_es,
                    unit=i.unit,
                    confidence=Decimal("70.00"),
                )
                for i in prefix
            ]

    # Fallback: ítems de la biblioteca del proyecto (30)
    library_items = repository.suggestions_from_project_library(session, project_id=project_id, limit=5)
    return [
        MappingSuggestion(
            item_id=i.id,
            nbr_code=i.nbr_code,
            facet=i.facet,
            description_es=i.description_es,
            unit=i.unit,
            confidence=Decimal("30.00"),
        )
        for i in library_items
    ]


def create_assignment(
    session: Session,
    *,
    project_id: str,
    data: AssignmentCreate,
) -> ProjectAssignment:
    projects_service.get_project(session, project_id)

    element = session.get(IfcElement, data.ifc_element_id)
    if not element or element.project_id != project_id:
        raise HTTPException(status_code=404, detail="Elemento IFC no encontrado para el proyecto.")

    item = session.get(CatalogItem, data.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Ítem de catálogo no encontrado.")

    existing = repository.get_assignment_by_element_and_item(session, ifc_element_id=element.id, item_id=item.id)
    if existing:
        raise HTTPException(status_code=409, detail="La asignación ya existe para este elemento e ítem.")

    now = _now()
    assignment = ProjectAssignment(
        project_id=project_id,
        ifc_element_id=element.id,
        item_id=item.id,
        classification_source="user",
        confidence=None,
        qualitative_snapshot_at_assignment=element.qualitative_snapshot or {},
        unit_price=item.unit_price,
        price_updated_at=now if item.unit_price is not None else None,
        assigned_at=now,
    )
    return repository.create_assignment(session, assignment)


def delete_assignment(session: Session, *, project_id: str, assignment_id: str) -> None:
    projects_service.get_project(session, project_id)
    assignment = repository.get_assignment(session, assignment_id)
    if not assignment or assignment.project_id != project_id:
        raise HTTPException(status_code=404, detail="Asignación no encontrada.")
    repository.delete_assignment(session, assignment)


def auto_assign_from_ifc_classification(session: Session, *, project_id: str) -> AutoAssignSummary:
    """
    Crea asignaciones automáticas por match exacto de `IfcElement.nbr_classification`.

    Reglas MVP:
    - Si el elemento ya tiene al menos una asignación `user`, no se toca (no se pisa).
    - No duplica asignaciones existentes (uq por elemento+ítem).
    - Solo usa match exacto contra `CatalogItem.nbr_code` (work items).
    """
    projects_service.get_project(session, project_id)

    elements = repository.list_active_elements_with_nbr_classification(session, project_id=project_id)
    if not elements:
        return AutoAssignSummary(created=0, skipped_user=0, skipped_existing=0, no_match=0)

    element_ids = [e.id for e in elements]
    assignments = repository.list_assignments_for_elements(session, project_id=project_id, element_ids=element_ids)
    assignments_by_element: dict[str, list[ProjectAssignment]] = {}
    for a in assignments:
        assignments_by_element.setdefault(a.ifc_element_id, []).append(a)

    nbr_codes = sorted(
        {
            _normalize_nbr_code(e.nbr_classification or "")
            for e in elements
            if (e.nbr_classification or "").strip()
        }
    )
    items = repository.work_items_by_exact_nbr_codes(session, nbr_codes=nbr_codes)
    items_by_nbr: dict[str, CatalogItem] = {}
    for item in items:
        items_by_nbr.setdefault(item.nbr_code, item)

    created = 0
    skipped_user = 0
    skipped_existing = 0
    no_match = 0
    now = _now()

    for element in elements:
        normalized = _normalize_nbr_code(element.nbr_classification or "")
        if not normalized:
            continue

        existing_for_element = assignments_by_element.get(element.id, [])
        if any(a.classification_source == "user" for a in existing_for_element):
            skipped_user += 1
            continue

        item = items_by_nbr.get(normalized)
        if not item:
            no_match += 1
            continue

        if any(a.item_id == item.id for a in existing_for_element):
            skipped_existing += 1
            continue

        assignment = ProjectAssignment(
            project_id=project_id,
            ifc_element_id=element.id,
            item_id=item.id,
            classification_source="ifc_classification",
            confidence=Decimal("100.00"),
            qualitative_snapshot_at_assignment=element.qualitative_snapshot or {},
            unit_price=item.unit_price,
            price_updated_at=now if item.unit_price is not None else None,
            assigned_at=now,
        )
        repository.create_assignment(session, assignment)
        assignments_by_element.setdefault(element.id, []).append(assignment)
        created += 1

    return AutoAssignSummary(
        created=created,
        skipped_user=skipped_user,
        skipped_existing=skipped_existing,
        no_match=no_match,
    )
