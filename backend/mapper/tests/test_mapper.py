"""
Tests mínimos del módulo mapper (panel de mapeo IFC).

Cobertura: create/delete assignments, no duplicar y tab conflicts por hash.
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
    r = client.post("/api/projects", json={"name": "P1", "location": "Asunción", "type": "residencial", "currency": "PYG"})
    assert r.status_code == 201
    return r.json()["id"]


def _create_catalog_item(client: TestClient, *, nbr_code: str = "3E 05 20") -> str:
    r = client.post(
        "/api/catalog/items",
        json={
            "nbr_code": nbr_code,
            "facet": nbr_code[:2],
            "description_es": "Item test",
            "unit": "m²",
        },
    )
    assert r.status_code == 201
    return r.json()["id"]


def _seed_one_element(client: TestClient, project_id: str, *, global_id: str, snapshot: dict) -> str:
    r = client.post(
        f"/api/projects/{project_id}/ifc/elements:seed",
        json={
            "elements": [
                {
                    "global_id": global_id,
                    "ifc_type": "IfcWall",
                    "ifc_name": "W1",
                    "nbr_classification": "3E 05 20",
                    "qualitative_snapshot": snapshot,
                }
            ],
            "full_sync": True,
        },
    )
    assert r.status_code == 201

    listed = client.get(f"/api/projects/{project_id}/ifc/elements?status=active").json()
    assert listed["total"] == 1
    return listed["items"][0]["id"]


class TestAssignments:
    def test_create_delete_and_no_duplicate(self, client: TestClient):
        project_id = _create_project(client)
        element_id = _seed_one_element(client, project_id, global_id="g1", snapshot={"a": 1})
        item_id = _create_catalog_item(client)

        r = client.post(
            f"/api/projects/{project_id}/mapping/assignments",
            json={"ifc_element_id": element_id, "item_id": item_id},
        )
        assert r.status_code == 201
        assignment_id = r.json()["id"]

        r_dup = client.post(
            f"/api/projects/{project_id}/mapping/assignments",
            json={"ifc_element_id": element_id, "item_id": item_id},
        )
        assert r_dup.status_code == 409

        r_del = client.delete(f"/api/projects/{project_id}/mapping/assignments/{assignment_id}")
        assert r_del.status_code == 204


class TestConflictsTab:
    def test_conflicts_when_geometry_hash_changes_after_user_assignment(self, client: TestClient):
        project_id = _create_project(client)
        element_id = _seed_one_element(client, project_id, global_id="g1", snapshot={"a": 1})
        item_id = _create_catalog_item(client)

        r = client.post(
            f"/api/projects/{project_id}/mapping/assignments",
            json={"ifc_element_id": element_id, "item_id": item_id},
        )
        assert r.status_code == 201

        # Cambia snapshot => geometry_hash cambia en ifc_elements
        _seed_one_element(client, project_id, global_id="g1", snapshot={"a": 2})

        r_conf = client.get(f"/api/projects/{project_id}/mapping/elements?tab=conflicts")
        assert r_conf.status_code == 200
        data = r_conf.json()
        assert data["total"] == 1
        assert data["items"][0]["element"]["global_id"] == "g1"
