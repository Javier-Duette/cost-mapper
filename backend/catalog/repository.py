"""
Repository del mÃ³dulo catalog â€” acceso a DB.

Solo queries. Sin lÃ³gica de negocio.
Referencia: docs/ARQUITECTURA.md secciÃ³n 2.7
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
    """Obtiene un Ã­tem por su UUID."""
    return session.get(CatalogItem, item_id)


def get_by_nbr_code(session: Session, nbr_code: str) -> CatalogItem | None:
    """Obtiene un Ã­tem por su cÃ³digo NBR."""
    statement = select(CatalogItem).where(CatalogItem.nbr_code == nbr_code)
    return session.exec(statement).first()


def search(
    session: Session,
    *,
    query: str | None = None,
    facet: str | None = None,
    relevant_py: bool | None = None,
    is_work_item: bool = True,
    offset: int = 0,
    limit: int = 50,
) -> list[CatalogItem]:
    """BÃºsqueda paginada de Ã­tems con filtros opcionales.

    Por defecto filtra is_work_item=True (Ã­tems TCPO presupuestables).
    Pasar is_work_item=False para incluir nodos de clasificaciÃ³n NBR.
    Ver ADR-011.
    """
    statement = select(CatalogItem).where(CatalogItem.is_work_item == is_work_item)

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

    statement = statement.order_by(CatalogItem.nbr_code).offset(offset).limit(limit)
    return list(session.exec(statement).all())


def count(
    session: Session,
    *,
    query: str | None = None,
    facet: str | None = None,
    relevant_py: bool | None = None,
    is_work_item: bool = True,
) -> int:
    """Cuenta total de Ã­tems que coinciden con los filtros (para paginaciÃ³n)."""
    from sqlalchemy import func

    statement = select(func.count()).select_from(CatalogItem).where(
        CatalogItem.is_work_item == is_work_item
    )

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


def get_nbr_tree(
    session: Session,
    *,
    facet: str | None = None,
    bim_taggable: bool | None = None,
) -> list[CatalogItem]:
    """Retorna nodos del Ã¡rbol de clasificaciÃ³n NBR para keynotes y navegaciÃ³n.

    Incluye TODOS los nodos (is_work_item ignorado) â€” tanto nodos intermedios
    como Ã­tems hoja. La relaciÃ³n padre-hijo se reconstruye via parent_nbr_code.
    Ver MODELO-DE-DATOS.md secciÃ³n 10 (query de keynote file).
    """
    statement = select(CatalogItem)

    if facet:
        statement = statement.where(CatalogItem.facet == facet)
    if bim_taggable is not None:
        statement = statement.where(CatalogItem.bim_taggable == bim_taggable)

    statement = statement.order_by(CatalogItem.nbr_code)
    return list(session.exec(statement).all())


def get_apu_components(session: Session, item_id: str) -> list[APUComponentRead]:
    """Obtiene la composiciÃ³n APU de un Ã­tem.

    Equivale a la query de MODELO-DE-DATOS.md secciÃ³n 2:
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
            fuente_precio=component.fuente_precios,
            fuente_coef=apu.source,
            apu_component_id=apu.id,
            component_id=component.id,
        )
        for apu, component in results
    ]


def create(session: Session, item: CatalogItem) -> CatalogItem:
    """Persiste un nuevo Ã­tem en la DB."""
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
    """Actualiza campos de un Ã­tem existente.

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

def update_apu_component(
    session: Session, db_apu: APUComponent, data: "APUComponentUpdate"
) -> APUComponent:
    """Actualiza una relacin APU."""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_apu, key, value)

    session.add(db_apu)
    session.commit()
    session.refresh(db_apu)
    return db_apu


def add_apu_component(session: Session, apu: APUComponent) -> APUComponent:
    """Añade un nuevo componente APU a la base de datos."""
    session.add(apu)
    session.commit()
    session.refresh(apu)
    return apu
