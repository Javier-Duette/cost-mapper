from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from db.session import get_session
from .models import UserSetting, SourceSetting

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("/users", response_model=list[UserSetting])
def get_users(session: Session = Depends(get_session)):
    return session.exec(select(UserSetting).where(UserSetting.active == True)).all()

@router.post("/users", response_model=UserSetting)
def create_user(data: UserSetting, session: Session = Depends(get_session)):
    session.add(data)
    session.commit()
    session.refresh(data)
    return data

@router.put("/users/{user_id}", response_model=UserSetting)
def update_user(user_id: int, data: UserSetting, session: Session = Depends(get_session)):
    db_user = session.get(UserSetting, user_id)
    if not db_user: return None
    db_user.name = data.name
    db_user.active = data.active
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    db_user = session.get(UserSetting, user_id)
    if db_user:
        session.delete(db_user)
        session.commit()
    return {"ok": True}

@router.get("/sources", response_model=list[SourceSetting])
def get_sources(session: Session = Depends(get_session)):
    return session.exec(select(SourceSetting).where(SourceSetting.active == True)).all()

@router.post("/sources", response_model=SourceSetting)
def create_source(data: SourceSetting, session: Session = Depends(get_session)):
    session.add(data)
    session.commit()
    session.refresh(data)
    return data

@router.put("/sources/{source_id}", response_model=SourceSetting)
def update_source(source_id: int, data: SourceSetting, session: Session = Depends(get_session)):
    db_source = session.get(SourceSetting, source_id)
    if not db_source: return None
    db_source.name = data.name
    db_source.type = data.type
    db_source.active = data.active
    session.add(db_source)
    session.commit()
    session.refresh(db_source)
    return db_source

@router.delete("/sources/{source_id}")
def delete_source(source_id: int, session: Session = Depends(get_session)):
    db_source = session.get(SourceSetting, source_id)
    if db_source:
        session.delete(db_source)
        session.commit()
    return {"ok": True}
