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
    include_archived: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> list[CatalogItem]:
    """Búsqueda paginada de ítems con filtros opcionales.

    Por defecto filtra is_work_item=True (ítems TCPO presupuestables) y excluye
    archivados. Pasar include_archived=True para mostrarlos también.
    Ver ADR-011.
    """
    statement = select(CatalogItem).where(CatalogItem.is_work_item == is_work_item)

    if not include_archived:
        statement = statement.where(CatalogItem.archived == False)  # noqa: E712

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
    include_archived: bool = False,
) -> int:
    """Cuenta total de ítems que coinciden con los filtros (para paginación)."""
    from sqlalchemy import func

    statement = select(func.count()).select_from(CatalogItem).where(
        CatalogItem.is_work_item == is_work_item
    )

    if not include_archived:
        statement = statement.where(CatalogItem.archived == False)  # noqa: E712

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


def set_archived(session: Session, item_id: str, value: bool) -> CatalogItem:
    """Cambia el estado `archived` de un ítem. Retorna el ítem actualizado."""
    from catalog.models import _now

    item = session.get(CatalogItem, item_id)
    if item is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Ítem {item_id!r} no encontrado")

    item.archived = value
    item.updated_at = _now()
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def get_nbr_tree(
    session: Session,
    *,
    facet: str | None = None,
    bim_taggable: bool | None = None,
) -> list[CatalogItem]:
    """Retorna nodos del arbol de clasificacion NBR para keynotes y navegacion.

    Incluye TODOS los nodos (is_work_item ignorado) - tanto nodos intermedios
    como items hoja. La relacion padre-hijo se reconstruye via parent_nbr_code.
    Ver MODELO-DE-DATOS.md seccion 10 (query de keynote file).
    """
    statement = select(CatalogItem)

    if facet:
        statement = statement.where(CatalogItem.facet == facet)
    if bim_taggable is not None:
        statement = statement.where(CatalogItem.bim_taggable == bim_taggable)

    statement = statement.order_by(CatalogItem.nbr_code)
    return list(session.exec(statement).all())


def search_nbr_nodes(
    session: Session,
    *,
    q: str | None = None,
    facet: str | None = None,
    limit: int = 80,
) -> list[CatalogItem]:
    """Búsqueda de nodos NBR 15965 (incluye clasificación Y work items).

    A diferencia de search(), no filtra por is_work_item — retorna cualquier
    nodo que coincida: clasificaciones intermedias e ítems presupuestables.
    Usado por el modo 'Buscar' del NbrTreePicker.
    """
    statement = select(CatalogItem)

    if facet:
        statement = statement.where(CatalogItem.facet == facet)

    if q:
        like_pattern = f"%{q}%"
        statement = statement.where(
            col(CatalogItem.description_es).ilike(like_pattern)
            | col(CatalogItem.nbr_code).ilike(like_pattern)
        )

    statement = statement.order_by(CatalogItem.nbr_code).limit(limit)
    return list(session.exec(statement).all())


def get_nbr_tree_for_facet(
    session: Session,
    *,
    facet: str,
) -> list[CatalogItem]:
    """Retorna TODOS los nodos de una faceta, ordenados por código.

    El frontend usa esta lista completa para construir el árbol jerárquico
    client-side usando la lógica de derivación de padre por formato de código.
    Usado por el modo 'Navegar' del NbrTreePicker.
    """
    statement = (
        select(CatalogItem)
        .where(CatalogItem.facet == facet)
        .order_by(CatalogItem.nbr_code)
    )
    return list(session.exec(statement).all())


def get_nbr_ancestors(
    session: Session,
    *,
    nbr_code: str,
) -> list[CatalogItem]:
    """Retorna la cadena de ancestros de un nodo NBR (de raíz a padre inmediato).

    Deriva los códigos ancestros del formato del código:
    para '2C 02 02 02 00 00 00' retorna los nodos con códigos
    '2C 02 00 00 00 00 00' y '2C 02 02 00 00 00 00'.

    Los nodos que existen en la DB se retornan; los que no existen se omiten.
    Cuando parent_nbr_code está seteado (work items TCPO), lo usa directamente.
    """
    ancestor_codes = _derive_ancestor_codes(nbr_code)
    if not ancestor_codes:
        return []

    statement = (
        select(CatalogItem)
        .where(col(CatalogItem.nbr_code).in_(ancestor_codes))
        .order_by(CatalogItem.nbr_code)
    )
    found = {item.nbr_code: item for item in session.exec(statement).all()}
    # Devolver en orden de raíz a padre (siguiendo el orden de ancestor_codes)
    return [found[c] for c in ancestor_codes if c in found]


def get_nbr_next_item_code(
    session: Session,
    *,
    parent_code: str,
) -> str:
    """Sugiere el próximo código disponible para un ítem bajo el nodo padre.

    Busca los work items existentes bajo parent_code (via parent_nbr_code o
    derivación de código) y retorna el siguiente número de secuencia.
    El sufijo se incrementa de a 5 (5, 10, 15...).
    """
    # Buscar work items con parent_nbr_code explícito
    statement = (
        select(CatalogItem)
        .where(CatalogItem.parent_nbr_code == parent_code)
        .where(CatalogItem.is_work_item == True)  # noqa: E712
        .order_by(CatalogItem.nbr_code.desc())
        .limit(1)
    )
    last_with_parent = session.exec(statement).first()

    if last_with_parent:
        last_seg = last_with_parent.nbr_code.split()[-1]
        try:
            return _build_next_code(parent_code, int(last_seg))
        except ValueError:
            pass

    # Fallback: buscar ítems cuyo código derive de este padre
    parts = parent_code.split()
    if not parts:
        return parent_code + " 05"

    facet = parts[0]
    statement2 = (
        select(CatalogItem)
        .where(CatalogItem.facet == facet)
        .where(CatalogItem.is_work_item == True)  # noqa: E712
        .where(col(CatalogItem.nbr_code).startswith(parent_code.rstrip("0 ").rstrip()))
        .order_by(CatalogItem.nbr_code.desc())
        .limit(1)
    )
    last_derived = session.exec(statement2).first()

    if last_derived:
        last_seg = last_derived.nbr_code.split()[-1]
        try:
            return _build_next_code(parent_code, int(last_seg))
        except ValueError:
            pass

    return _build_next_code(parent_code, 0)


def _build_next_code(parent_code: str, last_suffix: int) -> str:
    """Construye el código del siguiente ítem bajo parent_code."""
    next_suffix = last_suffix + 5
    parts = parent_code.split()
    # Reemplazar el último '00' con el nuevo sufijo
    for i in range(len(parts) - 1, 0, -1):
        if parts[i] in ("00", "0"):
            parts[i] = str(next_suffix).zfill(2)
            return " ".join(parts)
    # Si no hay ningún '00', agregar como nuevo segmento
    return parent_code + f" {str(next_suffix).zfill(2)}"


def _derive_ancestor_codes(nbr_code: str) -> list[str]:
    """Deriva los códigos de todos los nodos ancestros de un código NBR.

    Convención: el padre de un nodo es el mismo código con el segmento más
    a la derecha que no sea '00' reemplazado por '00'.

    Ejemplos:
      '2C 02 02 02 00 00 00' → ['2C 02 00 00 00 00 00', '2C 02 02 00 00 00 00']
      '2C 02 09 04 00 05'    → ['2C 02 00 00 00 00', '2C 02 09 00 00 00',
                                 '2C 02 09 04 00 00']
    """
    ancestors: list[str] = []
    current = nbr_code

    for _ in range(20):  # máximo 20 niveles de profundidad
        parent = _derive_parent_code(current)
        if parent is None:
            break
        ancestors.append(parent)
        current = parent

    ancestors.reverse()  # de raíz a padre inmediato
    return ancestors


def _derive_parent_code(nbr_code: str) -> str | None:
    """Retorna el código del padre inmediato, o None si es raíz de faceta."""
    parts = nbr_code.split(" ")
    if len(parts) <= 1:
        return None

    segments = parts[1:]  # excluir faceta

    # Buscar el último segmento no-cero
    for i in range(len(segments) - 1, -1, -1):
        if segments[i] not in ("00", "0"):
            if i == 0:
                return None  # ya es raíz (solo un segmento no-cero)
            parent_segs = segments[:i] + ["00"] + segments[i + 1:]
            return parts[0] + " " + " ".join(parent_segs)

    return None


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
            creado_por=component.creado_por,
            modificado_por=component.modificado_por,
            created_at=component.created_at,
            updated_at=component.updated_at,
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


def delete_apu_component(session: Session, apu: APUComponent) -> None:
    """Elimina un insumo individual del APU."""
    session.delete(apu)
    session.commit()


def list_parent_item_ids_using_component(session: Session, *, component_id: str) -> list[str]:
    """Lista IDs de Ã­tems padre que usan un componente dado en su APU."""
    statement = select(APUComponent.item_id).where(APUComponent.component_id == component_id)
    return list(session.exec(statement).all())


def count_external_references(session: Session, *, item_id: str) -> dict[str, int]:
    """Cuenta referencias a un Ã­tem desde otras tablas (solo lectura).

    Se usa para validar borrado seguro sin romper integridad referencial.
    """
    from sqlalchemy import func
    from library.models import ProjectLibraryEntry
    from mapper.models import ProjectAssignment

    lib_count = session.exec(
        select(func.count()).select_from(ProjectLibraryEntry).where(ProjectLibraryEntry.item_id == item_id)
    ).one()
    assign_count = session.exec(
        select(func.count()).select_from(ProjectAssignment).where(ProjectAssignment.item_id == item_id)
    ).one()
    used_as_component_count = session.exec(
        select(func.count()).select_from(APUComponent).where(APUComponent.component_id == item_id)
    ).one()
    return {
        "project_library": int(lib_count),
        "project_assignments": int(assign_count),
        "apu_as_component": int(used_as_component_count),
    }


def delete_item_and_own_apu(session: Session, *, item: CatalogItem) -> None:
    """Elimina un Ã­tem y sus APUComponents donde es padre (item_id).

    Nota: NO elimina referencias en otras tablas (library/mapper).
    """
    for apu in session.exec(select(APUComponent).where(APUComponent.item_id == item.id)).all():
        session.delete(apu)
    session.delete(item)
    session.commit()
