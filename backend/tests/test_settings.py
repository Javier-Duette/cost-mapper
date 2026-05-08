"""
Tests del modulo settings.

Usa SQLite en memoria para validar endpoints sin tocar la DB local.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

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


class TestSettingsUsers:
    def test_create_and_list_users(self, client: TestClient):
        response = client.post("/api/settings/users", json={"name": "Javier"})
        assert response.status_code == 200
        user = response.json()
        assert user["id"]
        assert user["name"] == "Javier"
        assert user["active"] is True

        response = client.get("/api/settings/users")
        assert response.status_code == 200
        assert response.json() == [user]

    def test_list_users_only_returns_active_records(self, client: TestClient):
        client.post("/api/settings/users", json={"name": "Activo"})
        client.post("/api/settings/users", json={"name": "Inactivo", "active": False})

        response = client.get("/api/settings/users")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Activo"

    def test_update_user(self, client: TestClient):
        created = client.post("/api/settings/users", json={"name": "Temporal"}).json()

        response = client.put(
            f"/api/settings/users/{created['id']}",
            json={"name": "Definitivo", "active": False},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Definitivo"
        assert response.json()["active"] is False

    def test_update_missing_user_returns_404(self, client: TestClient):
        response = client.put("/api/settings/users/999", json={"name": "Fantasma"})
        assert response.status_code == 404

    def test_delete_user_keeps_existing_response_contract(self, client: TestClient):
        created = client.post("/api/settings/users", json={"name": "Borrar"}).json()

        response = client.delete(f"/api/settings/users/{created['id']}")

        assert response.status_code == 200
        assert response.json() == {"ok": True}
        assert client.get("/api/settings/users").json() == []


class TestSettingsSources:
    def test_create_and_list_sources(self, client: TestClient):
        response = client.post(
            "/api/settings/sources",
            json={"name": "Mandu'a", "type": "price"},
        )
        assert response.status_code == 200
        source = response.json()
        assert source["id"]
        assert source["name"] == "Mandu'a"
        assert source["type"] == "price"
        assert source["active"] is True

        response = client.get("/api/settings/sources")
        assert response.status_code == 200
        assert response.json() == [source]

    def test_list_sources_only_returns_active_records(self, client: TestClient):
        client.post("/api/settings/sources", json={"name": "TCPO", "type": "factor"})
        client.post(
            "/api/settings/sources",
            json={"name": "Archivada", "type": "both", "active": False},
        )

        response = client.get("/api/settings/sources")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "TCPO"

    def test_update_source(self, client: TestClient):
        created = client.post(
            "/api/settings/sources",
            json={"name": "Fuente", "type": "price"},
        ).json()

        response = client.put(
            f"/api/settings/sources/{created['id']}",
            json={"name": "Fuente mixta", "type": "both", "active": False},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Fuente mixta"
        assert response.json()["type"] == "both"
        assert response.json()["active"] is False

    def test_update_missing_source_returns_404(self, client: TestClient):
        response = client.put(
            "/api/settings/sources/999",
            json={"name": "Fantasma", "type": "price"},
        )
        assert response.status_code == 404

    def test_delete_source_keeps_existing_response_contract(self, client: TestClient):
        created = client.post(
            "/api/settings/sources",
            json={"name": "Borrar", "type": "factor"},
        ).json()

        response = client.delete(f"/api/settings/sources/{created['id']}")

        assert response.status_code == 200
        assert response.json() == {"ok": True}
        assert client.get("/api/settings/sources").json() == []
