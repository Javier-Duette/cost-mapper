"""
Tests mínimos del endpoint de presupuesto desde IFC (budget:ifc).

Cobertura: endpoint responde y agrupa asignaciones activas.
También cubre _quantity_for_element para múltiples tipos IFC (IfcSlab, IfcColumn,
IfcBeam, IfcDoor) y el caso de combinación inválida tipo/unidad.
"""

from decimal import Decimal
from pathlib import Path
import sys
import tempfile

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


def _create_catalog_item(client: TestClient, *, nbr_code: str = "3E 05 20", unit: str = "m²") -> str:
    r = client.post(
        "/api/catalog/items",
        json={
            "nbr_code": nbr_code,
            "facet": nbr_code[:2],
            "description_es": "Item test",
            "unit": unit,
        },
    )
    assert r.status_code == 201
    return r.json()["id"]


def _build_ifc_with_qto(ifc_class: str, qto_name: str, properties: dict) -> tuple[str, str]:
    """Crea un IFC en memoria con un único elemento de la clase dada y un QTO.

    Retorna (global_id, ruta_al_archivo_tmp).  El archivo se escribe en un
    archivo temporal que debe ser eliminado por el caller (usando tmp_path o
    manualmente).
    """
    import ifcopenshell  # type: ignore
    import ifcopenshell.api.project  # type: ignore
    import ifcopenshell.api.root  # type: ignore
    import ifcopenshell.api.pset  # type: ignore

    model = ifcopenshell.api.project.create_file()
    ifcopenshell.api.root.create_entity(model, ifc_class="IfcProject", name="Test Project")
    ent = ifcopenshell.api.root.create_entity(model, ifc_class=ifc_class, name=f"{ifc_class} 01")
    global_id = ent.GlobalId

    if properties:
        qto = ifcopenshell.api.pset.add_qto(model, product=ent, name=qto_name)
        ifcopenshell.api.pset.edit_qto(model, qto=qto, properties=properties)

    # Escribir a archivo temporal
    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=False) as f:
        tmp_path = f.name
    model.write(tmp_path)
    return global_id, tmp_path


def _budget_for_single_element(
    client: TestClient,
    session: Session,
    *,
    ifc_class: str,
    ifc_path: str,
    global_id: str,
    catalog_unit: str,
    nbr_code: str = "3E 05 20",
) -> dict:
    """Helper: crea proyecto, ítem, seedea el elemento, asigna y llama al endpoint."""
    project_id = _create_project(client)
    item_id = _create_catalog_item(client, nbr_code=nbr_code, unit=catalog_unit)

    project = session.get(Project, project_id)
    assert project is not None
    project.ifc_file_path = ifc_path
    session.add(project)
    session.commit()

    r_seed = client.post(
        f"/api/projects/{project_id}/ifc/elements:seed",
        json={
            "elements": [
                {
                    "global_id": global_id,
                    "ifc_type": ifc_class,
                    "ifc_type_name": None,
                    "ifc_name": f"{ifc_class} 01",
                    "nbr_classification": nbr_code,
                    "qualitative_snapshot": {},
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
    return r_budget.json()


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


class TestQuantityForElement:
    """Tests de _quantity_for_element para tipos IFC más allá de IfcWall."""

    def test_ifc_slab_m2_reads_net_area(self, client: TestClient, session: Session):
        """IfcSlab con unidad m² → devuelve NetArea del QTO."""
        pytest.importorskip("ifcopenshell")
        global_id, ifc_path = _build_ifc_with_qto(
            ifc_class="IfcSlab",
            qto_name="Qto_SlabBaseQuantities",
            properties={"NetArea": 25.0},
        )
        try:
            data = _budget_for_single_element(
                client, session,
                ifc_class="IfcSlab",
                ifc_path=ifc_path,
                global_id=global_id,
                catalog_unit="m²",
                nbr_code="3E 05 20",
            )
        finally:
            Path(ifc_path).unlink(missing_ok=True)

        assert data["items_count"] == 1
        qty = data["rows"][0]["computed_quantity"]
        assert qty is not None
        assert Decimal(str(qty)) == Decimal("25.0")

    def test_ifc_column_m3_reads_net_volume(self, client: TestClient, session: Session):
        """IfcColumn con unidad m³ → devuelve NetVolume del QTO."""
        pytest.importorskip("ifcopenshell")
        global_id, ifc_path = _build_ifc_with_qto(
            ifc_class="IfcColumn",
            qto_name="Qto_ColumnBaseQuantities",
            properties={"NetVolume": 0.48},
        )
        try:
            data = _budget_for_single_element(
                client, session,
                ifc_class="IfcColumn",
                ifc_path=ifc_path,
                global_id=global_id,
                catalog_unit="m³",
                nbr_code="3F 05 10",
            )
        finally:
            Path(ifc_path).unlink(missing_ok=True)

        qty = data["rows"][0]["computed_quantity"]
        assert qty is not None
        assert Decimal(str(qty)) == Decimal("0.48")

    def test_ifc_beam_m_reads_length(self, client: TestClient, session: Session):
        """IfcBeam con unidad m → devuelve Length del QTO."""
        pytest.importorskip("ifcopenshell")
        global_id, ifc_path = _build_ifc_with_qto(
            ifc_class="IfcBeam",
            qto_name="Qto_BeamBaseQuantities",
            properties={"Length": 6.0},
        )
        try:
            data = _budget_for_single_element(
                client, session,
                ifc_class="IfcBeam",
                ifc_path=ifc_path,
                global_id=global_id,
                catalog_unit="m",
                nbr_code="3G 01 10",
            )
        finally:
            Path(ifc_path).unlink(missing_ok=True)

        qty = data["rows"][0]["computed_quantity"]
        assert qty is not None
        assert Decimal(str(qty)) == Decimal("6.0")

    def test_ifc_door_un_returns_count_one(self, client: TestClient, session: Session):
        """IfcDoor con unidad 'un' → devuelve Decimal('1') sin leer QTO."""
        pytest.importorskip("ifcopenshell")
        # Crear IFC con IfcDoor SIN QTO (properties vacías)
        global_id, ifc_path = _build_ifc_with_qto(
            ifc_class="IfcDoor",
            qto_name="Qto_DoorBaseQuantities",
            properties={},  # Sin QTO
        )
        try:
            data = _budget_for_single_element(
                client, session,
                ifc_class="IfcDoor",
                ifc_path=ifc_path,
                global_id=global_id,
                catalog_unit="un",
                nbr_code="3K 01 10",
            )
        finally:
            Path(ifc_path).unlink(missing_ok=True)

        qty = data["rows"][0]["computed_quantity"]
        assert qty is not None, "IfcDoor en 'un' debe devolver count=1, no None"
        assert Decimal(str(qty)) == Decimal("1")

    def test_ifc_wall_m3_invalid_combination_returns_none(self, client: TestClient, session: Session):
        """IfcWall con unidad m³ (combinación inválida) → computed_quantity None."""
        pytest.importorskip("ifcopenshell")
        # Usamos el fixture existente (IfcWall sin QTO) con unidad m³
        repo_root = BACKEND_DIR.parents[0]
        ifc_path = repo_root / "frontend" / "tests" / "fixtures" / "nbr_3E_05_20_wall.ifc"
        assert ifc_path.exists()

        data = _budget_for_single_element(
            client, session,
            ifc_class="IfcWall",
            ifc_path=str(ifc_path),
            global_id="0CQ_O8qyPCWQ5xz9DPFfAk",
            catalog_unit="m³",
            nbr_code="3E 05 30",
        )

        qty = data["rows"][0]["computed_quantity"]
        assert qty is None, "IfcWall en m³ es combinación inválida, debe ser None"
