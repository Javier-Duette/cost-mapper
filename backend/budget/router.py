"""
Router del módulo budget — endpoints FastAPI.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from db.session import get_session
from .models import BudgetSummary, IfcBudgetSummary
from . import service

router = APIRouter(prefix="/api/projects/{project_id}/budget", tags=["Budget"])


@router.get("", response_model=BudgetSummary)
def get_budget(project_id: str, session: Session = Depends(get_session)):
    return service.get_budget(session, project_id)


@router.get(":ifc", response_model=IfcBudgetSummary)
def get_budget_ifc(project_id: str, session: Session = Depends(get_session)):
    """Presupuesto calculado desde mapeo IFC (project_assignments) + cantidades runtime."""
    return service.get_budget_ifc(session, project_id)
