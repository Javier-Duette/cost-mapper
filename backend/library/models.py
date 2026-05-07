"""
Modelos SQLModel del módulo library (ADR-009).

project_library: ítems preseleccionados para un proyecto.
Fuente del archivo de keynotes para Revit.
Referencia: docs/MODELO-DE-DATOS.md sección 4.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ProjectLibraryEntry(SQLModel, table=True):
    """Ítem preseleccionado para un proyecto.

    Representa la intención del usuario de usar un ítem en el proyecto,
    con una cantidad manual opcional para presupuesto pre-IFC.
    """

    __tablename__ = "project_library"

    id: str = Field(default_factory=_uuid, primary_key=True, max_length=36)
    project_id: str = Field(foreign_key="projects.id", index=True, max_length=36)
    item_id: str = Field(foreign_key="catalog_items.id", index=True, max_length=36)

    notes: str | None = Field(default=None, description="Nota del usuario.")

    # Cantidad manual para estimados pre-IFC (no en el modelo de datos oficial,
    # se usa hasta que el módulo IFC esté disponible).
    manual_quantity: Decimal | None = Field(
        default=None,
        max_digits=14,
        decimal_places=4,
        description="Cantidad manual. NULL cuando se calcula desde el modelo IFC.",
    )

    added_at: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# Modelos de validación
# ---------------------------------------------------------------------------

class LibraryEntryCreate(SQLModel):
    item_id: str
    notes: str | None = None
    manual_quantity: Decimal | None = None


class LibraryEntryUpdate(SQLModel):
    notes: str | None = None
    manual_quantity: Decimal | None = None


class LibraryEntryRead(SQLModel):
    id: str
    project_id: str
    item_id: str
    notes: str | None
    manual_quantity: Decimal | None
    added_at: datetime
