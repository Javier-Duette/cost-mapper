"""
Repository del módulo projects — queries de DB sin lógica de negocio.
"""

from datetime import datetime, timezone

from sqlmodel import Session, select

from .models import Project, ProjectCreate, ProjectUpdate


def list_projects(session: Session, limit: int = 100, offset: int = 0) -> tuple[list[Project], int]:
    count = len(session.exec(select(Project)).all())
    items = session.exec(select(Project).offset(offset).limit(limit)).all()
    return list(items), count


def get_project(session: Session, project_id: str) -> Project | None:
    return session.get(Project, project_id)


def create_project(session: Session, data: ProjectCreate) -> Project:
    project = Project(**data.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def update_project(session: Session, project: Project, data: ProjectUpdate) -> Project:
    patch = data.model_dump(exclude_unset=True)
    for key, value in patch.items():
        setattr(project, key, value)
    project.updated_at = datetime.now(timezone.utc)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def delete_project(session: Session, project: Project) -> None:
    session.delete(project)
    session.commit()
