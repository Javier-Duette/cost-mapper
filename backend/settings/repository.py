"""
Repository del modulo settings - queries de DB sin logica de negocio.
"""

from sqlmodel import Session, select

from .models import (
    SourceSetting,
    SourceSettingCreate,
    SourceSettingUpdate,
    UserSetting,
    UserSettingCreate,
    UserSettingUpdate,
)


def list_users(session: Session) -> list[UserSetting]:
    statement = select(UserSetting).where(UserSetting.active == True)
    return list(session.exec(statement).all())


def get_user(session: Session, user_id: int) -> UserSetting | None:
    return session.get(UserSetting, user_id)


def create_user(session: Session, data: UserSettingCreate) -> UserSetting:
    user = UserSetting(**data.model_dump())
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def update_user(session: Session, user: UserSetting, data: UserSettingUpdate) -> UserSetting:
    patch = data.model_dump(exclude_unset=True)
    for key, value in patch.items():
        setattr(user, key, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def delete_user(session: Session, user: UserSetting) -> None:
    session.delete(user)
    session.commit()


def list_sources(session: Session) -> list[SourceSetting]:
    statement = select(SourceSetting).where(SourceSetting.active == True)
    return list(session.exec(statement).all())


def get_source(session: Session, source_id: int) -> SourceSetting | None:
    return session.get(SourceSetting, source_id)


def create_source(session: Session, data: SourceSettingCreate) -> SourceSetting:
    source = SourceSetting(**data.model_dump())
    session.add(source)
    session.commit()
    session.refresh(source)
    return source


def update_source(
    session: Session,
    source: SourceSetting,
    data: SourceSettingUpdate,
) -> SourceSetting:
    patch = data.model_dump(exclude_unset=True)
    for key, value in patch.items():
        setattr(source, key, value)
    session.add(source)
    session.commit()
    session.refresh(source)
    return source


def delete_source(session: Session, source: SourceSetting) -> None:
    session.delete(source)
    session.commit()
