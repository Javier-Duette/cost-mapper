"""
Router del módulo mapper — endpoints FastAPI.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from db.session import get_session
from .models import (
    AssignmentCreate,
    AssignmentRead,
    AutoAssignSummary,
    GroupAssignRequest,
    GroupAssignSummary,
    GroupUnassignRequest,
    GroupUnassignSummary,
    MappingGroupsResponse,
)
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


@router.post("/assignments:auto", response_model=AutoAssignSummary)
def auto_assign_by_ifc_classification(project_id: str, session: Session = Depends(get_session)):
    return service.auto_assign_from_ifc_classification(session, project_id=project_id)


@router.get("/groups", response_model=MappingGroupsResponse)
def list_mapping_groups(
    project_id: str,
    tab: str = "unassigned",
    offset: int = 0,
    limit: int = 50,
    q: str | None = None,
    session: Session = Depends(get_session),
):
    return service.list_mapping_groups(session, project_id=project_id, tab=tab, offset=offset, limit=limit, query=q)


@router.post("/groups:assign", response_model=GroupAssignSummary)
def assign_mapping_group(
    project_id: str,
    payload: GroupAssignRequest,
    session: Session = Depends(get_session),
):
    return service.assign_group_manual(session, project_id=project_id, data=payload)


@router.post("/groups:unassign", response_model=GroupUnassignSummary)
def unassign_mapping_group(
    project_id: str,
    payload: GroupUnassignRequest,
    session: Session = Depends(get_session),
):
    return service.unassign_group(session, project_id=project_id, data=payload)
