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


def _seed_one_element(
    client: TestClient,
    project_id: str,
    *,
    global_id: str,
    snapshot: dict,
    ifc_type_name: str | None = "Muro básico 200mm",
) -> str:
    r = client.post(
        f"/api/projects/{project_id}/ifc/elements:seed",
        json={
            "elements": [
                {
                    "global_id": global_id,
                    "ifc_type": "IfcWall",
                    "ifc_type_name": ifc_type_name,
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


class TestAutoAssign:
    def test_auto_assign_creates_ifc_classification_assignment(self, client: TestClient):
        project_id = _create_project(client)
        _create_catalog_item(client, nbr_code="3E 05 20")
        element_id = _seed_one_element(client, project_id, global_id="g1", snapshot={"a": 1})

        r = client.post(f"/api/projects/{project_id}/mapping/assignments:auto")
        assert r.status_code == 200
        summary = r.json()
        assert summary["created"] == 1
        assert summary["skipped_user"] == 0

        r_auto = client.get(f"/api/projects/{project_id}/mapping/elements?tab=auto")
        assert r_auto.status_code == 200
        data = r_auto.json()
        assert data["total"] == 1
        assert data["items"][0]["element"]["id"] == element_id
        assert data["items"][0]["assignments"][0]["classification_source"] == "ifc_classification"

    def test_auto_assign_does_not_override_user_assignment(self, client: TestClient):
        project_id = _create_project(client)
        item_id = _create_catalog_item(client, nbr_code="3E 05 20")
        element_id = _seed_one_element(client, project_id, global_id="g1", snapshot={"a": 1})

        r_user = client.post(
            f"/api/projects/{project_id}/mapping/assignments",
            json={"ifc_element_id": element_id, "item_id": item_id},
        )
        assert r_user.status_code == 201

        r = client.post(f"/api/projects/{project_id}/mapping/assignments:auto")
        assert r.status_code == 200
        summary = r.json()
        assert summary["created"] == 0
        assert summary["skipped_user"] == 1

        r_auto = client.get(f"/api/projects/{project_id}/mapping/elements?tab=auto")
        assert r_auto.status_code == 200
        assert r_auto.json()["total"] == 0

    def test_auto_assign_is_idempotent(self, client: TestClient):
        project_id = _create_project(client)
        _create_catalog_item(client, nbr_code="3E 05 20")
        _seed_one_element(client, project_id, global_id="g1", snapshot={"a": 1})

        r1 = client.post(f"/api/projects/{project_id}/mapping/assignments:auto")
        assert r1.status_code == 200
        assert r1.json()["created"] == 1

        r2 = client.post(f"/api/projects/{project_id}/mapping/assignments:auto")
        assert r2.status_code == 200
        assert r2.json()["created"] == 0
        assert r2.json()["skipped_existing"] == 1


class TestGroups:
    def test_groups_list_and_assign_group(self, client: TestClient):
        project_id = _create_project(client)
        item_id = _create_catalog_item(client, nbr_code="3E 05 20")

        r_seed = client.post(
            f"/api/projects/{project_id}/ifc/elements:seed",
            json={
                "elements": [
                    {
                        "global_id": "g1",
                        "ifc_type": "IfcWall",
                        "ifc_type_name": "Muro básico 200mm",
                        "ifc_name": "W1",
                        "nbr_classification": "3E 05 20",
                        "qualitative_snapshot": {"a": 1},
                    },
                    {
                        "global_id": "g2",
                        "ifc_type": "IfcWall",
                        "ifc_type_name": "Muro básico 200mm",
                        "ifc_name": "W2",
                        "nbr_classification": "3E 05 20",
                        "qualitative_snapshot": {"a": 2},
                    },
                ],
                "full_sync": True,
            },
        )
        assert r_seed.status_code == 201

        r_groups = client.get(f"/api/projects/{project_id}/mapping/groups?tab=unassigned")
        assert r_groups.status_code == 200
        data = r_groups.json()
        assert data["total"] == 1
        assert data["items"][0]["ifc_type"] == "IfcWall"
        assert data["items"][0]["ifc_type_name"] == "Muro básico 200mm"
        assert data["items"][0]["total_elements"] == 2

        r_assign = client.post(
            f"/api/projects/{project_id}/mapping/groups:assign",
            json={"ifc_type": "IfcWall", "ifc_type_name": "Muro básico 200mm", "item_id": item_id},
        )
        assert r_assign.status_code == 200
        assert r_assign.json()["created"] == 2

        r_groups2 = client.get(f"/api/projects/{project_id}/mapping/groups?tab=unassigned")
        assert r_groups2.status_code == 200
        assert r_groups2.json()["total"] == 0

        r_manual = client.get(f"/api/projects/{project_id}/mapping/groups?tab=manual")
        assert r_manual.status_code == 200
        data_manual = r_manual.json()
        assert data_manual["total"] == 1
        assert data_manual["items"][0]["ifc_type"] == "IfcWall"
        assert data_manual["items"][0]["assigned_item"]["nbr_code"] == "3E 05 20"
