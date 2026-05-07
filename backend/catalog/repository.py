"""
Repository del módulo catalog — acceso a DB.

Solo queries. Sin lógica de negocio.
Referencia: docs/ARQUITECTURA.md sección 2.7
"""

from decimal import Decimal

from sqlmodel import Session, col, select

from catalog.models import (
    APUComponent,
    APUComponentRead,
    CatalogItem,
    CatalogItemCreate,
    CatalogItemUpdate,
)


def get_by_id(session: Session, item_id: str) -> CatalogItem | None:
    """Obtiene un ítem por su UUID."""
    return session.get(CatalogItem, item_id)


def get_by_nbr_code(session: Session, nbr_code: str) -> CatalogItem | None:
    """Obtiene un ítem por su código NBR."""
    statement = select(CatalogItem).where(CatalogItem.nbr_code == nbr_code)
    return session.exec(statement).first()


def search(
    session: Session,
    *,
    query: str | None = None,
    facet: str | None = None,
    relevant_py: bool | None = None,
    offset: int = 0,
    limit: int = 50,
) -> list[CatalogItem]:
    """Búsqueda paginada de ítems con filtros opcionales."""
    statement = select(CatalogItem)

    if facet:
        statement = statement.where(CatalogItem.facet == facet)

    if relevant_py is not None:
        statement = statement.where(CatalogItem.relevant_py == relevant_py)

    if query:
        # Búsqueda por texto en descripción o código NBR
        like_pattern = f"%{query}%"
        statement = statement.where(
            col(CatalogItem.description_es).ilike(like_pattern)
            | col(CatalogItem.nbr_code).ilike(like_pattern)
        )

    statement = statement.order_by(CatalogItem.nbr_code).offset(offset).limit(limit)
    return list(session.exec(statement).all())


def count(
    session: Session,
    *,
    query: str | None = None,
    facet: str | None = None,
    relevant_py: bool | None = None,
) -> int:
    """Cuenta total de ítems que coinciden con los filtros (para paginación)."""
    from sqlalchemy import func

    statement = select(func.count()).select_from(CatalogItem)

    if facet:
        statement = statement.where(CatalogItem.facet == facet)
    if relevant_py is not None:
        statement = statement.where(CatalogItem.relevant_py == relevant_py)
    if query:
        like_pattern = f"%{query}%"
        statement = statement.where(
            col(CatalogItem.description_es).ilike(like_pattern)
            | col(CatalogItem.nbr_code).ilike(like_pattern)
        )

    return session.exec(statement).one()


def get_apu_components(session: Session, item_id: str) -> list[APUComponentRead]:
    """Obtiene la composición APU de un ítem.

    Equivale a la query de MODELO-DE-DATOS.md sección 2:
    SELECT ci.facet, ci.nbr_code, ci.description_es, ci.unit,
           ac.quantity, ci.unit_price, ci.currency, ci.fuente_precios,
           ac.id
    FROM apu_components ac
    JOIN catalog_items ci ON ci.id = ac.component_id
    WHERE ac.item_id = :item_id
    ORDER BY ci.facet, ci.nbr_code;
    """
    statement = (
        select(APUComponent, CatalogItem)
        .join(CatalogItem, APUComponent.component_id == CatalogItem.id)
        .where(APUComponent.item_id == item_id)
        .order_by(CatalogItem.facet, CatalogItem.nbr_code)
    )
    results = session.exec(statement).all()

    return [
        APUComponentRead(
            clase=component.facet,
            codigo=component.nbr_code,
            descripcion=component.description_es,
            unidad=component.unit,
            coef=apu.quantity,
            precio=component.unit_price,
            currency=component.currency,
            fuente=component.fuente_precios,
            apu_component_id=apu.id,
            component_id=component.id,
        )
        for apu, component in results
    ]


def create(session: Session, item: CatalogItem) -> CatalogItem:
    """Persiste un nuevo ítem en la DB."""
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def update(
    session: Session,
    item: CatalogItem,
    data: CatalogItemUpdate,
    modificado_por: str,
) -> CatalogItem:
    """Actualiza campos de un ítem existente.

    Solo actualiza los campos que vienen con valor (no None).
    Siempre actualiza modificado_por y updated_at.
    """
    from catalog.models import _now

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    item.modificado_por = modificado_por
    item.updated_at = _now()

    session.add(item)
    session.commit()
    session.refresh(item)
    return item
