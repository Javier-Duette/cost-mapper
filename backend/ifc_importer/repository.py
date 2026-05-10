"""
Repository del módulo ifc_importer — queries DB sin lógica de negocio.
"""

from datetime import datetime

from sqlmodel import Session, col, select

from .models import IfcElement, IfcElementSeed, snapshot_md5


def get_by_project_and_global_id(session: Session, project_id: str, global_id: str) -> IfcElement | None:
    return session.exec(
        select(IfcElement).where(IfcElement.project_id == project_id, IfcElement.global_id == global_id)
    ).first()


def upsert_elements(
    session: Session,
    *,
    project_id: str,
    elements: list[IfcElementSeed],
    imported_at: datetime,
    full_sync: bool,
    full_sync_global_ids: set[str] | None = None,
) -> tuple[int, int, int]:
    """Upsertea elementos por (project_id, global_id). Retorna summary counts."""
    global_ids = {e.global_id for e in elements}

    with_nbr = 0
    without_nbr = 0

    for element in elements:
        snapshot = element.qualitative_snapshot or {}
        geometry_hash = snapshot_md5(snapshot)

        if element.nbr_classification:
            with_nbr += 1
        else:
            without_nbr += 1

        existing = get_by_project_and_global_id(session, project_id, element.global_id)
        if existing:
            existing.ifc_type = element.ifc_type
            existing.ifc_name = element.ifc_name
            existing.ifc_level = element.ifc_level
            existing.nbr_classification = element.nbr_classification
            existing.qualitative_snapshot = snapshot
            existing.geometry_hash = geometry_hash
            existing.last_import_at = imported_at
            existing.status = "active"
            session.add(existing)
        else:
            row = IfcElement(
                project_id=project_id,
                global_id=element.global_id,
                ifc_type=element.ifc_type,
                ifc_name=element.ifc_name,
                ifc_level=element.ifc_level,
                nbr_classification=element.nbr_classification,
                qualitative_snapshot=snapshot,
                geometry_hash=geometry_hash,
                last_import_at=imported_at,
                status="active",
            )
            session.add(row)

    if full_sync:
        sync_ids = full_sync_global_ids if full_sync_global_ids is not None else global_ids
        # Marcar como deleted los activos que no aparecen en la importación actual
        statement = select(IfcElement).where(
            IfcElement.project_id == project_id,
            IfcElement.status == "active",
        )
        for row in session.exec(statement).all():
            if row.global_id not in sync_ids:
                row.status = "deleted"
                row.last_import_at = imported_at
                session.add(row)

    session.commit()
    return len(elements), with_nbr, without_nbr


def list_elements(
    session: Session,
    *,
    project_id: str,
    offset: int,
    limit: int,
    query: str | None,
    status: str,
) -> list[IfcElement]:
    statement = select(IfcElement).where(IfcElement.project_id == project_id)

    if status != "all":
        statement = statement.where(IfcElement.status == status)

    if query:
        like_pattern = f"%{query}%"
        statement = statement.where(
            col(IfcElement.global_id).ilike(like_pattern)
            | col(IfcElement.ifc_type).ilike(like_pattern)
            | col(IfcElement.ifc_name).ilike(like_pattern)
            | col(IfcElement.nbr_classification).ilike(like_pattern)
        )

    statement = statement.order_by(IfcElement.global_id).offset(offset).limit(limit)
    return list(session.exec(statement).all())


def count_elements(
    session: Session,
    *,
    project_id: str,
    query: str | None,
    status: str,
) -> int:
    from sqlalchemy import func

    statement = select(func.count()).select_from(IfcElement).where(IfcElement.project_id == project_id)

    if status != "all":
        statement = statement.where(IfcElement.status == status)

    if query:
        like_pattern = f"%{query}%"
        statement = statement.where(
            col(IfcElement.global_id).ilike(like_pattern)
            | col(IfcElement.ifc_type).ilike(like_pattern)
            | col(IfcElement.ifc_name).ilike(like_pattern)
            | col(IfcElement.nbr_classification).ilike(like_pattern)
        )

    return int(session.exec(statement).one())
