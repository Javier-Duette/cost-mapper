# Plan — Panel Mapeo IFC (MVP) con visor 3D

**Objetivo del MVP:** poder **importar un IFC**, **verlo en 3D**, **listar elementos** y **crear asignaciones** persistidas `GlobalId → catalog_item_id` para el proyecto activo.

**Base de diseño:** ADR-004 (flujo IFC) + ADR-014 (IFC-first; keynotes no es canal primario). En este MVP no usamos IA: las sugerencias son determinísticas y se busca aprender rápido “qué estamos intentando llegar a ser” con un flujo real testeable.

---

## Resultado esperado (criterios de éxito)

- El usuario importa un `.ifc` en la sección **Mapeo IFC**.
- El visor 3D muestra el modelo cargado.
- La UI muestra una tabla de elementos IFC y permite buscar/paginar.
- El usuario selecciona un elemento (en tabla o en 3D) y:
  - ve sus atributos BIM/snapshot
  - ve sus asignaciones actuales
  - puede buscar un ítem del catálogo y asignarlo
  - puede quitar asignaciones existentes
- Todo queda persistido en DB (`ifc_elements`, `project_assignments`) y es reproducible al recargar.

---

## Contratos (API) — Backend

### 1) Import / archivo IFC

- `POST /api/projects/{project_id}/ifc` (multipart form-data, campo `file`)
  - Guarda el IFC en disco bajo un path estable por proyecto.
  - Actualiza `projects.ifc_file_path` y `projects.ifc_imported_at`.
  - Si `ifcopenshell` está disponible: extrae y upsertea `ifc_elements` y devuelve `import_summary`.
  - Respuesta (mínimo):
    - `ok: bool`
    - `project: ProjectRead`
    - `import_summary: { total_elements, with_nbr_classification, without_nbr_classification }`

- `GET /api/projects/{project_id}/ifc/file`
  - Devuelve el IFC “actual” del proyecto para que el visor lo cargue.

### 2) Elementos IFC

- `GET /api/projects/{project_id}/ifc/elements?offset&limit&q&status=active|deleted|all`
  - Lista paginada de `ifc_elements` con campos mínimos:
    - `id, global_id, ifc_type, ifc_name, ifc_level, nbr_classification, geometry_hash, status, last_import_at`
  - Respuesta: `{ items, total, offset, limit }`.

### 3) Mapper (tabs + asignaciones)

- `GET /api/projects/{project_id}/mapping/elements?tab=auto|unassigned|conflicts&offset&limit&q`
  - Devuelve filas con:
    - `element` (de `ifc_elements`)
    - `assignments[]` (de `project_assignments`, con `classification_source`)
    - `suggestions[]` (máx 5, determinísticas)

- `POST /api/projects/{project_id}/mapping/assignments`
  - Input: `{ ifc_element_id: str, item_id: str }`
  - Crea `project_assignments` con:
    - `classification_source = "user"`
    - `qualitative_snapshot_at_assignment = ifc_elements.qualitative_snapshot` (en el momento)
  - Regla: evitar duplicado `(ifc_element_id, item_id)`.

- `DELETE /api/projects/{project_id}/mapping/assignments/{assignment_id}`

---

## Datos (DB) — tablas y reglas

### `ifc_elements`

Fuente: import IFC (preferentemente con `ifcopenshell`) o seed desde frontend (ver fallback).

Campos clave:
- Unicidad: `UNIQUE(project_id, global_id)`
- `nbr_classification`: código NBR del IFC si existe (nullable).
- `qualitative_snapshot` (JSON) + `geometry_hash` (hash estable del snapshot serializado).
- `status`: `"active" | "deleted"` (en reimport: lo no presente pasa a deleted).

### `project_assignments`

Fuente: acciones de usuario (MVP) y más adelante auto-asignación por clasificación IFC.

Campos clave:
- `classification_source`: `"ifc_classification" | "user"`
- `qualitative_snapshot_at_assignment`: snapshot del elemento al confirmar la asignación (para conflictos).

Regla de conflicto (MVP):
- Si existe asignación con `classification_source="user"` y el elemento reimportado cambia (`ifc_elements.geometry_hash` difiere), el elemento aparece en tab `conflicts`.

---

## Sugerencias (sin IA) — diseño del MVP

Objetivo: ayudar a testear el flujo sin bloquear en “modelado perfecto”.

1) Si el elemento tiene `nbr_classification`:
- Normalizar código (puntos → espacios, colapsar espacios, trim).
- Buscar match en `catalog_items.nbr_code` filtrando `is_work_item=true`.
- Confidence:
  - 100.00 si match exacto
  - menor si es prefijo/heurística simple (no más de 2 reglas en MVP)

2) Si el elemento no tiene `nbr_classification`:
- Sugerir ítems de `project_library` del proyecto (candidatos del proyecto), confidence baja.

---

## Frontend — comportamiento y estado

### Estado en `App`
- El layout ya reserva visor 3D en sección `mapping`.
- Agregar estado compartido: `selectedGlobalId` (string | null) para sincronizar tabla ↔ visor.

### `MappingView`
- Sin IFC: empty-state + botón “Importar IFC”.
- Con IFC:
  - Tabs: Auto-asignados / Sin asignar / Conflictos.
  - Tabla paginada por **grupos** (IfcType + tipo) consumiendo `GET /api/projects/{id}/mapping/groups`.
  - Selección de grupo habilita “detalle de grupo” (mapeo masivo).
  - Panel inferior “detalle de grupo”:
    - resumen del grupo (IfcType + tipo + cantidad)
    - buscador catálogo (reusa `GET /api/catalog/items`) + botón “Asignar al grupo”

**Nota (MVP):** para mantener el flujo simple y testeable, se prioriza **1 ítem por elemento**. La asignación de múltiples ítems por elemento se considera **post-MVP**.

### `Viewer3D` (visor 3D real)
- Implementar con `@thatopen/components`.
- Cargar IFC desde `GET /api/projects/{id}/ifc/file`.
- Click en 3D:
  - obtener `GlobalId` del elemento y ejecutar `onSelectGlobalId(globalId)`.
- MVP de highlight:
  - requisito mínimo: selección funcional (aunque el highlight sea simple o se deje como “siguiente iteración inmediata”).

---

## Fallback aprobado (si `ifcopenshell` bloquea)

Si no se puede instalar/ejecutar `ifcopenshell` en backend:
- Parsear el IFC en el navegador usando `web-ifc` para extraer:
  - `GlobalId`, `IfcType`, nombre, nivel (si está), y un snapshot cualitativo mínimo.
- Enviar a backend por un endpoint de seed:
  - `POST /api/projects/{project_id}/ifc/elements:seed`
- Dejar explicitado en `DEVLOG.md` como solución temporal de iteración rápida.

---

## Orden de implementación (entregables testeables)

1) Backend: upload + servir IFC + persistir metadata en `projects`.
2) Frontend: visor 3D real cargando el IFC del proyecto (primer “wow test”).
3) Backend: `ifc_elements` (ifcopenshell o seed fallback) + listado.
4) Backend: mapper + asignaciones (create/delete) + tabs + sugerencias.
5) Frontend: tabla + panel de detalle de mapeo (asignar/quitar).
6) Conflictos por hash + refinamiento UX/performance.

---

## Test plan (mínimo)

Backend (pytest):
- Upload IFC: crea/actualiza `ifc_file_path` y `ifc_imported_at`.
- Seed fallback: upsert de `ifc_elements` y unicidad por `project_id+global_id`.
- Asignaciones: crear/quitar y no duplicar.
- Conflictos: cambia `geometry_hash` del elemento y aparece en tab `conflicts` si hay asignación `user`.

Frontend (smoke):
- Importar IFC y verlo en 3D.
- Selección desde visor y desde tabla.
- Asignar ítem desde buscador y ver persistencia al recargar.
