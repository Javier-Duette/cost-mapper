"""
Service del módulo catalog — lógica de negocio.

Orquesta repository y aplica reglas de dominio.
Referencia: docs/ARQUITECTURA.md sección 2.1
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
    """Búsqueda paginada de ítems con filtros.

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
    """Obtiene un ítem por ID o lanza 404."""
    item = repository.get_by_id(session, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Ítem {item_id} no encontrado.")
    return item


def obtener_apu_completo(session: Session, item_id: str) -> list[APUComponentRead]:
    """Obtiene la composición APU de un ítem.

    Verifica que el ítem exista antes de consultar la APU.
    """
    # Verificar existencia del ítem padre
    obtener_item(session, item_id)
    return repository.get_apu_components(session, item_id)


def actualizar_item(
    session: Session,
    item_id: str,
    data: CatalogItemUpdate,
    user: str = "user:anonymous",
) -> CatalogItem:
    """Edita un ítem existente.

    Regla de negocio (ARQUITECTURA.md sección 2.1):
    El cambio es global — si se edita el precio de un insumo,
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
    """Crea un ítem nuevo en el catálogo.

    Genera UUID v4 (Capa 3 — ítems locales, ADR-001).
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
