"""
Router del módulo ifc_importer — endpoints FastAPI.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session

from db.session import get_session
from .models import IfcElementsSeedRequest, IfcImportSummary
from . import service


router = APIRouter(prefix="/api/projects/{project_id}/ifc", tags=["IFC Importer"])


try:
    # python-multipart >= 0.0.14 expone el paquete como `python_multipart`
    import python_multipart  # type: ignore  # noqa: F401
except Exception:
    try:
        # Compat: algunas versiones viejas exponían `multipart`
        import multipart  # type: ignore  # noqa: F401
    except Exception:
        _HAS_MULTIPART = False
    else:
        _HAS_MULTIPART = True
else:
    _HAS_MULTIPART = True


if _HAS_MULTIPART:

    @router.post("", response_model=dict, status_code=201)
    def upload_ifc(
        project_id: str,
        file: UploadFile = File(...),
        session: Session = Depends(get_session),
    ):
        return service.upload_ifc_and_import(session, project_id=project_id, file=file)

else:

    @router.post("", response_model=dict, status_code=201)
    def upload_ifc(project_id: str, session: Session = Depends(get_session)):
        raise HTTPException(
            status_code=503,
            detail='Form data requiere "python-multipart". Instalar con: pip install python-multipart',
        )


@router.get("/file")
def get_ifc_file(project_id: str, session: Session = Depends(get_session)):
    path = service.get_ifc_file_path(session, project_id)
    return FileResponse(path, media_type="application/octet-stream", filename="model.ifc")


@router.get("/elements", response_model=dict)
def list_ifc_elements(
    project_id: str,
    offset: int = 0,
    limit: int = 50,
    q: str | None = None,
    status: str = "active",
    session: Session = Depends(get_session),
):
    return service.list_elements(session, project_id=project_id, offset=offset, limit=limit, query=q, status=status)


@router.post("/elements:seed", response_model=IfcImportSummary, status_code=201)
def seed_ifc_elements(
    project_id: str,
    payload: IfcElementsSeedRequest,
    session: Session = Depends(get_session),
):
    return service.seed_elements(session, project_id=project_id, payload=payload)
