"""
Service del mÃ³dulo catalog â€” lÃ³gica de negocio.

Orquesta repository y aplica reglas de dominio.
Referencia: docs/ARQUITECTURA.md secciÃ³n 2.1
"""

from decimal import Decimal

from fastapi import HTTPException
from sqlmodel import Session

from catalog import repository
from catalog.models import (
    APUComponentRead,
    CatalogItem,
    CatalogItemCreate,
    CatalogItemRead,
    CatalogItemUpdate,
    _now,
    _uuid,
)


def buscar_items(
    session: Session,
    *,
    query: str | None = None,
    facet: str | None = None,
    relevant_py: bool | None = None,
    offset: int = 0,
    limit: int = 50,
) -> dict:
    """BÃºsqueda paginada de Ã­tems con filtros.

    Returns:
        dict con 'items', 'total', 'offset', 'limit'.
    """
    items = repository.search(
        session,
        query=query,
        facet=facet,
        relevant_py=relevant_py,
        offset=offset,
        limit=limit,
    )
    total = repository.count(
        session,
        query=query,
        facet=facet,
        relevant_py=relevant_py,
    )
    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


def obtener_item(session: Session, item_id: str) -> CatalogItem:
    """Obtiene un Ã­tem por ID o lanza 404."""
    item = repository.get_by_id(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Ãtem {item_id} no encontrado.")
    return item


def obtener_apu_completo(session: Session, item_id: str) -> list[APUComponentRead]:
    """Obtiene la composiciÃ³n APU de un Ã­tem.

    Verifica que el Ã­tem exista antes de consultar la APU.
    """
    # Verificar existencia del Ã­tem padre
    obtener_item(session, item_id)
    return repository.get_apu_components(session, item_id)


def actualizar_item(
    session: Session,
    item_id: str,
    data: CatalogItemUpdate,
    user: str = "user:anonymous",
) -> CatalogItem:
    """Edita un Ã­tem existente.

    Regla de negocio (ARQUITECTURA.md secciÃ³n 2.1):
    El cambio es global â€” si se edita el precio de un insumo,
    afecta a todos los APU que lo usen como componente.
    El router debe avisar al usuario del alcance del cambio.
    """
    item = obtener_item(session, item_id)
    return repository.update(session, item, data, modificado_por=user)


def crear_item(
    session: Session,
    data: CatalogItemCreate,
    user: str = "user:anonymous",
) -> CatalogItem:
    """Crea un Ã­tem nuevo en el catÃ¡logo.

    Genera UUID v4 (Capa 3 â€” Ã­tems locales, ADR-001).
    """
    item = CatalogItem(
        id=_uuid(),
        uuid_status="local",
        nbr_code=data.nbr_code,
        facet=data.facet,
        description_es=data.description_es,
        description_pt=data.description_pt,
        unit=data.unit,
        parent_nbr_code=data.parent_nbr_code,
        bim_taggable=data.bim_taggable,
        relevant_py=data.relevant_py,
        unit_price=data.unit_price,
        currency=data.currency,
        fuente_precios=data.fuente_precios,
        fuente_factores=data.fuente_factores,
        classification_source="user",
        creado_por=user,
        oficial=False,
        created_at=_now(),
        updated_at=_now(),
    )
    return repository.create(session, item)

def obtener_apu_componente(session: Session, apu_id: str) -> "APUComponent":
    """Obtiene un componente APU por su ID."""
    from catalog.models import APUComponent
    apu = session.get(APUComponent, apu_id)
    if not apu:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="APU component not found")
    return apu

def actualizar_apu_componente(
    session: Session,
    apu_id: str,
    data: "APUComponentUpdate",
) -> "APUComponent":
    """Edita un componente APU existente (coeficiente o fuente)."""
    apu = obtener_apu_componente(session, apu_id)
    apu = repository.update_apu_component(session, apu, data)
    
    # Invalidate parent verification
    parent = obtener_item(session, apu.item_id)
    parent.is_verified = False
    session.add(parent)
    session.commit()
    
    return apu


def agregar_componente_apu(
    session: Session,
    item_id: str,
    data: "APUComponentCreate"
) -> "APUComponent":
    from catalog.models import APUComponent, _uuid
    # Verify parent exists
    parent = obtener_item(session, item_id)
    # Validate component exists
    component = obtener_item(session, data.component_id)

    apu = APUComponent(
        id=_uuid(),
        item_id=item_id,
        component_id=data.component_id,
        quantity=data.quantity,
        unit=data.unit,
        source=data.source
    )
    apu = repository.add_apu_component(session, apu)
    
    # Invalidate parent verification
    parent.is_verified = False
    session.add(parent)
    session.commit()
    
    return apu
