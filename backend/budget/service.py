"""
Service del módulo budget — lógica de negocio.
"""

from sqlmodel import Session

from .models import BudgetSummary
from . import repository


def get_budget(session: Session, project_id: str) -> BudgetSummary:
    return repository.get_budget(session, project_id)
