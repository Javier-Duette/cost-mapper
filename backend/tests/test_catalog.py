"""
Tests del módulo catalog.

Usa SQLite en memoria para tests rápidos y aislados.
"""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from db.session import get_session


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(name="session")
def session_fixture():
    """Crea una DB SQLite en memoria para cada test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """TestClient con la sesión de test inyectada."""

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestHealthCheck:
    """Verificar que el servidor responde."""

    def test_root(self, client: TestClient):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestCreateItem:
    """Crear ítems en el catálogo."""

    def test_create_item_minimal(self, client: TestClient):
        """Crea un ítem con los campos mínimos requeridos."""
        response = client.post("/api/catalog/items", json={
            "nbr_code": "3E 05 20",
            "facet": "3E",
            "description_es": "Muro de mampostería cerámica e=15cm",
            "unit": "m²",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["nbr_code"] == "3E 05 20"
        assert data["description_es"] == "Muro de mampostería cerámica e=15cm"
        assert data["uuid_status"] == "local"
        assert data["creado_por"] == "user:anonymous"
        assert data["id"]  # UUID generado automáticamente

    def test_create_item_with_price(self, client: TestClient):
        """Crea un ítem con precio."""
        response = client.post("/api/catalog/items", json={
            "nbr_code": "2N 30 00",
            "facet": "2N",
            "description_es": "Albañil oficial",
            "unit": "hr",
            "unit_price": "85000.00",
            "currency": "PYG",
            "fuente_precios": "mandua_2026_03",
        })
        assert response.status_code == 201
        data = response.json()
        assert Decimal(data["unit_price"]) == Decimal("85000.00")
        assert data["currency"] == "PYG"


class TestSearchItems:
    """Buscar ítems en el catálogo."""

    def _seed_items(self, client: TestClient):
        """Crea ítems de ejemplo para buscar."""
        items = [
            {"nbr_code": "3E 05 20", "facet": "3E", "description_es": "Muro de mampostería cerámica", "unit": "m²"},
            {"nbr_code": "3E 05 30", "facet": "3E", "description_es": "Muro de hormigón armado", "unit": "m²"},
            {"nbr_code": "2N 30 00", "facet": "2N", "description_es": "Albañil oficial", "unit": "hr"},
        ]
        for item in items:
            client.post("/api/catalog/items", json=item)

    def test_search_all(self, client: TestClient):
        """Busca todos los ítems."""
        self._seed_items(client)
        response = client.get("/api/catalog/items")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_search_by_facet(self, client: TestClient):
        """Filtra por faceta."""
        self._seed_items(client)
        response = client.get("/api/catalog/items?facet=3E")
        data = response.json()
        assert data["total"] == 2
        assert all(i["facet"] == "3E" for i in data["items"])

    def test_search_by_text(self, client: TestClient):
        """Busca por texto en descripción."""
        self._seed_items(client)
        response = client.get("/api/catalog/items?q=hormigón")
        data = response.json()
        assert data["total"] == 1
        assert "hormigón" in data["items"][0]["description_es"]


class TestUpdateItem:
    """Editar ítems del catálogo."""

    def test_update_price(self, client: TestClient):
        """Edita el precio de un ítem y verifica modificado_por."""
        # Crear
        r = client.post("/api/catalog/items", json={
            "nbr_code": "2N 30 00",
            "facet": "2N",
            "description_es": "Albañil oficial",
            "unit": "hr",
        })
        item_id = r.json()["id"]

        # Editar precio
        r = client.put(f"/api/catalog/items/{item_id}", json={
            "unit_price": "95000.00",
            "currency": "PYG",
            "fuente_precios": "relevamiento_propio",
        })
        assert r.status_code == 200
        data = r.json()
        assert Decimal(data["unit_price"]) == Decimal("95000.00")
        assert data["fuente_precios"] == "relevamiento_propio"
        assert data["modificado_por"] is not None

    def test_update_nonexistent_item(self, client: TestClient):
        """Editar un ítem que no existe devuelve 404."""
        r = client.put("/api/catalog/items/no-existe", json={"unit_price": "100.00"})
        assert r.status_code == 404


class TestGetItemDetail:
    """Obtener detalle de un ítem."""

    def test_get_item(self, client: TestClient):
        """Obtiene un ítem por ID."""
        r = client.post("/api/catalog/items", json={
            "nbr_code": "3E 05 20",
            "facet": "3E",
            "description_es": "Muro de mampostería cerámica",
            "unit": "m²",
        })
        item_id = r.json()["id"]

        r = client.get(f"/api/catalog/items/{item_id}")
        assert r.status_code == 200
        assert r.json()["id"] == item_id

    def test_get_nonexistent_item(self, client: TestClient):
        """Ítem inexistente devuelve 404."""
        r = client.get("/api/catalog/items/no-existe")
        assert r.status_code == 404


class TestAPU:
    """Composición APU de un ítem."""

    def test_get_apu_empty(self, client: TestClient):
        """Un ítem sin componentes devuelve lista vacía."""
        r = client.post("/api/catalog/items", json={
            "nbr_code": "3E 05 20",
            "facet": "3E",
            "description_es": "Muro de mampostería cerámica",
            "unit": "m²",
        })
        item_id = r.json()["id"]

        r = client.get(f"/api/catalog/items/{item_id}/apu")
        assert r.status_code == 200
        assert r.json() == []
