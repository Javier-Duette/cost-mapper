"""
Repository del módulo mapper — queries DB sin lógica de negocio.
"""

from decimal import Decimal

from sqlmodel import Session, col, select

from catalog.models import CatalogItem
from ifc_importer.models import IfcElement
from library.models import ProjectLibraryEntry

from .models import ProjectAssignment


def list_assignments_for_elements(
    session: Session,
    *,
    project_id: str,
    element_ids: list[str],
) -> list[ProjectAssignment]:
    if not element_ids:
        return []
    statement = select(ProjectAssignment).where(
        ProjectAssignment.project_id == project_id,
        ProjectAssignment.ifc_element_id.in_(element_ids),
    )
    return list(session.exec(statement).all())


def get_assignment(session: Session, assignment_id: str) -> ProjectAssignment | None:
    return session.get(ProjectAssignment, assignment_id)


def get_assignment_by_element_and_item(
    session: Session, *, ifc_element_id: str, item_id: str
) -> ProjectAssignment | None:
    statement = select(ProjectAssignment).where(
        ProjectAssignment.ifc_element_id == ifc_element_id,
        ProjectAssignment.item_id == item_id,
    )
    return session.exec(statement).first()


def create_assignment(session: Session, assignment: ProjectAssignment) -> ProjectAssignment:
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def create_assignments_bulk(session: Session, assignments: list[ProjectAssignment]) -> int:
    """Inserta múltiples asignaciones en una sola transacción (performance)."""
    if not assignments:
        return 0
    session.add_all(assignments)
    session.commit()
    return len(assignments)


def delete_assignment(session: Session, assignment: ProjectAssignment) -> None:
    session.delete(assignment)
    session.commit()


def list_elements_for_tab(
    session: Session,
    *,
    project_id: str,
    tab: str,
    offset: int,
    limit: int,
    query: str | None,
) -> list[IfcElement]:
    statement = select(IfcElement).where(IfcElement.project_id == project_id, IfcElement.status == "active")

    if query:
        like_pattern = f"%{query}%"
        statement = statement.where(
            col(IfcElement.global_id).ilike(like_pattern)
            | col(IfcElement.ifc_type).ilike(like_pattern)
            | col(IfcElement.ifc_type_name).ilike(like_pattern)
            | col(IfcElement.ifc_name).ilike(like_pattern)
            | col(IfcElement.nbr_classification).ilike(like_pattern)
        )

    if tab == "unassigned":
        assigned_subq = select(ProjectAssignment.ifc_element_id).where(ProjectAssignment.project_id == project_id)
        statement = statement.where(~IfcElement.id.in_(assigned_subq))
    elif tab == "auto":
        auto_subq = select(ProjectAssignment.ifc_element_id).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.classification_source == "ifc_classification",
        )
        statement = statement.where(IfcElement.id.in_(auto_subq))
    elif tab == "conflicts":
        user_subq = select(ProjectAssignment.ifc_element_id).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.classification_source == "user",
        )
        statement = statement.where(IfcElement.id.in_(user_subq))
    else:
        raise ValueError("tab inválido")

    statement = statement.order_by(IfcElement.global_id).offset(offset).limit(limit)
    return list(session.exec(statement).all())


def list_elements_for_tab_unpaged(
    session: Session,
    *,
    project_id: str,
    tab: str,
    query: str | None,
    limit: int = 5000,
) -> list[IfcElement]:
    statement = select(IfcElement).where(IfcElement.project_id == project_id, IfcElement.status == "active")

    if query:
        like_pattern = f"%{query}%"
        statement = statement.where(
            col(IfcElement.global_id).ilike(like_pattern)
            | col(IfcElement.ifc_type).ilike(like_pattern)
            | col(IfcElement.ifc_type_name).ilike(like_pattern)
            | col(IfcElement.ifc_name).ilike(like_pattern)
            | col(IfcElement.nbr_classification).ilike(like_pattern)
        )

    if tab == "unassigned":
        assigned_subq = select(ProjectAssignment.ifc_element_id).where(ProjectAssignment.project_id == project_id)
        statement = statement.where(~IfcElement.id.in_(assigned_subq))
    elif tab == "auto":
        auto_subq = select(ProjectAssignment.ifc_element_id).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.classification_source == "ifc_classification",
        )
        statement = statement.where(IfcElement.id.in_(auto_subq))
    elif tab == "conflicts":
        user_subq = select(ProjectAssignment.ifc_element_id).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.classification_source == "user",
        )
        statement = statement.where(IfcElement.id.in_(user_subq))
    else:
        raise ValueError("tab inválido")

    statement = statement.order_by(IfcElement.global_id).limit(limit)
    return list(session.exec(statement).all())


def list_unassigned_elements_by_group(
    session: Session,
    *,
    project_id: str,
    ifc_type: str,
    ifc_type_name: str | None,
) -> list[IfcElement]:
    """Lista elementos activos sin asignación para un grupo (IfcType + ifc_type_name)."""
    statement = select(IfcElement).where(
        IfcElement.project_id == project_id,
        IfcElement.status == "active",
        IfcElement.ifc_type == ifc_type,
    )
    if ifc_type_name is None:
        statement = statement.where(col(IfcElement.ifc_type_name).is_(None))
    else:
        statement = statement.where(IfcElement.ifc_type_name == ifc_type_name)

    assigned_subq = select(ProjectAssignment.ifc_element_id).where(ProjectAssignment.project_id == project_id)
    statement = statement.where(~IfcElement.id.in_(assigned_subq)).order_by(IfcElement.global_id)
    return list(session.exec(statement).all())


def count_active_elements_by_group(
    session: Session,
    *,
    project_id: str,
    ifc_type: str,
    ifc_type_name: str | None,
) -> int:
    """Cuenta elementos activos de un grupo (IfcType + ifc_type_name), asignados o no."""
    from sqlalchemy import func

    statement = select(func.count()).select_from(IfcElement).where(
        IfcElement.project_id == project_id,
        IfcElement.status == "active",
        IfcElement.ifc_type == ifc_type,
    )
    if ifc_type_name is None:
        statement = statement.where(col(IfcElement.ifc_type_name).is_(None))
    else:
        statement = statement.where(IfcElement.ifc_type_name == ifc_type_name)

    return int(session.exec(statement).one())


def list_active_elements_with_nbr_classification(session: Session, *, project_id: str) -> list[IfcElement]:
    statement = (
        select(IfcElement)
        .where(IfcElement.project_id == project_id, IfcElement.status == "active")
        .where(col(IfcElement.nbr_classification).is_not(None))
        .order_by(IfcElement.global_id)
    )
    return list(session.exec(statement).all())


def count_elements_for_tab(
    session: Session,
    *,
    project_id: str,
    tab: str,
    query: str | None,
) -> int:
    from sqlalchemy import func

    statement = select(func.count()).select_from(IfcElement).where(
        IfcElement.project_id == project_id,
        IfcElement.status == "active",
    )

    if query:
        like_pattern = f"%{query}%"
        statement = statement.where(
            col(IfcElement.global_id).ilike(like_pattern)
            | col(IfcElement.ifc_type).ilike(like_pattern)
            | col(IfcElement.ifc_type_name).ilike(like_pattern)
            | col(IfcElement.ifc_name).ilike(like_pattern)
            | col(IfcElement.nbr_classification).ilike(like_pattern)
        )

    if tab == "unassigned":
        assigned_subq = select(ProjectAssignment.ifc_element_id).where(ProjectAssignment.project_id == project_id)
        statement = statement.where(~IfcElement.id.in_(assigned_subq))
    elif tab == "auto":
        auto_subq = select(ProjectAssignment.ifc_element_id).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.classification_source == "ifc_classification",
        )
        statement = statement.where(IfcElement.id.in_(auto_subq))
    elif tab == "conflicts":
        user_subq = select(ProjectAssignment.ifc_element_id).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.classification_source == "user",
        )
        statement = statement.where(IfcElement.id.in_(user_subq))
    else:
        raise ValueError("tab inválido")

    return int(session.exec(statement).one())


def suggestions_by_exact_nbr_code(
    session: Session,
    *,
    nbr_code: str,
    limit: int = 5,
) -> list[CatalogItem]:
    statement = (
        select(CatalogItem)
        .where(CatalogItem.is_work_item == True)  # noqa: E712
        .where(CatalogItem.nbr_code == nbr_code)
        .order_by(CatalogItem.nbr_code)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def work_items_by_exact_nbr_codes(session: Session, *, nbr_codes: list[str]) -> list[CatalogItem]:
    if not nbr_codes:
        return []
    statement = (
        select(CatalogItem)
        .where(CatalogItem.is_work_item == True)  # noqa: E712
        .where(CatalogItem.nbr_code.in_(nbr_codes))
        .order_by(CatalogItem.nbr_code, CatalogItem.id)
    )
    return list(session.exec(statement).all())


def suggestions_by_prefix_nbr_code(
    session: Session,
    *,
    nbr_code_prefix: str,
    limit: int = 5,
) -> list[CatalogItem]:
    like_pattern = f"{nbr_code_prefix}%"
    statement = (
        select(CatalogItem)
        .where(CatalogItem.is_work_item == True)  # noqa: E712
        .where(col(CatalogItem.nbr_code).ilike(like_pattern))
        .order_by(CatalogItem.nbr_code)
        .limit(limit)
    )
    return list(session.exec(statement).all())


def suggestions_from_project_library(
    session: Session,
    *,
    project_id: str,
    limit: int = 5,
) -> list[CatalogItem]:
    statement = (
        select(CatalogItem)
        .join(ProjectLibraryEntry, ProjectLibraryEntry.item_id == CatalogItem.id)
        .where(ProjectLibraryEntry.project_id == project_id)
        .order_by(CatalogItem.nbr_code)
        .limit(limit)
    )
    return list(session.exec(statement).all())
