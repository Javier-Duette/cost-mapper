"""
Modelos del modulo markups (ADR-009).

ProjectMarkup (table=True) -> tabla project_markups.
Modelos de validacion y respuesta sin table=True.

Referencia: docs/MODELO-DE-DATOS.md seccion 7.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ProjectMarkup(SQLModel, table=True):
    """Sobrecosto del presupuesto por proyecto.

    Permite configurar GG, utilidad, IVA e imprevistos con logica
    de aplicacion flexible (sobre costo directo o acumulativo).

    Referencia: MODELO-DE-DATOS.md seccion 7.
    """

    __tablename__ = "project_markups"

    id: str = Field(default_factory=_uuid, primary_key=True, max_length=36)
    project_id: str = Field(foreign_key="projects.id", index=True, max_length=36)

    name: str = Field(max_length=100, description="Ej: 'Gastos Generales', 'IVA 10%'")
    markup_type: str = Field(
        max_length=20, default="percentage",
        description="'percentage' | 'fixed'"
    )
    category: str = Field(
        max_length=20, default="overhead",
        description="'overhead' | 'profit' | 'tax' | 'contingency'"
    )
    percentage: Decimal | None = Field(
        default=None, max_digits=6, decimal_places=3,
        description="Porcentaje a aplicar. Ej: 10.000 para 10%. NULL si tipo fixed."
    )
    fixed_amount: Decimal | None = Field(
        default=None, max_digits=14, decimal_places=2,
        description="Monto fijo. NULL si tipo percentage."
    )
    apply_to: str = Field(
        max_length=20, default="direct_cost",
        description="'direct_cost' | 'cumulative'"
    )
    sort_order: int = Field(default=0, description="Orden de aplicacion (ascendente).")
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# Modelos de validacion (sin table=True)
# ---------------------------------------------------------------------------

class ProjectMarkupCreate(SQLModel):
    """Request body para crear un markup."""

    name: str = Field(max_length=100)
    markup_type: str = Field(max_length=20, default="percentage")
    category: str = Field(max_length=20, default="overhead")
    percentage: Decimal | None = None
    fixed_amount: Decimal | None = None
    apply_to: str = Field(max_length=20, default="direct_cost")
    sort_order: int = 0
    is_active: bool = True


class ProjectMarkupUpdate(SQLModel):
    """Request body para edicion parcial de un markup."""

    name: str | None = None
    markup_type: str | None = None
    category: str | None = None
    percentage: Decimal | None = None
    fixed_amount: Decimal | None = None
    apply_to: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ProjectMarkupRead(SQLModel):
    """Response model de un markup."""

    id: str
    project_id: str
    name: str
    markup_type: str
    category: str
    percentage: Decimal | None
    fixed_amount: Decimal | None
    apply_to: str
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MarkupLine(SQLModel):
    """Linea calculada de markup para el resumen del presupuesto."""

    id: str
    name: str
    category: str
    base: Decimal        # monto sobre el que se calcula
    rate: Decimal | None  # porcentaje (ej: Decimal("12.000")), None si es fixed
    amount: Decimal      # monto resultante = base * rate / 100 (o fixed_amount)
