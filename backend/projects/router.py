"""
Router del módulo projects — endpoints FastAPI.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from db.session import get_session
from .models import ProjectCreate, ProjectRead, ProjectUpdate
from . import service

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("", response_model=dict)
def list_projects(
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_session),
):
    return service.list_projects(session, limit=limit, offset=offset)


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(
    data: ProjectCreate,
    session: Session = Depends(get_session),
):
    return service.create_project(session, data)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: str,
    session: Session = Depends(get_session),
):
    return service.get_project(session, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    data: ProjectUpdate,
    session: Session = Depends(get_session),
):
    return service.update_project(session, project_id, data)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    session: Session = Depends(get_session),
):
    service.delete_project(session, project_id)
