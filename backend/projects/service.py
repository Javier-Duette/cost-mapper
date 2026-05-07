"""
Service del módulo projects — lógica de negocio.
"""

from fastapi import HTTPException
from sqlmodel import Session

from .models import Project, ProjectCreate, ProjectRead, ProjectUpdate
from . import repository


def list_projects(session: Session, limit: int, offset: int) -> dict:
    items, total = repository.list_projects(session, limit=limit, offset=offset)
    return {"items": items, "total": total, "offset": offset, "limit": limit}


def get_project(session: Session, project_id: str) -> Project:
    project = repository.get_project(session, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Proyecto '{project_id}' no encontrado.")
    return project


def create_project(session: Session, data: ProjectCreate) -> Project:
    return repository.create_project(session, data)


def update_project(session: Session, project_id: str, data: ProjectUpdate) -> Project:
    project = get_project(session, project_id)
    return repository.update_project(session, project, data)


def delete_project(session: Session, project_id: str) -> None:
    project = get_project(session, project_id)
    repository.delete_project(session, project)
