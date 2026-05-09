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

    Revit keynotes are tab-delimited. Some Revit setups support hierarchy with
    an optional third column: `PARENT_KEY`. We export hierarchy to make the
    keynote browser tree usable and to align with common Revit workflows.
    """
    entries = repository.list_entries(session, project_id)
    if not entries:
        return b""

    def _sanitize_description(text: str) -> str:
        return text.replace("\t", " ").replace("\r", " ").replace("\n", " ").strip()

    def _full_key(code: str) -> str:
        """Canonical keynote key (stable & reversible for auto-mapping)."""
        return code.replace(" ", ".").strip()

    def _compact_text(code: str) -> str:
        """User-facing text helper: remove '00' padding for readability."""
        parts = [part.strip() for part in code.split() if part.strip()]
        if not parts:
            return ""
        head = parts[0]
        tail = [part for part in parts[1:] if part != "00"]
        return ".".join([head, *tail]) if tail else head

    def _parent_code_00(code: str) -> str:
        """Return the '... 00' parent code for a leaf code."""
        parts = [part.strip() for part in code.split() if part.strip()]
        if len(parts) <= 1:
            return ""
        return " ".join(parts[:-1] + ["00"])

    # Load only the catalog rows directly referenced by the library entries.
    entry_codes = sorted({entry["nbr_code"] for entry in entries})
    statement = select(CatalogItem).where(CatalogItem.nbr_code.in_(entry_codes))
    items = session.exec(statement).all()
    items_by_code: dict[str, CatalogItem] = {item.nbr_code: item for item in items}

    # Build a hierarchy that Revit accepts, but keep KEY canonical (full code),
    # so future auto-mapping via keynotes can match the database codes.
    nodes: dict[str, tuple[str, str]] = {}  # full_key -> (description, parent_full_key)
    for code in entry_codes:
        item = items_by_code.get(code)
        full_key = _full_key(code)
        if not full_key:
            continue

        description = _sanitize_description(item.description_es) if item else _compact_text(code)
        parent_code = _parent_code_00(code)
        parent_key = _full_key(parent_code) if parent_code else ""
        nodes[full_key] = (description, parent_key)

        # Ensure required parent KEY exists as a container line, otherwise Revit errors.
        if parent_key and parent_key not in nodes:
            nodes[parent_key] = (_compact_text(parent_code), _full_key(" ".join(code.split()[:1])) if code else "")

    lines: list[str] = []
    for key in sorted(nodes.keys()):
        description, parent_key = nodes[key]
        lines.append(f"{key}\t{description}\t{parent_key}")

    # Revit's "Unicode" keynote format is UTF-16 LE with BOM.
    text = "\r\n".join(lines) + "\r\n"
    return b"\xff\xfe" + text.encode("utf-16-le")
