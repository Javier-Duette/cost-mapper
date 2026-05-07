"""
Conexión a la base de datos — SQLModel.

Usa DATABASE_URL del archivo .env (o variable de entorno).
Default: SQLite local para desarrollo rápido.
Producción: PostgreSQL (ver .env.example).
"""

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./costmapper_dev.db")

# SQLite requiere connect_args para permitir uso en múltiples threads (FastAPI)
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=_connect_args)


def create_db_and_tables() -> None:
    """Crea todas las tablas definidas con SQLModel.metadata.

    Solo para desarrollo. En producción usar Alembic.
    """
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Dependency de FastAPI: provee una sesión de DB por request."""
    with Session(engine) as session:
        yield session
