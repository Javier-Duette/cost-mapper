"""
Router del módulo catalog — endpoints FastAPI.

No llama a repository directamente — siempre pasa por service.
Referencia: docs/ARQUITECTURA.md sección 2.7
"""

from fastapi import APIRouter, Depends, Query, Header
from sqlmodel import Session

from catalog import service
from catalog.models import (
    APUComponentCreate,
    APUComponentRead,
    APUComponentUpdate,
    CatalogItemCreate,
    CatalogItemRead,
    CatalogItemUpdate,
    NbrNodeRead,
)
from db.session import get_session

router = APIRouter(prefix="/api/catalog", tags=["Catálogo"])


@router.get("/nbr-nodes", response_model=list[NbrNodeRead], summary="Buscar nodos NBR 15965")
def search_nbr_nodes(
    q: str | None = Query(None, description="Texto a buscar en descripción o código"),
    facet: str | None = Query(None, description="Filtrar por faceta. Ej: '2C', '3E'"),
    limit: int = Query(80, ge=1, le=500),
    session: Session = Depends(get_session),
) -> list[NbrNodeRead]:
    """Búsqueda plana de nodos NBR (clasificaciones e ítems). Usado por el modo 'Buscar' del picker."""
    nodes = service.buscar_nodos_nbr(session, q=q, facet=facet, limit=limit)
    return [NbrNodeRead.model_validate(n) for n in nodes]


@router.get("/nbr-nodes/tree", response_model=list[NbrNodeRead], summary="Árbol completo de una faceta NBR")
def get_nbr_tree(
    facet: str = Query(..., description="Faceta NBR a cargar. Ej: '2C', '3E'"),
    session: Session = Depends(get_session),
) -> list[NbrNodeRead]:
    """Retorna todos los nodos de una faceta ordenados por código.

    El frontend usa esta lista completa para construir el árbol jerárquico
    client-side (modo 'Navegar' del picker).
    """
    nodes = service.obtener_arbol_nbr(session, facet=facet)
    return [NbrNodeRead.model_validate(n) for n in nodes]


@router.get("/nbr-nodes/ancestors", response_model=list[NbrNodeRead], summary="Ancestros de un nodo NBR")
def get_nbr_ancestors(
    code: str = Query(..., description="Código NBR del nodo. Ej: '2C 02 02 02 00 00 00'"),
    session: Session = Depends(get_session),
) -> list[NbrNodeRead]:
    """Retorna la cadena de ancestros de un nodo (de raíz a padre). Usado para el breadcrumb."""
    nodes = service.obtener_ancestros_nbr(session, nbr_code=code)
    return [NbrNodeRead.model_validate(n) for n in nodes]


@router.get("/nbr-nodes/next-item-code", summary="Sugiere el próximo código para un ítem manual")
def get_nbr_next_item_code(
    parent: str = Query(..., description="Código NBR del nodo padre"),
    session: Session = Depends(get_session),
) -> dict:
    """Retorna el próximo código disponible para un work item bajo el nodo padre dado."""
    next_code = service.obtener_siguiente_codigo(session, parent_code=parent)
    return {"next_code": next_code}


@router.get("/items", summary="Buscar ítems del catálogo")
def search_items(
    q: str | None = Query(None, description="Texto a buscar en descripción o código NBR"),
    facet: str | None = Query(None, description="Filtrar por faceta. Ej: '3E', '2N'"),
    relevant_py: bool | None = Query(None, description="Filtrar por relevancia Paraguay"),
    include_archived: bool = Query(False, description="Incluir ítems archivados en los resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    limit: int = Query(50, ge=1, le=200, description="Cantidad de resultados por página"),
    session: Session = Depends(get_session),
) -> dict:
    """Búsqueda paginada de ítems con filtros opcionales.

    Por defecto excluye ítems archivados. Pasar include_archived=true para mostrarlos.
    Retorna items, total, offset y limit.
    """
    return service.buscar_items(
        session,
        query=q,
        facet=facet,
        relevant_py=relevant_py,
        include_archived=include_archived,
        offset=offset,
        limit=limit,
    )


@router.get("/items/{item_id}", response_model=CatalogItemRead, summary="Detalle de un ítem")
def get_item(
    item_id: str,
    session: Session = Depends(get_session),
) -> CatalogItemRead:
    """Obtiene el detalle completo de un ítem por su UUID."""
    return service.obtener_item(session, item_id)


@router.get(
    "/items/{item_id}/apu",
    response_model=list[APUComponentRead],
    summary="Composición APU de un ítem",
)
def get_item_apu(
    item_id: str,
    session: Session = Depends(get_session),
) -> list[APUComponentRead]:
    """Obtiene el desglose del Análisis de Precio Unitario.

    Cada fila es un insumo (mano de obra, material, equipo) con su
    cantidad, precio unitario y fuente.
    """
    return service.obtener_apu_completo(session, item_id)


@router.get("/items/{component_id}/used-in", response_model=list[CatalogItemRead], summary="Ítems que usan este componente en su APU")
def get_item_used_in(
    component_id: str,
    session: Session = Depends(get_session),
) -> list[CatalogItemRead]:
    """Lista los ítems padre que tienen este ítem como insumo en su APU."""
    return service.listar_items_usando_componente(session, component_id=component_id)


@router.put("/items/{item_id}", response_model=CatalogItemRead, summary="Editar un ítem")
def update_item(
    item_id: str,
    data: CatalogItemUpdate,
    session: Session = Depends(get_session),
    x_user: str | None = Header(None)
) -> CatalogItemRead:
    """Actualiza campos de un ítem existente.

    ⚠️ Si se edita unit_price, el cambio es global: afecta a todos
    los APU que usen este ítem como componente.
    """
    return service.actualizar_item(session, item_id, data, user=x_user or "user:anonymous")


@router.post("/items", response_model=CatalogItemRead, status_code=201, summary="Crear un ítem")
def create_item(
    data: CatalogItemCreate,
    session: Session = Depends(get_session),
) -> CatalogItemRead:
    """Crea un nuevo ítem en el catálogo.

    Se genera un UUID v4 automáticamente (Capa 3 — ítems locales, ADR-001).
    """
    return service.crear_item(session, data)


@router.delete("/items/{item_id}", status_code=204, summary="Eliminar un Ã­tem")
def delete_item(
    item_id: str,
    session: Session = Depends(get_session),
    x_user: str | None = Header(None),
) -> None:
    service.eliminar_item(session, item_id, user=x_user or "user:anonymous")

@router.delete("/apu/{apu_id}", status_code=204, summary="Quitar un insumo del APU")
def delete_apu_component(
    apu_id: str,
    session: Session = Depends(get_session),
) -> None:
    """Elimina un insumo específico del APU. Recalcula el precio del ítem padre."""
    service.eliminar_apu_componente(session, apu_id)


@router.patch("/apu/{apu_id}", summary="Editar un componente APU")
def update_apu_component(
    apu_id: str,
    data: APUComponentUpdate,
    session: Session = Depends(get_session),
) -> dict:
    """Actualiza campos de un componente APU (ej. coeficiente, fuente)."""
    apu = service.actualizar_apu_componente(session, apu_id, data)
    return {"id": apu.id, "quantity": apu.quantity, "source": apu.source}

@router.patch("/items/{item_id}/archive", response_model=CatalogItemRead, summary="Archivar un ítem")
def archive_item(
    item_id: str,
    session: Session = Depends(get_session),
) -> CatalogItemRead:
    """Oculta el ítem del catálogo sin eliminarlo. Se puede restaurar con /unarchive."""
    return service.archivar_item(session, item_id)


@router.patch("/items/{item_id}/unarchive", response_model=CatalogItemRead, summary="Restaurar un ítem archivado")
def unarchive_item(
    item_id: str,
    session: Session = Depends(get_session),
) -> CatalogItemRead:
    """Restaura la visibilidad de un ítem previamente archivado."""
    return service.desarchivar_item(session, item_id)


@router.post("/items/{item_id}/apu", summary="Aadir un insumo al APU", status_code=201)
def add_apu_component(
    item_id: str,
    data: APUComponentCreate,
    session: Session = Depends(get_session),
) -> dict:
    """Aade un nuevo componente al desglose APU de un tem."""
    apu = service.agregar_componente_apu(session, item_id, data)
    return {"id": apu.id, "quantity": apu.quantity, "source": apu.source}
