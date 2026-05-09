"""
Router del módulo mapper — endpoints FastAPI.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from db.session import get_session
from .models import AssignmentCreate, AssignmentRead
from . import service


router = APIRouter(prefix="/api/projects/{project_id}/mapping", tags=["Mapper"])


@router.get("/elements", response_model=dict)
def list_mapping_elements(
    project_id: str,
    tab: str = "unassigned",
    offset: int = 0,
    limit: int = 50,
    q: str | None = None,
    session: Session = Depends(get_session),
):
    return service.list_mapping_elements(session, project_id=project_id, tab=tab, offset=offset, limit=limit, query=q)


@router.post("/assignments", response_model=AssignmentRead, status_code=201)
def create_assignment(
    project_id: str,
    payload: AssignmentCreate,
    session: Session = Depends(get_session),
):
    return service.create_assignment(session, project_id=project_id, data=payload)


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(
    project_id: str,
    assignment_id: str,
    session: Session = Depends(get_session),
):
    service.delete_assignment(session, project_id=project_id, assignment_id=assignment_id)

