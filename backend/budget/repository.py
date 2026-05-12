"""
Repository del módulo budget — queries de solo lectura.
"""

from decimal import Decimal

from sqlmodel import Session, select

from catalog.models import CatalogItem
from ifc_importer.models import IfcElement
from library.models import ProjectLibraryEntry
from mapper.models import ProjectAssignment
from .models import BudgetRow, BudgetSummary


def get_budget(session: Session, project_id: str) -> BudgetSummary:
    entries = session.exec(
        select(ProjectLibraryEntry).where(ProjectLibraryEntry.project_id == project_id)
    ).all()

    rows: list[BudgetRow] = []
    total = Decimal("0")
    without_price = 0
    without_qty = 0

    for entry in entries:
        item = session.get(CatalogItem, entry.item_id)
        if not item:
            continue

        subtotal: Decimal | None = None
        if item.unit_price is not None and entry.manual_quantity is not None:
            subtotal = item.unit_price * entry.manual_quantity
            total += subtotal

        if item.unit_price is None:
            without_price += 1
        if entry.manual_quantity is None:
            without_qty += 1

        rows.append(BudgetRow(
            entry_id=entry.id,
            item_id=item.id,
            nbr_code=item.nbr_code,
            facet=item.facet,
            description_es=item.description_es,
            unit=item.unit,
            unit_price=item.unit_price,
            currency=item.currency,
            fuente_precios=item.fuente_precios,
            manual_quantity=entry.manual_quantity,
            subtotal=subtotal,
        ))

    rows.sort(key=lambda r: (r.facet, r.nbr_code))

    return BudgetSummary(
        project_id=project_id,
        rows=rows,
        total=total,
        items_count=len(rows),
        items_without_price=without_price,
        items_without_quantity=without_qty,
    )


class AssignmentElementItem:
    """Row shape para presupuesto IFC: assignment + element + item."""

    def __init__(self, assignment: ProjectAssignment, element: IfcElement, item: CatalogItem):
        self.assignment = assignment
        self.element = element
        self.item = item


def list_active_assignments_with_element_and_item(session: Session, *, project_id: str) -> list[AssignmentElementItem]:
    statement = (
        select(ProjectAssignment, IfcElement, CatalogItem)
        .join(IfcElement, IfcElement.id == ProjectAssignment.ifc_element_id)
        .join(CatalogItem, CatalogItem.id == ProjectAssignment.item_id)
        .where(ProjectAssignment.project_id == project_id)
        .where(IfcElement.status == "active")
    )

    rows = session.exec(statement).all()
    result: list[AssignmentElementItem] = []
    for assignment, element, item in rows:
        result.append(AssignmentElementItem(assignment=assignment, element=element, item=item))
    return result
