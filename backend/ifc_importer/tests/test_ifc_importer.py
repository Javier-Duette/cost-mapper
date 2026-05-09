"""
Tests mínimos del módulo ifc_importer.

Se enfocan en contratos del plan del Panel Mapeo IFC (upload/servir IFC + seed/list).
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


class TestIfcUploadAndServe:
    def test_upload_updates_project_metadata_and_serves_file(self, client: TestClient, session: Session):
        try:
            import multipart  # type: ignore  # noqa: F401
        except Exception:
            pytest.skip("python-multipart no está instalado; se saltea test de upload multipart.")

        project_id = _create_project(client)

        r = client.post(
            f"/api/projects/{project_id}/ifc",
            files={"file": ("model.ifc", b"IFC-DUMMY", "application/octet-stream")},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["ok"] is True
        assert data["project"]["id"] == project_id
        assert data["project"]["ifc_file_path"]
        assert data["project"]["ifc_imported_at"] is not None

        r2 = client.get(f"/api/projects/{project_id}/ifc/file")
        assert r2.status_code == 200
        assert r2.content == b"IFC-DUMMY"


class TestIfcSeedAndList:
    def test_seed_upsert_and_full_sync_deletes_missing(self, client: TestClient):
        project_id = _create_project(client)

        seed = {
            "elements": [
                {"global_id": "g1", "ifc_type": "IfcWall", "ifc_name": "W1", "nbr_classification": "3E 05 20", "qualitative_snapshot": {"a": 1}},
                {"global_id": "g2", "ifc_type": "IfcSlab", "ifc_name": "S1", "nbr_classification": None, "qualitative_snapshot": {"b": 2}},
            ],
            "full_sync": True,
        }
        r = client.post(f"/api/projects/{project_id}/ifc/elements:seed", json=seed)
        assert r.status_code == 201
        assert r.json()["total_elements"] == 2

        r_list = client.get(f"/api/projects/{project_id}/ifc/elements?status=active")
        assert r_list.status_code == 200
        assert r_list.json()["total"] == 2

        # Re-seed solo g1 => g2 debe quedar deleted con full_sync=True
        seed2 = {
            "elements": [
                {"global_id": "g1", "ifc_type": "IfcWall", "ifc_name": "W1b", "nbr_classification": "3E 05 20", "qualitative_snapshot": {"a": 1}},
            ],
            "full_sync": True,
        }
        r2 = client.post(f"/api/projects/{project_id}/ifc/elements:seed", json=seed2)
        assert r2.status_code == 201

        r_active = client.get(f"/api/projects/{project_id}/ifc/elements?status=active")
        assert r_active.json()["total"] == 1

        r_deleted = client.get(f"/api/projects/{project_id}/ifc/elements?status=deleted")
        assert r_deleted.json()["total"] == 1
        assert r_deleted.json()["items"][0]["global_id"] == "g2"
