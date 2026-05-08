"""
Router del modulo library - endpoints FastAPI.
"""

from fastapi import APIRouter, Depends, Header, Query
from fastapi.responses import Response
from sqlmodel import Session

from db.session import get_session
from . import service
from .models import (
    LibraryEntryCreate,
    LibraryEntryRead,
    LibraryEntryReadWithItem,
    LibraryEntryUpdate,
)

router = APIRouter(prefix="/api/projects/{project_id}/library", tags=["Library"])


@router.get("", response_model=list[LibraryEntryReadWithItem])
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


@router.get("/export/keynotes")
def export_keynotes(
    project_id: str,
    allow_unverified: bool = Query(False),
    override_reason: str | None = Query(None),
    x_user: str | None = Header(None),
    session: Session = Depends(get_session),
):
    """Export the project library as a Revit keynote file.

    Unverified items block export by default. Keynotes may be exported with an
    explicit override because they contain only code, description, and parent.
    The current MVP does not persist override audit events yet.
    """
    reason = override_reason
    if allow_unverified and x_user and reason:
        reason = f"{reason.strip()} (override by {x_user})"

    service.ensure_keynotes_can_export(
        session,
        project_id,
        allow_unverified=allow_unverified,
        override_reason=reason,
    )
    content = service.generate_keynotes_file(session, project_id)
    filename = f"keynotes_{project_id[:8]}.txt"

    return Response(
        content=content,
        media_type="text/plain; charset=utf-16",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
