"""
Modelos de validación del módulo budget (ADR-009).

El módulo budget es de solo lectura: no posee tablas propias.
Lee de project_library JOIN catalog_items.
"""

from decimal import Decimal

from sqlmodel import SQLModel


# Re-exportar MarkupLine para que budget pueda incluirlo en sus summaries.
from markups.models import MarkupLine  # noqa: F401


class BudgetRow(SQLModel):
    """Fila del presupuesto: un ítem de la biblioteca con cantidad y subtotal."""

    entry_id: str           # project_library.id
    item_id: str
    nbr_code: str
    facet: str
    description_es: str
    unit: str
    unit_price: Decimal | None
    currency: str | None
    fuente_precios: str | None
    manual_quantity: Decimal | None
    subtotal: Decimal | None  # unit_price × manual_quantity, NULL si alguno es NULL


class BudgetSummary(SQLModel):
    """Resumen del presupuesto de un proyecto."""

    project_id: str
    rows: list[BudgetRow]
    total: Decimal              # costo directo (suma de subtotals)
    items_count: int
    items_without_price: int
    items_without_quantity: int
    markups: list[MarkupLine] = []   # markups calculados en orden
    grand_total: Decimal = Decimal("0")  # total final con markups


class IfcBudgetRow(SQLModel):
    """Fila de presupuesto desde IFC: ítem asignado + cantidad calculada en runtime."""

    item_id: str
    nbr_code: str
    facet: str
    description_es: str
    unit: str
    unit_price: Decimal | None
    currency: str | None
    fuente_precios: str | None
    computed_quantity: Decimal | None
    elements_count: int
    subtotal: Decimal | None


class IfcBudgetSummary(SQLModel):
    """Resumen del presupuesto calculado desde mapeo IFC (project_assignments)."""

    project_id: str
    rows: list[IfcBudgetRow]
    total: Decimal              # costo directo
    items_count: int
    items_without_price: int
    items_without_quantity: int
    markups: list[MarkupLine] = []
    grand_total: Decimal = Decimal("0")
