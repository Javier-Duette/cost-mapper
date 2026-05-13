"""
Service del modulo markups - logica de negocio.

Orquesta repository y aplica reglas de calculo.
"""

from decimal import Decimal

from fastapi import HTTPException
from sqlmodel import Session

from markups import repository
from markups.models import (
    MarkupLine,
    ProjectMarkup,
    ProjectMarkupCreate,
    ProjectMarkupRead,
    ProjectMarkupUpdate,
    _uuid,
    _now,
)


# Configuracion de defaults para presupuesto paraguayo tipico.
# GG y utilidad se aplican sobre costo directo; IVA sobre el total acumulado.
_DEFAULTS = [
    {
        "name": "Gastos Generales",
        "markup_type": "percentage",
        "category": "overhead",
        "percentage": Decimal("12.000"),
        "apply_to": "direct_cost",
        "sort_order": 1,
    },
    {
        "name": "Utilidad",
        "markup_type": "percentage",
        "category": "profit",
        "percentage": Decimal("10.000"),
        "apply_to": "direct_cost",
        "sort_order": 2,
    },
    {
        "name": "IVA 10%",
        "markup_type": "percentage",
        "category": "tax",
        "percentage": Decimal("10.000"),
        "apply_to": "cumulative",
        "sort_order": 3,
    },
]


def list_markups(session: Session, project_id: str) -> list[ProjectMarkupRead]:
    markups = repository.list_by_project(session, project_id)
    return [ProjectMarkupRead.model_validate(m) for m in markups]


def get_markup(session: Session, markup_id: str) -> ProjectMarkup:
    markup = repository.get_by_id(session, markup_id)
    if not markup:
        raise HTTPException(status_code=404, detail=f"Markup {markup_id} no encontrado.")
    return markup


def create_markup(session: Session, project_id: str, data: ProjectMarkupCreate) -> ProjectMarkupRead:
    markup = ProjectMarkup(
        id=_uuid(),
        project_id=project_id,
        name=data.name,
        markup_type=data.markup_type,
        category=data.category,
        percentage=data.percentage,
        fixed_amount=data.fixed_amount,
        apply_to=data.apply_to,
        sort_order=data.sort_order,
        is_active=data.is_active,
        created_at=_now(),
        updated_at=_now(),
    )
    result = repository.create(session, markup)
    return ProjectMarkupRead.model_validate(result)


def update_markup(session: Session, markup_id: str, data: ProjectMarkupUpdate) -> ProjectMarkupRead:
    markup = get_markup(session, markup_id)
    result = repository.update(session, markup, data)
    return ProjectMarkupRead.model_validate(result)


def delete_markup(session: Session, markup_id: str) -> None:
    markup = get_markup(session, markup_id)
    repository.delete(session, markup)


def seed_defaults(session: Session, project_id: str) -> list[ProjectMarkupRead]:
    """Siembra los 3 markups tipicos paraguayos si el proyecto no tiene ninguno.

    Solo se ejecuta si el proyecto no tiene markups aun.
    """
    if repository.count_by_project(session, project_id) > 0:
        return list_markups(session, project_id)

    results = []
    for cfg in _DEFAULTS:
        markup = ProjectMarkup(
            id=_uuid(),
            project_id=project_id,
            created_at=_now(),
            updated_at=_now(),
            **cfg,
        )
        results.append(repository.create(session, markup))

    return [ProjectMarkupRead.model_validate(m) for m in results]


def apply_markups(
    session: Session,
    project_id: str,
    direct_cost: Decimal,
) -> tuple[list[MarkupLine], Decimal]:
    """Aplica los markups activos de un proyecto sobre el costo directo.

    Retorna (lineas_detalladas, total_final).

    Logica:
    - 'direct_cost': porcentaje sobre el costo directo original.
    - 'cumulative': porcentaje sobre el running total (costo directo + markups previos).
    Los markups se procesan en sort_order ascendente.
    """
    markups = repository.list_by_project(session, project_id, active_only=True)
    lines: list[MarkupLine] = []
    running = direct_cost

    for m in markups:
        if m.markup_type == "percentage" and m.percentage is not None:
            base = direct_cost if m.apply_to == "direct_cost" else running
            amount = (base * m.percentage / Decimal("100")).quantize(Decimal("1"))
        elif m.markup_type == "fixed" and m.fixed_amount is not None:
            base = running
            amount = m.fixed_amount.quantize(Decimal("1"))
        else:
            continue  # markup mal configurado, saltar

        lines.append(MarkupLine(
            id=m.id,
            name=m.name,
            category=m.category,
            base=base,
            rate=m.percentage,
            amount=amount,
        ))
        running += amount

    grand_total = running.quantize(Decimal("1"))
    return lines, grand_total
