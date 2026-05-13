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
def client_fixture(session: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    def get_session_override():
        return session

    monkeypatch.setenv("COST_MAPPER_DATA_DIR", str(tmp_path))
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
            import python_multipart  # type: ignore  # noqa: F401
        except Exception:
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

    def test_upload_imports_elements_with_ifcopenshell(self, client: TestClient, tmp_path: Path):
        try:
            import python_multipart  # type: ignore  # noqa: F401
        except Exception:
            try:
                import multipart  # type: ignore  # noqa: F401
            except Exception:
                pytest.skip("python-multipart no está instalado; se saltea test de upload multipart.")

        import ifcopenshell  # type: ignore
        import ifcopenshell.api.project  # type: ignore
        import ifcopenshell.api.root  # type: ignore

        model = ifcopenshell.api.project.create_file()
        ifcopenshell.api.root.create_entity(model, ifc_class="IfcProject", name="Test Project")
        ifcopenshell.api.root.create_entity(model, ifc_class="IfcWall", name="Wall 01")

        ifc_path = tmp_path / "model.ifc"
        model.write(str(ifc_path))

        project_id = _create_project(client)

        r = client.post(
            f"/api/projects/{project_id}/ifc",
            files={"file": ("model.ifc", ifc_path.read_bytes(), "application/octet-stream")},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["ok"] is True
        assert data["import_summary"]["total_elements"] >= 1

        listed = client.get(f"/api/projects/{project_id}/ifc/elements?status=active").json()
        assert listed["total"] >= 1


class TestIfcExtraction:
    def test_extract_elements_with_ifcopenshell_minimal_file(self, tmp_path: Path):
        import ifcopenshell  # type: ignore
        import ifcopenshell.api.project  # type: ignore
        import ifcopenshell.api.root  # type: ignore

        from ifc_importer import service

        model = ifcopenshell.api.project.create_file()
        ifcopenshell.api.root.create_entity(model, ifc_class="IfcProject", name="Test Project")
        ifcopenshell.api.root.create_entity(model, ifc_class="IfcWall", name="Wall 01")

        ifc_path = tmp_path / "model.ifc"
        model.write(str(ifc_path))

        seeds = service._extract_elements_with_ifcopenshell(str(ifc_path), ifcopenshell)
        assert len(seeds) >= 1
        assert seeds[0].global_id
        assert seeds[0].ifc_type.startswith("Ifc")
        assert "ifc_type" in (seeds[0].qualitative_snapshot or {})

    def test_extract_elements_with_ifcopenshell_reads_classification_reference(self, tmp_path: Path):
        import ifcopenshell  # type: ignore
        import ifcopenshell.api.project  # type: ignore
        import ifcopenshell.api.root  # type: ignore

        try:
            import ifcopenshell.api.classification as ifc_class_api  # type: ignore
        except Exception:
            pytest.skip("ifcopenshell.api.classification no estÃ¡ disponible en este entorno.")

        from ifc_importer import service

        model = ifcopenshell.api.project.create_file()
        ifcopenshell.api.root.create_entity(model, ifc_class="IfcProject", name="Test Project")
        wall = ifcopenshell.api.root.create_entity(model, ifc_class="IfcWall", name="Wall 01")

        classification = ifc_class_api.add_classification(model, classification="NBR 15965")
        ifc_class_api.add_reference(
            model,
            products=[wall],
            classification=classification,
            identification="3E 05 20",
            name="Test NBR",
        )

        ifc_path = tmp_path / "model.ifc"
        model.write(str(ifc_path))

        seeds = service._extract_elements_with_ifcopenshell(str(ifc_path), ifcopenshell)
        wall_seed = next((s for s in seeds if s.global_id == wall.GlobalId), None)
        assert wall_seed is not None
        assert wall_seed.nbr_classification == "3E 05 20"


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

    def test_excluded_ifc_types_are_silently_dropped_on_seed(self, client: TestClient):
        """IfcOpeningElement, IfcRoof, IfcSpace y IfcVirtualElement no deben persistirse."""
        project_id = _create_project(client)

        r = client.post(
            f"/api/projects/{project_id}/ifc/elements:seed",
            json={
                "elements": [
                    {"global_id": "g1", "ifc_type": "IfcWall", "qualitative_snapshot": {}},
                    {"global_id": "g2", "ifc_type": "IfcOpeningElement", "qualitative_snapshot": {}},
                    {"global_id": "g3", "ifc_type": "IfcRoof", "qualitative_snapshot": {}},
                    {"global_id": "g4", "ifc_type": "IfcSpace", "qualitative_snapshot": {}},
                    {"global_id": "g5", "ifc_type": "IfcVirtualElement", "qualitative_snapshot": {}},
                ],
                "full_sync": True,
            },
        )
        assert r.status_code == 201
        assert r.json()["total_elements"] == 1

        active = client.get(f"/api/projects/{project_id}/ifc/elements?status=active").json()
        assert active["total"] == 1
        assert active["items"][0]["ifc_type"] == "IfcWall"

    def test_seed_chunked_full_sync_with_all_global_ids(self, client: TestClient):
        project_id = _create_project(client)

        # Chunk 1 (sin full sync): g1 + g2
        r1 = client.post(
            f"/api/projects/{project_id}/ifc/elements:seed",
            json={
                "elements": [
                    {"global_id": "g1", "ifc_type": "IfcWall", "ifc_name": "W1", "nbr_classification": None, "qualitative_snapshot": {"a": 1}},
                    {"global_id": "g2", "ifc_type": "IfcSlab", "ifc_name": "S1", "nbr_classification": None, "qualitative_snapshot": {"b": 2}},
                ],
                "full_sync": False,
            },
        )
        assert r1.status_code == 201

        # Chunk 2 (último chunk con full sync): upsert g3, y marcar deleted todo lo que no esté en all_global_ids
        r2 = client.post(
            f"/api/projects/{project_id}/ifc/elements:seed",
            json={
                "elements": [
                    {"global_id": "g3", "ifc_type": "IfcDoor", "ifc_name": "D1", "nbr_classification": None, "qualitative_snapshot": {"c": 3}},
                ],
                "full_sync": True,
                "all_global_ids": ["g1", "g3"],
            },
        )
        assert r2.status_code == 201

        active = client.get(f"/api/projects/{project_id}/ifc/elements?status=active").json()
        assert active["total"] == 2
        assert sorted([i["global_id"] for i in active["items"]]) == ["g1", "g3"]

        deleted = client.get(f"/api/projects/{project_id}/ifc/elements?status=deleted").json()
        assert deleted["total"] == 1
        assert deleted["items"][0]["global_id"] == "g2"
