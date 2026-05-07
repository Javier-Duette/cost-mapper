"""
Router del módulo library — endpoints FastAPI.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from db.session import get_session
from .models import LibraryEntryCreate, LibraryEntryRead, LibraryEntryUpdate
from . import service

router = APIRouter(prefix="/api/projects/{project_id}/library", tags=["Library"])


@router.get("", response_model=list[LibraryEntryRead])
def list_entries(project_id: str, session: Session = Depends(get_session)):
    return service.list_entries(session, project_id)


@router.post("", response_model=LibraryEntryRead, status_code=201)
def add_item(
    project_id: str,
    data: LibraryEntryCreate,
    session: Session = Depends(get_session),
):
    return service.add_item(session, project_id, data)


@router.patch("/{entry_id}", response_model=LibraryEntryRead)
def update_entry(
    project_id: str,
    entry_id: str,
    data: LibraryEntryUpdate,
    session: Session = Depends(get_session),
):
    return service.update_entry(session, entry_id, data)


@router.delete("/{entry_id}", status_code=204)
def remove_entry(
    project_id: str,
    entry_id: str,
    session: Session = Depends(get_session),
):
    service.remove_entry(session, entry_id)
