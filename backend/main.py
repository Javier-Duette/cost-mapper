"""
Cost-Mapper V2 — Backend API.

Entrypoint de FastAPI. Configura la app, incluye routers
y crea las tablas en desarrollo.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from catalog.router import router as catalog_router
from db.session import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea las tablas de DB al arrancar (solo desarrollo)."""
    create_db_and_tables()
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


@app.get("/", tags=["Health"])
def root():
    """Health check."""
    return {"status": "ok", "project": "Cost-Mapper V2"}
