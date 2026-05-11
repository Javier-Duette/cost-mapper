"""
Service del módulo ifc_importer — lógica de negocio.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlmodel import Session

from projects.models import ProjectRead
from projects import service as projects_service
from .models import IfcElementsSeedRequest, IfcImportSummary
from . import repository


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _repo_root() -> Path:
    # backend/ifc_importer/service.py -> parents[2] == repo root
    return Path(__file__).resolve().parents[2]


def _storage_dir() -> Path:
    # Reutiliza .gitignore del repo (data/ ya está ignorado)
    base = os.getenv("COST_MAPPER_DATA_DIR")
    if base:
        return Path(base).expanduser().resolve()
    return _repo_root() / "data"


def _project_ifc_path(project_id: str) -> Path:
    return _storage_dir() / "ifc" / project_id / "model.ifc"


def upload_ifc_and_import(
    session: Session,
    *,
    project_id: str,
    file: UploadFile,
) -> dict:
    """Guarda IFC, actualiza metadata del proyecto y (si está) importa elementos."""
    project = projects_service.get_project(session, project_id)

    target = _project_ifc_path(project_id)
    target.parent.mkdir(parents=True, exist_ok=True)

    with target.open("wb") as f:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)

    imported_at = _now()
    projects_service.set_ifc_import(session, project_id=project_id, ifc_file_path=str(target), ifc_imported_at=imported_at)

    # Intento opcional: ifcopenshell (puede no estar disponible en el entorno)
    imported_elements = []
    try:
        import ifcopenshell  # type: ignore
    except Exception:
        imported_elements = []
    else:
        imported_elements = _extract_elements_with_ifcopenshell(str(target), ifcopenshell)

    if imported_elements:
        total, with_nbr, without_nbr = repository.upsert_elements(
            session,
            project_id=project_id,
            elements=imported_elements,
            imported_at=imported_at,
            full_sync=True,
        )
    else:
        total, with_nbr, without_nbr = (0, 0, 0)

    summary = IfcImportSummary(
        total_elements=total,
        with_nbr_classification=with_nbr,
        without_nbr_classification=without_nbr,
    )
    return {"ok": True, "project": ProjectRead.model_validate(project), "import_summary": summary}


def _extract_elements_with_ifcopenshell(ifc_path: str, ifcopenshell_module) -> list:
    """Extracción mínima (MVP) de elementos usando ifcopenshell si está disponible."""
    from .models import IfcElementSeed

    import re

    try:
        model = ifcopenshell_module.open(ifc_path)
    except Exception:
        return []

    seeds: list[IfcElementSeed] = []

    try:
        import ifcopenshell.util.element as ifc_element_util  # type: ignore
    except Exception:  # pragma: no cover
        ifc_element_util = None

    try:
        import ifcopenshell.util.classification as ifc_class_util  # type: ignore
    except Exception:  # pragma: no cover
        ifc_class_util = None

    nbr_prefix_re = re.compile(r"^[0-5][A-Z]\\b", re.IGNORECASE)

    def _clean_text(value) -> str | None:
        if value is None:
            return None
        try:
            text = str(value).strip()
        except Exception:
            return None
        return text if text else None

    def _code_from_reference(reference) -> str | None:
        for attr in ("Identification", "ItemReference"):
            try:
                code = _clean_text(getattr(reference, attr, None))
            except Exception:
                code = None
            if code:
                return code
        return None

    def _pick_nbr_code(candidates: list[str]) -> str | None:
        if not candidates:
            return None
        for code in candidates:
            if nbr_prefix_re.match(code):
                return code
        return candidates[0]

    def _nbr_code_for_element(element) -> str | None:
        candidates: list[str] = []

        if ifc_class_util is not None:
            try:
                refs = ifc_class_util.get_references(element, should_inherit=True)
            except Exception:
                refs = set()
            for ref in refs:
                code = _code_from_reference(ref)
                if code:
                    candidates.append(code)

        if not candidates:
            for assoc in getattr(element, "HasAssociations", []) or []:
                try:
                    if not assoc.is_a("IfcRelAssociatesClassification"):
                        continue
                except Exception:
                    continue

                relating = getattr(assoc, "RelatingClassification", None)
                if relating is None:
                    continue
                try:
                    if relating.is_a("IfcClassificationReference"):
                        code = _code_from_reference(relating)
                        if code:
                            candidates.append(code)
                except Exception:
                    continue

        return _pick_nbr_code(candidates)

    for element in model.by_type("IfcElement"):
        global_id = getattr(element, "GlobalId", None)
        if not global_id:
            continue
        ifc_type = element.is_a()
        ifc_name = getattr(element, "Name", None)

        # Tipo (familia+tipo): best-effort (Revit suele exponerlo en la entidad Type)
        ifc_type_name = None
        if ifc_element_util is not None:
            try:
                type_obj = ifc_element_util.get_type(element)
            except Exception:
                type_obj = None
            if type_obj is not None:
                try:
                    ifc_type_name = getattr(type_obj, "Name", None) or getattr(type_obj, "ObjectType", None)
                except Exception:
                    ifc_type_name = None

        # Nivel: best-effort (puede no existir)
        ifc_level = None
        if ifc_element_util is not None:
            try:
                container = ifc_element_util.get_container(element)
            except Exception:
                container = None
            if container is not None and getattr(container, "is_a", None) is not None:
                try:
                    if container.is_a("IfcBuildingStorey"):
                        ifc_level = getattr(container, "Name", None)
                except Exception:
                    pass

        nbr_classification = _nbr_code_for_element(element)
        # Clasificación: best-effort, evita lógica pesada en MVP
        # (se completa cuando haya un IFC de referencia real)

        snapshot = {
            "express_id": getattr(element, "id", lambda: None)(),
            "ifc_type": str(ifc_type),
            "ifc_type_name": str(ifc_type_name) if ifc_type_name is not None else None,
            "ifc_name": str(ifc_name) if ifc_name is not None else None,
            "ifc_level": str(ifc_level) if ifc_level is not None else None,
            "nbr_classification": str(nbr_classification) if nbr_classification is not None else None,
        }

        seeds.append(
                IfcElementSeed(
                    global_id=str(global_id),
                    ifc_type=str(ifc_type),
                    ifc_type_name=str(ifc_type_name) if ifc_type_name is not None else None,
                    ifc_name=str(ifc_name) if ifc_name is not None else None,
                    ifc_level=ifc_level,
                    nbr_classification=nbr_classification,
                    qualitative_snapshot=snapshot,
            )
        )

    return seeds


def seed_elements(
    session: Session,
    *,
    project_id: str,
    payload: IfcElementsSeedRequest,
) -> IfcImportSummary:
    """Endpoint fallback: seedea ifc_elements desde frontend."""
    projects_service.get_project(session, project_id)
    imported_at = _now()

    if not payload.elements:
        raise HTTPException(status_code=400, detail="payload.elements no puede estar vacío.")

    full_sync_ids: set[str] | None = None
    if payload.full_sync:
        ids = payload.all_global_ids if payload.all_global_ids is not None else [e.global_id for e in payload.elements]
        full_sync_ids = set(ids)

    total, with_nbr, without_nbr = repository.upsert_elements(
        session,
        project_id=project_id,
        elements=payload.elements,
        imported_at=imported_at,
        full_sync=payload.full_sync,
        full_sync_global_ids=full_sync_ids,
    )

    return IfcImportSummary(
        total_elements=total,
        with_nbr_classification=with_nbr,
        without_nbr_classification=without_nbr,
    )


def list_elements(
    session: Session,
    *,
    project_id: str,
    offset: int,
    limit: int,
    query: str | None,
    status: str,
) -> dict:
    projects_service.get_project(session, project_id)

    if status not in {"active", "deleted", "all"}:
        raise HTTPException(status_code=400, detail="status inválido. Use active|deleted|all.")

    items = repository.list_elements(
        session,
        project_id=project_id,
        offset=offset,
        limit=limit,
        query=query,
        status=status,
    )
    total = repository.count_elements(session, project_id=project_id, query=query, status=status)

    return {
        "items": [i.model_dump() for i in items],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


def get_ifc_file_path(session: Session, project_id: str) -> str:
    project = projects_service.get_project(session, project_id)
    if not project.ifc_file_path:
        raise HTTPException(status_code=404, detail="El proyecto no tiene IFC importado.")
    return project.ifc_file_path
