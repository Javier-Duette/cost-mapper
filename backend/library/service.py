"""
Service del modulo library - logica de negocio.
"""

from fastapi import HTTPException
from sqlmodel import Session, select

from catalog.models import CatalogItem
from . import repository
from .models import (
    LibraryEntryCreate,
    LibraryEntryReadWithItem,
    LibraryEntryUpdate,
    ProjectLibraryEntry,
)


def list_entries(session: Session, project_id: str) -> list[LibraryEntryReadWithItem]:
    return repository.list_entries(session, project_id)


def get_entry(session: Session, entry_id: str) -> ProjectLibraryEntry:
    entry = repository.get_entry(session, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entrada '{entry_id}' no encontrada.")
    return entry


def add_item(session: Session, project_id: str, data: LibraryEntryCreate) -> ProjectLibraryEntry:
    existing = repository.get_entry_by_item(session, project_id, data.item_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="El item ya esta en la biblioteca de este proyecto.",
        )
    return repository.create_entry(session, project_id, data)


def update_entry(session: Session, entry_id: str, data: LibraryEntryUpdate) -> ProjectLibraryEntry:
    entry = get_entry(session, entry_id)
    return repository.update_entry(session, entry, data)


def remove_entry(session: Session, entry_id: str) -> None:
    entry = get_entry(session, entry_id)
    repository.delete_entry(session, entry)


def _find_unverified_entries(session: Session, project_id: str) -> list[LibraryEntryReadWithItem]:
    entries = repository.list_entries(session, project_id)
    return [entry for entry in entries if not entry["is_verified"]]


def ensure_keynotes_can_export(
    session: Session,
    project_id: str,
    *,
    allow_unverified: bool = False,
    override_reason: str | None = None,
) -> None:
    """Block keynote export when items are unverified, except for an explicit override."""
    unverified = _find_unverified_entries(session, project_id)
    if not unverified:
        return

    if allow_unverified and override_reason and override_reason.strip():
        return

    raise HTTPException(
        status_code=409,
        detail={
            "message": "La biblioteca contiene items sin verificacion humana.",
            "unverified_count": len(unverified),
            "override_allowed": True,
        },
    )


def generate_keynotes_file(session: Session, project_id: str) -> bytes:
    """Generate a Revit keynote file as tab-delimited Unicode text.

    Autodesk documents keynote files as tab-delimited text. For languages
    requiring Unicode characters, Revit expects the text file to be saved as
    Unicode, so the MVP returns UTF-16 with BOM until a real Revit test proves
    a better encoding.
    """
    entries = repository.list_entries(session, project_id)
    if not entries:
        return b""

    needed_codes: set[str] = set()
    for entry in entries:
        code = entry["nbr_code"]
        needed_codes.add(code)
        parts = code.split()
        for i in range(1, len(parts)):
            needed_codes.add(" ".join(parts[:i]))

    statement = select(CatalogItem).where(CatalogItem.nbr_code.in_(list(needed_codes)))
    items = session.exec(statement).all()

    lines: list[str] = []
    for item in sorted(items, key=lambda value: value.nbr_code):
        description = item.description_es.replace("\t", " ")
        parent = item.parent_nbr_code or ""
        lines.append(f"{item.nbr_code}\t{description}\t{parent}")

    return ("\n".join(lines) + "\n").encode("utf-16")
