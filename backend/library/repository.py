"""
Repository del módulo library — queries de DB sin lógica de negocio.
"""

from sqlmodel import Session, select

from .models import LibraryEntryCreate, LibraryEntryUpdate, ProjectLibraryEntry
from catalog.models import CatalogItem


def list_entries(session: Session, project_id: str):
    """Retorna las entradas de la biblioteca con los detalles básicos del ítem."""
    statement = (
        select(ProjectLibraryEntry, CatalogItem)
        .join(CatalogItem, ProjectLibraryEntry.item_id == CatalogItem.id)
        .where(ProjectLibraryEntry.project_id == project_id)
    )
    results = session.exec(statement).all()

    # Mapear a una lista de diccionarios que matcheen LibraryEntryReadWithItem
    entries = []
    for entry, item in results:
        data = entry.model_dump()
        data.update({
            "nbr_code": item.nbr_code,
            "facet": item.facet,
            "description_es": item.description_es,
            "unit": item.unit,
            "is_verified": item.is_verified,
        })
        entries.append(data)

    return entries


def get_entry(session: Session, entry_id: str) -> ProjectLibraryEntry | None:
    return session.get(ProjectLibraryEntry, entry_id)


def get_entry_by_item(session: Session, project_id: str, item_id: str) -> ProjectLibraryEntry | None:
    return session.exec(
        select(ProjectLibraryEntry).where(
            ProjectLibraryEntry.project_id == project_id,
            ProjectLibraryEntry.item_id == item_id,
        )
    ).first()


def create_entry(session: Session, project_id: str, data: LibraryEntryCreate) -> ProjectLibraryEntry:
    entry = ProjectLibraryEntry(project_id=project_id, **data.model_dump())
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def update_entry(session: Session, entry: ProjectLibraryEntry, data: LibraryEntryUpdate) -> ProjectLibraryEntry:
    patch = data.model_dump(exclude_unset=True)
    for key, value in patch.items():
        setattr(entry, key, value)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def delete_entry(session: Session, entry: ProjectLibraryEntry) -> None:
    session.delete(entry)
    session.commit()
