"""
Router del módulo catalog — endpoints FastAPI.

No llama a repository directamente — siempre pasa por service.
Referencia: docs/ARQUITECTURA.md sección 2.7
"""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from catalog import service
from catalog.models import (
    APUComponentCreate,
    APUComponentRead,
    APUComponentUpdate,
    CatalogItemCreate,
    CatalogItemRead,
    CatalogItemUpdate,
)
from db.session import get_session

router = APIRouter(prefix="/api/catalog", tags=["Catálogo"])


@router.get("/items", summary="Buscar ítems del catálogo")
def search_items(
    q: str | None = Query(None, description="Texto a buscar en descripción o código NBR"),
    facet: str | None = Query(None, description="Filtrar por faceta. Ej: '3E', '2N'"),
    relevant_py: bool | None = Query(None, description="Filtrar por relevancia Paraguay"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    limit: int = Query(50, ge=1, le=200, description="Cantidad de resultados por página"),
    session: Session = Depends(get_session),
) -> dict:
    """Búsqueda paginada de ítems con filtros opcionales.

    Retorna items, total, offset y limit.
    """
    return service.buscar_items(
        session,
        query=q,
        facet=facet,
        relevant_py=relevant_py,
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


@router.put("/items/{item_id}", response_model=CatalogItemRead, summary="Editar un ítem")
def update_item(
    item_id: str,
    data: CatalogItemUpdate,
    session: Session = Depends(get_session),
) -> CatalogItemRead:
    """Actualiza campos de un ítem existente.

    ⚠️ Si se edita unit_price, el cambio es global: afecta a todos
    los APU que usen este ítem como componente.
    """
    return service.actualizar_item(session, item_id, data)


@router.post("/items", response_model=CatalogItemRead, status_code=201, summary="Crear un ítem")
def create_item(
    data: CatalogItemCreate,
    session: Session = Depends(get_session),
) -> CatalogItemRead:
    """Crea un nuevo ítem en el catálogo.

    Se genera un UUID v4 automáticamente (Capa 3 — ítems locales, ADR-001).
    """
    return service.crear_item(session, data)

@router.patch("/apu/{apu_id}", summary="Editar un componente APU")
def update_apu_component(
    apu_id: str,
    data: APUComponentUpdate,
    session: Session = Depends(get_session),
) -> dict:
    """Actualiza campos de un componente APU (ej. coeficiente, fuente)."""
    apu = service.actualizar_apu_componente(session, apu_id, data)
    return {"id": apu.id, "quantity": apu.quantity, "source": apu.source}

@router.post("/items/{item_id}/apu", summary="Aadir un insumo al APU", status_code=201)
def add_apu_component(
    item_id: str,
    data: APUComponentCreate,
    session: Session = Depends(get_session),
) -> dict:
    """Aade un nuevo componente al desglose APU de un tem."""
    apu = service.agregar_componente_apu(session, item_id, data)
    return {"id": apu.id, "quantity": apu.quantity, "source": apu.source}
