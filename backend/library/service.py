"""
Service del módulo library — lógica de negocio.
"""

from fastapi import HTTPException
from sqlmodel import Session

from .models import LibraryEntryCreate, LibraryEntryRead, LibraryEntryUpdate, ProjectLibraryEntry
from . import repository


def list_entries(session: Session, project_id: str) -> list[ProjectLibraryEntry]:
    return repository.list_entries(session, project_id)


def get_entry(session: Session, entry_id: str) -> ProjectLibraryEntry:
    entry = repository.get_entry(session, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entrada '{entry_id}' no encontrada.")
    return entry


def add_item(session: Session, project_id: str, data: LibraryEntryCreate) -> ProjectLibraryEntry:
    existing = repository.get_entry_by_item(session, project_id, data.item_id)
    if existing:
        raise HTTPException(status_code=409, detail="El ítem ya está en la biblioteca de este proyecto.")
    return repository.create_entry(session, project_id, data)


def update_entry(session: Session, entry_id: str, data: LibraryEntryUpdate) -> ProjectLibraryEntry:
    entry = get_entry(session, entry_id)
    return repository.update_entry(session, entry, data)


def remove_entry(session: Session, entry_id: str) -> None:
    entry = get_entry(session, entry_id)
    repository.delete_entry(session, entry)
