"""
Tests mÃ­nimos del mÃ³dulo catalog relacionados a APU y borrado de Ã­tems.

Cobertura:
- Al agregar/editar APU, se recalcula `unit_price` del Ã­tem padre.
- DELETE /api/catalog/items/{id} funciona y valida referencias.
"""

from pathlib import Path
import sys

from fastapi.testclient import TestClient
import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db.session import get_session
from main import app


@pytest.fixture(name="session")
def session_fixture():
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
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _create_project(client: TestClient) -> str:
    r = client.post("/api/projects", json={"name": "P1", "location": "AsunciÃ³n", "type": "residencial", "currency": "PYG"})
    assert r.status_code == 201
    return r.json()["id"]


def _create_catalog_item(
    client: TestClient,
    *,
    nbr_code: str,
    facet: str,
    unit: str = "un",
    unit_price: float | None = None,
    currency: str | None = "PYG",
) -> str:
    payload: dict = {
        "nbr_code": nbr_code,
        "facet": facet,
        "description_es": "Item test",
        "unit": unit,
    }
    if unit_price is not None:
        payload["unit_price"] = unit_price
        payload["currency"] = currency
        payload["fuente_precios"] = "test"

    r = client.post("/api/catalog/items", json=payload)
    assert r.status_code == 201
    return r.json()["id"]


class TestCatalogAPURecalc:
    def test_parent_unit_price_updates_from_apu_and_component_price(self, client: TestClient):
        comp_id = _create_catalog_item(client, nbr_code="2C 00 00 00 00 01", facet="2C", unit="un", unit_price=100.0)
        parent_id = _create_catalog_item(client, nbr_code="3R 00 00 00 00 01", facet="3R", unit="m²")

        r_add = client.post(
            f"/api/catalog/items/{parent_id}/apu",
            json={"component_id": comp_id, "quantity": 2, "unit": "un", "source": "CUSTOM"},
        )
        assert r_add.status_code == 201

        parent = client.get(f"/api/catalog/items/{parent_id}").json()
        assert float(parent["unit_price"]) == 200.0

        r_up = client.put(
            f"/api/catalog/items/{comp_id}",
            json={"unit_price": 150.0, "currency": "PYG", "fuente_precios": "test2"},
        )
        assert r_up.status_code == 200

        parent2 = client.get(f"/api/catalog/items/{parent_id}").json()
        assert float(parent2["unit_price"]) == 300.0


class TestCatalogDeleteItem:
    def test_delete_item_ok_when_not_referenced(self, client: TestClient):
        item_id = _create_catalog_item(client, nbr_code="2C 00 00 00 00 99", facet="2C", unit="un", unit_price=10.0)
        r_del = client.delete(f"/api/catalog/items/{item_id}")
        assert r_del.status_code == 204
        r_get = client.get(f"/api/catalog/items/{item_id}")
        assert r_get.status_code == 404

    def test_delete_item_409_when_in_library(self, client: TestClient):
        project_id = _create_project(client)
        item_id = _create_catalog_item(client, nbr_code="2C 00 00 00 00 98", facet="2C", unit="un", unit_price=10.0)

        r_add = client.post(f"/api/projects/{project_id}/library", json={"item_id": item_id})
        assert r_add.status_code == 201

        r_del = client.delete(f"/api/catalog/items/{item_id}")
        assert r_del.status_code == 409
