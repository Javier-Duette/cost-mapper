from fastapi import APIRouter, Depends
from sqlmodel import Session

from db.session import get_session
from . import service
from .models import (
    SourceSettingCreate,
    SourceSettingRead,
    SourceSettingUpdate,
    UserSettingCreate,
    UserSettingRead,
    UserSettingUpdate,
)

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/users", response_model=list[UserSettingRead])
def get_users(session: Session = Depends(get_session)):
    return service.list_users(session)


@router.post("/users", response_model=UserSettingRead)
def create_user(data: UserSettingCreate, session: Session = Depends(get_session)):
    return service.create_user(session, data)


@router.put("/users/{user_id}", response_model=UserSettingRead)
def update_user(user_id: int, data: UserSettingUpdate, session: Session = Depends(get_session)):
    return service.update_user(session, user_id, data)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    service.delete_user(session, user_id)
    return {"ok": True}


@router.get("/sources", response_model=list[SourceSettingRead])
def get_sources(session: Session = Depends(get_session)):
    return service.list_sources(session)


@router.post("/sources", response_model=SourceSettingRead)
def create_source(data: SourceSettingCreate, session: Session = Depends(get_session)):
    return service.create_source(session, data)


@router.put("/sources/{source_id}", response_model=SourceSettingRead)
def update_source(
    source_id: int,
    data: SourceSettingUpdate,
    session: Session = Depends(get_session),
):
    return service.update_source(session, source_id, data)


@router.delete("/sources/{source_id}")
def delete_source(source_id: int, session: Session = Depends(get_session)):
    service.delete_source(session, source_id)
    return {"ok": True}
