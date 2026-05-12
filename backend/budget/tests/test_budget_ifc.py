"""
Tests mínimos del endpoint de presupuesto desde IFC (budget:ifc).

Cobertura: endpoint responde y agrupa asignaciones activas.
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
from projects.models import Project


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


class TestBudgetIfc:
    def test_budget_ifc_groups_assignments_and_returns_rows(self, client: TestClient, session: Session):
        project_id = _create_project(client)
        item_id = _create_catalog_item(client, nbr_code="3E 05 20")

        # Setear ifc_file_path en el proyecto (sin pasar por upload multipart).
        repo_root = BACKEND_DIR.parents[0]
        ifc_path = repo_root / "frontend" / "tests" / "fixtures" / "nbr_3E_05_20_wall.ifc"
        assert ifc_path.exists()

        project = session.get(Project, project_id)
        assert project is not None
        project.ifc_file_path = str(ifc_path)
        session.add(project)
        session.commit()

        # Seed del elemento (GlobalId coincide con el fixture)
        r_seed = client.post(
            f"/api/projects/{project_id}/ifc/elements:seed",
            json={
                "elements": [
                    {
                        "global_id": "0CQ_O8qyPCWQ5xz9DPFfAk",
                        "ifc_type": "IfcWall",
                        "ifc_type_name": None,
                        "ifc_name": "Wall 01",
                        "nbr_classification": "3E 05 20",
                        "qualitative_snapshot": {"a": 1},
                    }
                ],
                "full_sync": True,
            },
        )
        assert r_seed.status_code == 201

        listed = client.get(f"/api/projects/{project_id}/ifc/elements?status=active").json()
        element_id = listed["items"][0]["id"]

        r_assign = client.post(
            f"/api/projects/{project_id}/mapping/assignments",
            json={"ifc_element_id": element_id, "item_id": item_id},
        )
        assert r_assign.status_code == 201

        r_budget = client.get(f"/api/projects/{project_id}/budget:ifc")
        assert r_budget.status_code == 200
        data = r_budget.json()
        assert data["items_count"] == 1
        assert data["rows"][0]["nbr_code"] == "3E 05 20"
        assert data["rows"][0]["elements_count"] == 1
        # El fixture no tiene QTO; computed_quantity queda null.
        assert data["rows"][0]["computed_quantity"] is None
