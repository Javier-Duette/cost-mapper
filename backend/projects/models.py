"""
Modelos SQLModel del módulo projects (ADR-009).

Referencia: docs/MODELO-DE-DATOS.md sección 3.
"""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Tabla
# ---------------------------------------------------------------------------

class Project(SQLModel, table=True):
    """Proyecto de construcción.

    Tabla raíz del sistema de presupuesto. Todos los módulos project-scoped
    (library, ifc_elements, assignments) apuntan aquí.
    """

    __tablename__ = "projects"

    id: str = Field(default_factory=_uuid, primary_key=True, max_length=36)
    name: str = Field(max_length=200, description="Nombre del proyecto.")
    description: str | None = Field(default=None, description="Descripción libre.")
    location: str | None = Field(default=None, max_length=200)
    type: str = Field(
        default="residencial",
        max_length=50,
        description="'residencial' | 'comercial' | 'infraestructura' | 'industrial'",
    )
    currency: str = Field(
        default="PYG",
        max_length=3,
        description="Moneda base del presupuesto. 'PYG' | 'USD'",
    )
    ifc_file_path: str | None = Field(default=None, description="Ruta al último IFC importado.")
    ifc_imported_at: datetime | None = Field(default=None)

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# Modelos de validación
# ---------------------------------------------------------------------------

class ProjectCreate(SQLModel):
    name: str = Field(max_length=200)
    description: str | None = None
    location: str | None = None
    type: str = "residencial"
    currency: str = "PYG"


class ProjectUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    type: str | None = None
    currency: str | None = None


class ProjectRead(SQLModel):
    id: str
    name: str
    description: str | None
    location: str | None
    type: str
    currency: str
    ifc_file_path: str | None
    ifc_imported_at: datetime | None
    created_at: datetime
    updated_at: datetime
