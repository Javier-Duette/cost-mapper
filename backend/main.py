"""
Cost-Mapper V2 — Backend API.

Entrypoint de FastAPI. Configura la app, incluye routers
y crea las tablas en desarrollo.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from catalog.router import router as catalog_router
from projects.router import router as projects_router
from library.router import router as library_router
from budget.router import router as budget_router
from settings.router import router as settings_router
from etl_runner import router as etl_router
from projects.models import Project
from db.session import create_db_and_tables
from sqlmodel import Session, select


def _seed_demo_projects(session: Session) -> None:
    """Inserta proyectos de demo si la tabla está vacía."""
    existing = session.exec(select(Project)).first()
    if existing:
        return
    demos = [
        Project(name="Edificio Residencial Asunción", location="Asunción, Paraguay", type="residencial", currency="PYG"),
        Project(name="Centro Comercial CDE", location="Ciudad del Este, Paraguay", type="comercial", currency="PYG"),
    ]
    for p in demos:
        session.add(p)
    session.commit()


def _migrate_dev_db() -> None:
    """Aplica migraciones incrementales sobre la DB SQLite de desarrollo.

    Cada sentencia ALTER TABLE es idempotente: se ignora si la columna ya existe.
    En producción reemplazar por Alembic (ver ARQUITECTURA.md sección 2.8).
    """
    from sqlalchemy import text
    from db.session import engine

    migrations = [
        # ADR-011: distingue nodos NBR de ítems de trabajo TCPO
        "ALTER TABLE catalog_items ADD COLUMN is_work_item INTEGER NOT NULL DEFAULT 0",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # columna ya existe


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea las tablas de DB al arrancar y siembra datos de demo."""
    create_db_and_tables()
    _migrate_dev_db()
    from db.session import engine
    with Session(engine) as session:
        _seed_demo_projects(session)
    yield


app = FastAPI(
    title="Cost-Mapper API",
    description=(
        "API del sistema de gestión de costos BIM para Paraguay. "
        "Vincula modelos IFC con presupuestos usando NBR 15965."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(catalog_router)
app.include_router(projects_router)
app.include_router(library_router)
app.include_router(budget_router)
app.include_router(settings_router)
app.include_router(etl_router)


@app.get("/", tags=["Health"])
def root():
    """Health check."""
    return {"status": "ok", "project": "Cost-Mapper V2"}
