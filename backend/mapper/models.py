"""
Modelos SQLModel del módulo mapper (ADR-009).

Tabla: project_assignments
Referencia: docs/MODELO-DE-DATOS.md sección 6 y docs/planes/PLAN_MAPEO_IFC.md
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import Column, UniqueConstraint
from sqlalchemy.types import JSON as SAJSON
from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ProjectAssignment(SQLModel, table=True):
    __tablename__ = "project_assignments"
    __table_args__ = (
        UniqueConstraint("ifc_element_id", "item_id", name="uq_project_assignments_element_item"),
    )

    id: str = Field(default_factory=_uuid, primary_key=True, max_length=36)

    project_id: str = Field(foreign_key="projects.id", index=True, max_length=36)
    ifc_element_id: str = Field(foreign_key="ifc_elements.id", index=True, max_length=36)
    item_id: str = Field(foreign_key="catalog_items.id", index=True, max_length=36)

    classification_source: str = Field(
        default="user",
        max_length=30,
        description="'ifc_classification' | 'user'",
    )
    confidence: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)

    qualitative_snapshot_at_assignment: dict[str, Any] = Field(default_factory=dict, sa_column=Column(SAJSON))

    unit_price: Decimal | None = Field(default=None, max_digits=14, decimal_places=2)
    price_updated_at: datetime | None = Field(default=None)

    fase_id: str | None = Field(default=None, max_length=36)
    assigned_by: str | None = Field(default=None, max_length=36)
    assigned_at: datetime = Field(default_factory=_now, index=True)


# ---------------------------------------------------------------------------
# Modelos de validación
# ---------------------------------------------------------------------------


class AssignmentCreate(SQLModel):
    ifc_element_id: str
    item_id: str


class AssignmentRead(SQLModel):
    id: str
    project_id: str
    ifc_element_id: str
    item_id: str
    classification_source: str
    confidence: Decimal | None
    unit_price: Decimal | None
    price_updated_at: datetime | None
    assigned_at: datetime
    item: "CatalogItemSummary | None" = None


class MappingSuggestion(SQLModel):
    item_id: str
    nbr_code: str
    description_es: str
    unit: str
    confidence: Decimal
    facet: str | None = None


class CatalogItemSummary(SQLModel):
    id: str
    nbr_code: str
    facet: str
    description_es: str
    unit: str


class MappingElementRow(SQLModel):
    element: dict
    assignments: list[AssignmentRead]
    suggestions: list[MappingSuggestion]


class MappingElementsResponse(SQLModel):
    items: list[MappingElementRow]
    total: int
    offset: int
    limit: int


class AutoAssignSummary(SQLModel):
    created: int
    skipped_user: int
    skipped_existing: int
    no_match: int
