"""
Repository del modulo markups - acceso a DB.

Solo queries. Sin logica de negocio.
"""

from sqlmodel import Session, select

from markups.models import ProjectMarkup, ProjectMarkupUpdate, _now


def list_by_project(session: Session, project_id: str, *, active_only: bool = False) -> list[ProjectMarkup]:
    """Lista markups de un proyecto, ordenados por sort_order."""
    stmt = select(ProjectMarkup).where(ProjectMarkup.project_id == project_id)
    if active_only:
        stmt = stmt.where(ProjectMarkup.is_active == True)  # noqa: E712
    stmt = stmt.order_by(ProjectMarkup.sort_order)
    return list(session.exec(stmt).all())


def get_by_id(session: Session, markup_id: str) -> ProjectMarkup | None:
    return session.get(ProjectMarkup, markup_id)


def create(session: Session, markup: ProjectMarkup) -> ProjectMarkup:
    session.add(markup)
    session.commit()
    session.refresh(markup)
    return markup


def update(session: Session, markup: ProjectMarkup, data: ProjectMarkupUpdate) -> ProjectMarkup:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(markup, key, value)
    markup.updated_at = _now()
    session.add(markup)
    session.commit()
    session.refresh(markup)
    return markup


def delete(session: Session, markup: ProjectMarkup) -> None:
    session.delete(markup)
    session.commit()


def count_by_project(session: Session, project_id: str) -> int:
    """Cuenta total de markups (activos + inactivos) de un proyecto."""
    from sqlalchemy import func
    return session.exec(
        select(func.count()).select_from(ProjectMarkup).where(ProjectMarkup.project_id == project_id)
    ).one()
