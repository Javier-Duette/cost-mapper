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


def _recalculate_item_price_from_apu(session: Session, *, item_id: str, user: str) -> None:
    """Recalcula `unit_price` del Ã­tem padre a partir de su APU.

    MVP: suma coef * precio de cada componente que tenga precio.
    Si no hay componentes con precio, deja el Ã­tem sin precio (NULL).
    """
    apu = repository.get_apu_components(session, item_id)
    if not apu:
        return

    priced = [r for r in apu if r.precio is not None]
    if not priced:
        update = CatalogItemUpdate(
            unit_price=None,
            currency=None,
            fuente_precios="apu_calc",
            is_verified=False,
            verificado_por=None,
            fecha_verificacion=None,
        )
        parent = obtener_item(session, item_id)
        repository.update(session, parent, update, modificado_por=user)
        return

    total = sum((r.coef * (r.precio or Decimal("0"))) for r in apu)

    currencies = sorted({r.currency for r in priced if r.currency})
    currency = currencies[0] if len(currencies) == 1 else None

    update = CatalogItemUpdate(
        unit_price=total,
        currency=currency,
        fuente_precios="apu_calc",
        is_verified=False,
        verificado_por=None,
        fecha_verificacion=None,
    )
    parent = obtener_item(session, item_id)
    repository.update(session, parent, update, modificado_por=user)


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
    update_data = data.model_dump(exclude_unset=True)
    updated = repository.update(session, item, data, modificado_por=user)

    # Si se actualiza el precio de un componente, recalcular todos los padres que lo usan (APU).
    if "unit_price" in update_data or "currency" in update_data:
        parent_ids = repository.list_parent_item_ids_using_component(session, component_id=updated.id)
        for parent_id in sorted(set(parent_ids)):
            _recalculate_item_price_from_apu(session, item_id=parent_id, user=user)

    return obtener_item(session, item_id)


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
        is_work_item=True,
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
    
    # Recalcular precio del Ã­tem padre en base al APU.
    _recalculate_item_price_from_apu(session, item_id=apu.item_id, user="system:apu_calc")

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
        unit=component.unit,
        source=data.source
    )
    apu = repository.add_apu_component(session, apu)
    
    # Invalidate parent verification
    parent.is_verified = False
    session.add(parent)
    session.commit()
    
    # Recalcular precio del Ã­tem padre en base al APU.
    _recalculate_item_price_from_apu(session, item_id=item_id, user="system:apu_calc")

    return apu


def eliminar_item(session: Session, item_id: str, user: str = "user:anonymous") -> None:
    """Elimina un Ã­tem del catÃ¡logo si no estÃ¡ referenciado por otras tablas.

    Por reglas de mÃ³dulo, el catÃ¡logo NO elimina filas en library/mapper.
    Si estÃ¡ referenciado, se devuelve 409.
    """
    item = obtener_item(session, item_id)

    refs = repository.count_external_references(session, item_id=item.id)
    if any(v > 0 for v in refs.values()):
        parts = []
        if refs["project_library"] > 0:
            parts.append(f"Biblioteca ({refs['project_library']} entrada{'s' if refs['project_library'] != 1 else ''})")
        if refs["project_assignments"] > 0:
            parts.append(f"Mapeo IFC ({refs['project_assignments']} asignacion{'es' if refs['project_assignments'] != 1 else ''})")
        if refs["apu_as_component"] > 0:
            parts.append(f"APU como insumo en {refs['apu_as_component']} item{'s' if refs['apu_as_component'] != 1 else ''}")
        msg = "No se puede eliminar: referenciado en " + ", ".join(parts) + ". Removelo de ahi primero."
        raise HTTPException(
            status_code=409,
            detail={"message": msg, "references": refs},
        )

    repository.delete_item_and_own_apu(session, item=item)


def listar_items_usando_componente(session: Session, *, component_id: str) -> list[CatalogItemRead]:
    """Devuelve los ítems padre que usan este componente en su APU."""
    parent_ids = repository.list_parent_item_ids_using_component(session, component_id=component_id)
    items = [repository.get_by_id(session, pid) for pid in parent_ids]
    return [CatalogItemRead.model_validate(it) for it in items if it is not None]
