"""
Modelos SQLModel del módulo ifc_importer (ADR-009).

Tabla: ifc_elements
Referencia: docs/MODELO-DE-DATOS.md sección 5 y docs/planes/PLAN_MAPEO_IFC.md
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Column, UniqueConstraint
from sqlalchemy.types import JSON as SAJSON
from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def snapshot_md5(snapshot: Any) -> str:
    """Hash estable del snapshot cualitativo (MD5 sobre JSON canonical)."""
    # Nota: algunos extractores (ej: web-ifc fallback) incluyen ids efímeros
    # como `express_id` que no deben disparar falsos "conflicts" entre reimports.
    data = snapshot or {}
    if isinstance(data, dict) and "express_id" in data:
        data = {k: v for k, v in data.items() if k != "express_id"}
    payload = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.md5(payload).hexdigest()


class IfcElement(SQLModel, table=True):
    """Elemento IFC importado/seedeado para un proyecto."""

    __tablename__ = "ifc_elements"
    __table_args__ = (
        UniqueConstraint("project_id", "global_id", name="uq_ifc_elements_project_global_id"),
    )

    id: str = Field(default_factory=_uuid, primary_key=True, max_length=36)
    project_id: str = Field(foreign_key="projects.id", index=True, max_length=36)

    global_id: str = Field(max_length=64, index=True, description="GlobalId IFC del elemento.")
    ifc_type: str = Field(max_length=100, description="Clase IFC. Ej: IfcWall")
    ifc_name: str | None = Field(default=None, description="Nombre del elemento en el modelo.")
    ifc_level: str | None = Field(default=None, description="Nivel/planta del modelo.")

    nbr_classification: str | None = Field(
        default=None,
        max_length=50,
        description="Código NBR extraído del IFC (nullable).",
    )

    qualitative_snapshot: dict[str, Any] = Field(default_factory=dict, sa_column=Column(SAJSON))
    geometry_hash: str = Field(default="", max_length=32, index=True, description="MD5 del snapshot serializado.")

    last_import_at: datetime = Field(default_factory=_now, index=True)
    status: str = Field(default="active", max_length=20, index=True, description="'active' | 'deleted'")


# ---------------------------------------------------------------------------
# Modelos de validación
# ---------------------------------------------------------------------------


class IfcImportSummary(SQLModel):
    total_elements: int
    with_nbr_classification: int
    without_nbr_classification: int


class IfcElementSeed(SQLModel):
    global_id: str
    ifc_type: str
    ifc_name: str | None = None
    ifc_level: str | None = None
    nbr_classification: str | None = None
    qualitative_snapshot: dict[str, Any] = Field(default_factory=dict)


class IfcElementsSeedRequest(SQLModel):
    elements: list[IfcElementSeed]
    full_sync: bool = True
    # Permite hacer full_sync en modo chunked: el backend marca como deleted
    # todo elemento activo cuyo global_id NO esté en `all_global_ids`.
    # Si se omite, el comportamiento es el clásico: el set de sync es el de `elements`.
    all_global_ids: list[str] | None = None


class IfcElementRead(SQLModel):
    id: str
    project_id: str
    global_id: str
    ifc_type: str
    ifc_name: str | None
    ifc_level: str | None
    nbr_classification: str | None
    geometry_hash: str
    status: str
    last_import_at: datetime


class IfcElementsListResponse(SQLModel):
    items: list[IfcElementRead]
    total: int
    offset: int
    limit: int
