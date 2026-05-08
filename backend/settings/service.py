"""
Service del modulo settings - logica de negocio.
"""

from fastapi import HTTPException
from sqlmodel import Session

from . import repository
from .models import (
    SourceSetting,
    SourceSettingCreate,
    SourceSettingUpdate,
    UserSetting,
    UserSettingCreate,
    UserSettingUpdate,
)


def list_users(session: Session) -> list[UserSetting]:
    return repository.list_users(session)


def get_user(session: Session, user_id: int) -> UserSetting:
    user = repository.get_user(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"Usuario '{user_id}' no encontrado.")
    return user


def create_user(session: Session, data: UserSettingCreate) -> UserSetting:
    return repository.create_user(session, data)


def update_user(session: Session, user_id: int, data: UserSettingUpdate) -> UserSetting:
    user = get_user(session, user_id)
    return repository.update_user(session, user, data)


def delete_user(session: Session, user_id: int) -> None:
    user = repository.get_user(session, user_id)
    if user:
        repository.delete_user(session, user)


def list_sources(session: Session) -> list[SourceSetting]:
    return repository.list_sources(session)


def get_source(session: Session, source_id: int) -> SourceSetting:
    source = repository.get_source(session, source_id)
    if not source:
        raise HTTPException(status_code=404, detail=f"Fuente '{source_id}' no encontrada.")
    return source


def create_source(session: Session, data: SourceSettingCreate) -> SourceSetting:
    return repository.create_source(session, data)


def update_source(
    session: Session,
    source_id: int,
    data: SourceSettingUpdate,
) -> SourceSetting:
    source = get_source(session, source_id)
    return repository.update_source(session, source, data)


def delete_source(session: Session, source_id: int) -> None:
    source = repository.get_source(session, source_id)
    if source:
        repository.delete_source(session, source)
