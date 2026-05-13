"""
Router del modulo markups - endpoints FastAPI.

No llama a repository directamente: siempre pasa por service.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from db.session import get_session
from markups import service
from markups.models import ProjectMarkupCreate, ProjectMarkupRead, ProjectMarkupUpdate

router = APIRouter(prefix="/api/projects/{project_id}/markups", tags=["Markups"])


@router.get("", response_model=list[ProjectMarkupRead], summary="Listar markups del proyecto")
def list_markups(
    project_id: str,
    session: Session = Depends(get_session),
) -> list[ProjectMarkupRead]:
    """Lista todos los markups (activos e inactivos) de un proyecto, en sort_order."""
    return service.list_markups(session, project_id)


@router.post("", response_model=ProjectMarkupRead, status_code=201, summary="Crear markup")
def create_markup(
    project_id: str,
    data: ProjectMarkupCreate,
    session: Session = Depends(get_session),
) -> ProjectMarkupRead:
    """Agrega un nuevo sobrecosto al proyecto."""
    return service.create_markup(session, project_id, data)


@router.put("/{markup_id}", response_model=ProjectMarkupRead, summary="Editar markup")
def update_markup(
    project_id: str,
    markup_id: str,
    data: ProjectMarkupUpdate,
    session: Session = Depends(get_session),
) -> ProjectMarkupRead:
    """Edita un markup existente (nombre, porcentaje, orden, estado activo)."""
    return service.update_markup(session, markup_id, data)


@router.delete("/{markup_id}", status_code=204, summary="Eliminar markup")
def delete_markup(
    project_id: str,
    markup_id: str,
    session: Session = Depends(get_session),
) -> None:
    """Elimina un markup del proyecto."""
    service.delete_markup(session, markup_id)


@router.post("/defaults", response_model=list[ProjectMarkupRead], status_code=201, summary="Sembrar defaults")
def seed_defaults(
    project_id: str,
    session: Session = Depends(get_session),
) -> list[ProjectMarkupRead]:
    """Siembra los 3 markups tipicos paraguayos (GG 12%, Utilidad 10%, IVA 10%).

    Solo actua si el proyecto no tiene markups aun. Idempotente.
    """
    return service.seed_defaults(session, project_id)
