# DEVLOG Ã¢â‚¬â€ Cost-Mapper V2

> **PropÃƒÂ³sito de este archivo:** Log cronolÃƒÂ³gico de sesiones de trabajo. Al final de cada sesiÃƒÂ³n se agrega una entrada con la fecha, quÃƒÂ© se implementÃƒÂ³ o decidiÃƒÂ³, quÃƒÂ© problemas aparecieron y cuÃƒÂ¡l es el siguiente paso concreto. No es un documento formal Ã¢â‚¬â€ es el puente entre sesiones para que cualquier agente (o colaborador) sepa exactamente dÃƒÂ³nde quedÃƒÂ³ el proyecto sin tener que releer todo.
> 
> **Formato de entrada:** fecha y hora (ej: `## 2026-05-06 14:30 Ã¢â‚¬â€ Titulo`) Ã‚Â· implementado Ã‚Â· problemas Ã‚Â· decisiones cambiadas Ã‚Â· prÃƒÂ³ximo paso.

## 2026-05-12 — Bugs: desmapear grupo IFC, descripción en tabla grupos, "Usos" por insumo APU

**Implementado:**
- Mapeo IFC — Desmapear grupo: botón "Desmapear grupo" en tab Asignados (manual). Llama `POST /api/projects/{id}/mapping/groups:unassign` (nuevo endpoint). Usa `list_active_elements_by_group` + `delete_assignments_for_elements` ya existentes en repository.
- Mapeo IFC — Descripción visible: columna ITEM en `MappingGroupsTable` muestra `nbr_code — description_es` (truncado, tooltip con texto completo).
- Catálogo APU — Usos por insumo: botón "Usos" por fila APU abre panel inline con lista de ítems padre que usan ese componente. Nuevo endpoint `GET /api/catalog/items/{id}/used-in`.

**Problemas resueltos:**
- TypeScript limpio (0 errores). Backend importa correctamente los nuevos modelos.

**Próximo paso:** definir siguiente feature o bug (BUGS.md no tiene más ítems abiertos por ahora).

## 2026-05-12 — Bugs resueltos: borrado de ítems, advertencia APU y mensaje 409 descriptivo

**Implementado:**
- `DetailPanel`: advertencia contextual al editar `unit_price` de un ítem con insumos APU — el modal ahora explica que el precio manual sobreescribe el APU.
- `DetailPanel`: mensaje del `confirm` de borrado actualizado para mencionar APU como condición bloqueante.
- `catalog/service.py eliminar_item`: el 409 ahora devuelve un mensaje que especifica exactamente dónde está referenciado el ítem (Biblioteca / Mapeo IFC / APU como insumo), con conteos.
- Corrección de mojibake en el string del 409 (tenía `"estÃ¡ referenciado"`).

**Problemas resueltos:**
- El borrado de un ítem usado como insumo en el APU de otro devolvía "No se puede eliminar el Ã­tem porque estÃ¡ referenciado" — genérico e ilegible. Ahora dice "APU como insumo en 1 item. Removelo de ahi primero."
- La confirmación de borrado solo mencionaba Biblioteca/Mapeo, sin avisar sobre APU.

**Próximo paso:** Implementar `project_markups` (GG, utilidad, IVA) para que el presupuesto muestre el costo total real, no solo el costo directo.

## 2026-05-12 — Sin decimales en precios ₲ y normalización de unidades

**Implementado:**
- `formatters.ts`: `fmt()` ahora redondea a 0 decimales (₲ siempre entero); nueva `fmtQty()` para cantidades de medición (hasta 3 decimales, locale es-PY).
- `BudgetView` y `LibraryView`: usan `fmtQty()` en celdas de cantidad para separar la presentación de precios (0 dec) de cantidades (hasta 3 dec).
- `catalog/models.py`: `_UNIT_ALIASES` dict normaliza unidades en los validadores de `CatalogItemCreate` y `CatalogItemUpdate` (m2→m², m3→m³, hr→h, und→un, etc.). La DB guarda siempre la forma canónica Unicode.
- DB migrada directamente: corregidas todas las filas con unidades no canónicas (m2→m², m3→m³, hr→h, "h prod"→h).

**Problemas resueltos:**
- Catálogo mostraba mezcla de m², m2, m3 en la columna UND por falta de normalización.
- Precios en ₲ mostraban decimales innecesarios (trabajamos en Guaraníes enteros).

**Próximo paso:** Advertencia al editar `unit_price` directamente cuando el ítem tiene APU (informar que los insumos dejan de ser el origen del precio). Ver BUGS.md para detalle.

## 2026-05-12 — Catálogo, Mapeo IFC y Presupuesto: correcciones y extensiones

**Implementado:**
- Budget IFC: `_quantity_for_element()` refactorizado con lookup table `_QTO_MAP`. Ahora calcula cantidades para `IfcSlab`, `IfcRoof`, `IfcCovering`, `IfcStair`, `IfcRamp` (m²), `IfcColumn`, `IfcBeam`, `IfcPile`, `IfcMember` (m o m³), `IfcFooting` (m³), `IfcDoor`, `IfcWindow`, `IfcFurnishingElement` (count=1). `_normalize_unit()` extendida con aliases de todas las unidades del sistema.
- Budget IFC: cantidades QTO redondeadas a 3 decimales (antes devolvía floats con muchos decimales).
- Mapper: límite de carga de elementos cambiado de 5.000 hardcodeado a constante configurable `_MAX_ELEMENTS_PER_TAB = 10_000`.
- Catalog: validación de unidades en backend — `CatalogItemCreate` y `CatalogItemUpdate` validan que `unit` esté en `VALID_UNITS` (frozenset de 20 unidades); devuelve 422 si no.
- Library: edición inline de `manual_quantity` directamente desde LibraryView (antes solo era posible desde BudgetView).
- BudgetView: error handling robusto en edición de cantidad — revert optimista si el PATCH falla, input disabled durante el request.
- BudgetView: encoding corrupto (mojibake) corregido en todo el archivo — símbolos como `₲`, `—`, `▾`, `ítems`, `CÓDIGO`, `DESCRIPCIÓN` ahora se muestran correctamente.
- Tests: 5 tests nuevos en `budget/tests/test_budget_ifc.py` para los nuevos tipos IFC; 6 tests nuevos en catalog para validación de unidades. Total: 39 passing.

**Problemas resueltos:**
- El presupuesto IFC mostraba 0 cantidad para cualquier elemento que no fuera IfcWall.
- BudgetView mostraba caracteres corruptos (`Ã­tems`, `CÃ"DIGO`, etc.) en toda la interfaz.
- El límite de 5.000 elementos en el mapper podía causar pérdida silenciosa de grupos grandes.
- Sin validación de unidades en backend, el ETL podía insertar unidades no reconocidas.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** Advertencia al editar `unit_price` directamente cuando el ítem tiene APU (informar que los insumos dejan de ser el origen del precio). Ver BUGS.md para detalle.

## 2026-05-11 21:52 — Fixes BUGS.md: APU suma, borrar ítems, remapeo y seed de precios demo

**Implementado:**
- Catálogo (backend): al agregar/editar APU se recalcula `unit_price` del ítem padre; si cambia el precio de un componente, se recalculan todos sus padres.
- Catálogo (backend+frontend): `DELETE /api/catalog/items/{id}` + botón de eliminar en panel (bloquea si está referenciado por Biblioteca/Mapeo o como insumo).
- Catálogo (frontend): `CreateItemModal` ahora usa dropdown de unidades soportadas.
- Mapeo IFC: remapeo por grupo desde tab **Asignados (manual)** (sobrescribe asignaciones previas del grupo).
- Scripts: `scripts/seed_demo_prices.py` para asignar precios aproximados a work items y normalizar unidades (opción `--delete-noncanonical`).

**Problemas resueltos:**
- No se sumaban insumos al total del ítem (APU no impactaba `unit_price`).
- No existía forma de eliminar ítems y el remapeo por grupo estaba bloqueado luego de asignar.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** definir política de unidades (normalización + conversión) y extender cantidades IFC por tipo (slabs/columns/beams) manteniendo guardas por unidad.

## 2026-05-11 21:01 — Presupuesto desde IFC: modo “IFC” + muros en m² (MVP)

**Implementado:**
- Backend (`budget`): endpoint `GET /api/projects/{id}/budget:ifc` que agrupa asignaciones activas y calcula `computed_quantity` en runtime desde el IFC (sin persistir cantidades).
- Backend (`budget`): `IfcWall` calcula **área m²** (best-effort vía QTO) y **solo** si el `unit` del ítem está en m² (evita mezclar m²/m³).
- Frontend (`budget_panel`): selector de fuente **Manual (Biblioteca)** vs **IFC**, con tabla y KPIs (incluye `elements_count` cuando aplica).
- Frontend (E2E): fix crash por hooks en `BudgetView` + ajuste de proxy IPv4 (`127.0.0.1`) para evitar problemas `localhost -> ::1` en Windows; Playwright vuelve a pasar.

**Problemas resueltos:**
- La UI no cargaba en E2E (React “Rendered more hooks than during the previous render” por `useMemo` después de early-returns).
- E2E intermitente por resolución de `localhost` a IPv6 cuando el backend bindeaba solo en IPv4.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** definir “sistema de unidades” (normalización + conversión) y extender cantidades IFC a más tipos (slabs, beams, columns) manteniendo guardas por unidad.

## 2026-05-11 09:08 — E2E: flujos “Limpiar → volver a cargar” y auto-asignación (Playwright)

## 2026-05-11 15:30 — Mapeo IFC: asignación por grupo (fix selección + performance)

**Implementado:**
- Backend (mapper): inserción en bulk para `auto_assign_from_ifc_classification()` y `assign_group_manual()` (evita `commit` por fila).
- Backend (mapper): query directa `list_unassigned_elements_by_group()` para asignación masiva sin límite fijo (antes podía dejar fuera grupos grandes).
- Frontend: `onSelectGroup` ahora es estable (`useCallback`) para que el grupo seleccionado no se resetee en cada re-render (habilita el panel de “Asignar al grupo”).
- Frontend (tests): fixture IFC sin clasificación (`unclassified_two_walls.ifc`) + E2E para asignación por grupo; E2E estabilizados esperando responses clave.

**Problemas resueltos:**
- Al hacer click en un grupo, la selección se borraba inmediatamente y nunca aparecía el panel de asignación (por identidad cambiante del callback).
- Asignación masiva podía ser lenta (transacción por fila) y/o incompleta por límite interno.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** conectar selección de grupo ↔ listado de elementos/visor (y definir política MVP para “re-asignar” cuando ya existe `ifc_classification`).

## 2026-05-11 15:43 — Mapeo IFC: tab “Asignados (manual)” para ver ítems mapeados

**Implementado:**
- Backend/Frontend: nuevo tab `manual` que lista grupos con asignaciones `user` y muestra el `nbr_code` del ítem asignado.
- UI: la tabla de grupos ahora incluye columna **ITEM** para visualizar rápidamente qué se asignó.

**Problemas resueltos:**
- Después de mapear un grupo, los elementos desaparecían de “Sin asignar” y no había un lugar claro para ver qué ítem quedó asignado.

**Próximo paso:** agregar vista por elementos (no solo por grupo) para inspección/edición más fina (MVP+).

**Implementado:**
- Frontend: configuración Playwright (`playwright.config.ts`) y runner que levanta backend (8002) + frontend (5173) para tests E2E.
- Frontend: fixture IFC con clasificación `3E 05 20` y tests E2E para:
  - Modo completo: import IFC → auto-asignación → tab “Auto-asignados” con `NBR=3E 05 20` y `ASIG=1`.
  - Modo local: “Limpiar” permite re-seleccionar el mismo IFC.
- Nota: en Windows el runner usa `cmd.exe /c npm.cmd ...` (Node spawn no ejecuta `.cmd` con `shell=false`). El backend requiere `python-multipart` instalado para habilitar el upload IFC (si no, devuelve 503).

**Problemas resueltos:**
- Sin cobertura automatizada del flujo de re-selección del mismo archivo y del auto-asignado desde IFC.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** correr `npm install` y `npm test` en `frontend/` (si falta `playwright install` por browsers, ejecutarlo una vez) y estabilizar selectores si la UI cambia.

## 2026-05-11 08:52 — Auto-asignación por match exacto de NBR (desde IFC)

**Implementado:**
- Backend (mapper): endpoint `POST /api/projects/{id}/mapping/assignments:auto` que crea `project_assignments` con `classification_source='ifc_classification'` cuando existe match exacto de `nbr_classification` → `catalog_items.nbr_code`.
- Backend: reglas MVP respetadas (no pisa asignaciones `user`, idempotente, evita duplicados).
- Frontend: al importar/reimportar IFC (modo completo) se ejecuta auto-asignación y se muestra toast cuando crea elementos (tab "Auto-asignados").
- Backend: tests nuevos para validar creación, no override de user e idempotencia.

**Problemas resueltos:**
- Elementos con `nbr_classification` quedaban solo como sugerencias; ahora pueden quedar auto-asignados (sin intervención del usuario) cuando el match es exacto.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** agregar E2E con Playwright para cubrir “Limpiar → volver a cargar” y “modo completo”, incluyendo verificación de auto-asignación cuando el IFC trae clasificación.

## 2026-05-10 23:25 — Backend: extraer clasificación (NBR) desde IFC

**Implementado:**
- Backend: `_extract_elements_with_ifcopenshell()` ahora intenta leer clasificación por `IfcRelAssociatesClassification` (via `ifcopenshell.util.classification.get_references()` y fallback a `HasAssociations`) y completa `nbr_classification`.
- Backend: test agregado que genera un IFC mínimo con una clasificación asignada y valida que el extractor la lea.

**Problemas resueltos:**
- Elementos importados quedaban con `nbr_classification = null` incluso cuando el IFC traía clasificación.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** auto-asignar ítems cuando exista match exacto de `nbr_classification` (creando `project_assignments` con `classification_source='ifc_classification'` sin pisar asignaciones `user`).

## 2026-05-10 23:10 — Fix lectura IFC (parser STEP)

**Implementado:**
- Frontend: lectura de IFC local sin WASM usando un parser STEP (extrae `GlobalId`, tipo y nombre) para evitar bloqueos de `web-ifc`.
- Frontend: fallback de `seed` (cuando el backend devuelve 0 elementos) ahora usa el mismo parser STEP en vez de `web-ifc`.

**Problemas resueltos:**
- La lectura local podía quedarse indefinidamente en “Leyendo…” con algunos IFCs.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** definir qué señales mínimas (nivel, Psets clave, clasificación) se extraen en MVP y si se hace en frontend o backend.

## 2026-05-10 23:35 — Fix: recargar IFC local después de “Limpiar”

**Implementado:**
- Frontend: `input[type=file]` ahora se resetea al abrir el selector y al seleccionar un archivo, permitiendo re-seleccionar el mismo `.ifc` después de “Limpiar”.
- Frontend: el modo “completo” agrega un botón para volver al modo “local” (evita quedar bloqueado sin forma de volver).
- Frontend: el modo por defecto para “Mapeo IFC” pasa a ser `full`.

**Problemas resueltos:**
- Luego de “Limpiar”, elegir el mismo IFC podía no disparar `onChange` y parecía que “ya no cargaba” hasta reiniciar la app.
- Al pasar a “Modo completo”, no había forma de volver a cargar IFC local.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** estabilizar el flujo “Modo completo” end-to-end (upload → seed/listado → mapeo) y luego decidir si se elimina el modo local o queda como herramienta de debugging.

## 2026-05-10 23:55 — Backend: importar elementos con ifcopenshell (MVP)

**Implementado:**
- Backend: `ifcopenshell==0.8.5` agregado a `backend/requirements.txt`.
- Backend: detección de `python-multipart` actualizada (`python_multipart` + compat `multipart`) para no deshabilitar el upload.
- Backend: extractor ahora usa `IfcElement` (en vez de `IfcProduct`) y guarda `qualitative_snapshot` mínimo + `ifc_level` best-effort (storey container cuando existe).
- Backend: tests agregan un caso que genera un IFC mínimo con `ifcopenshell` y valida que el upload importe elementos (y usa `COST_MAPPER_DATA_DIR` hacia `tmp_path` para no ensuciar el repo).
- Frontend: el parser STEP valida formato de `GlobalId` (22 chars) para evitar falsos positivos (ej: `IfcMaterial`).

**Problemas resueltos:**
- El modo completo podía depender demasiado del fallback; ahora el backend tiene un camino más confiable para poblar `ifc_elements`.
- Se evitó seedear entidades que no son elementos (pero tienen string como primer argumento) por error de heurística.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** extraer clasificación (IfcRelAssociatesClassification) y definir “element whitelist” para performance/pertinencia.

## 2026-05-09 20:58 — Lectura local de elementos IFC (sin visor 3D)

**Implementado:**
- Frontend: modo `read_local` en Mapeo IFC para cargar un `.ifc` local y **listar elementos** (GlobalId, tipo, nombre) usando `web-ifc`, sin backend.
- Frontend: se desactiva el render del `Viewer3D` en `App.tsx` para que el visor no bloquee el trabajo (por ahora).
- Frontend: helper reutilizable `parseIfcElementsWithWebIfc()` para parseo estable con WASM local (`public/web-ifc/`).

**Problemas resueltos:**
- El visor IFC podÃ­a romper el flujo de trabajo; ahora el foco queda en **leer datos** del IFC dentro de la app.

**Decisiones cambiadas:**
- Ninguna.

**PrÃ³ximo paso:** extender la lectura para extraer mÃ¡s seÃ±ales (nivel, clasificaciÃ³n) y luego decidir cÃ³mo persistir/usar esos datos.

## 2026-05-09 01:59 — Fix: fallback web-ifc más estable (full_sync chunked + hash robusto)

**Implementado:**
- Backend: `ifc_importer` acepta `all_global_ids` en `POST /ifc/elements:seed` para poder hacer `full_sync` aunque el seed se envíe en chunks.
- Backend: `snapshot_md5()` ignora `express_id` para evitar falsos positivos en el tab `conflicts` cuando cambia el ExpressID entre exports.
- Frontend: fallback web-ifc ahora hace `full_sync` real en el último chunk (incluye `all_global_ids`) y usa `VITE_WEB_IFC_WASM_PATH` como override.
- Frontend: se copia el WASM de `web-ifc` a `frontend/public/web-ifc/` al correr `npm run dev/build` para no depender de `unpkg` (evita “Failed to fetch” en entornos sin salida a Internet).
- Frontend: `Viewer3D` también usa `VITE_WEB_IFC_WASM_PATH` para el WASM (mejor para entornos sin acceso a `unpkg`).
- Frontend: modo “solo visor” en `mapping` para cargar un IFC local y visualizarlo sin backend (útil para aislar errores de red/proxy).
- Frontend: headers COOP/COEP en Vite dev server para habilitar `crossOriginIsolated` (web-ifc multithread cuando aplique).

**Problemas resueltos:**
- Reimport con fallback web-ifc podía dejar elementos “fantasma” como `active` (porque siempre se mandaba `full_sync=false`).
- `conflicts` podía dispararse sin cambios reales cuando el snapshot incluía `express_id`.

**Próximo paso:** probar end-to-end con `PROYECTO_EJECUTIVO.ifc` (import → seed → selección 3D ↔ tabla → asignar/quitar → reimport).

## 2026-05-09 03:15 — Implementación MVP: Panel Mapeo IFC (backend + frontend + visor 3D)

**Implementado:**
- Backend: módulos `ifc_importer/` y `mapper/` completos para MVP (upload/servir IFC, `ifc_elements`, listado/tabs, create/delete asignaciones) + tests pytest.
- Frontend: panel **Mapeo IFC** con tabs, tabla paginada, selección compartida con visor y panel inferior de detalle para asignar/quitar.
- Visor 3D real: `Viewer3D` carga IFC desde `GET /api/projects/{id}/ifc/file`, permite selección por click y resalta el elemento seleccionado.

**Problemas resueltos:**
- Conflictos de dependencias NPM para el visor (`three` y `web-ifc` requeridos por `@thatopen/components`).
- Backend: ajuste de contrato para devolver detalles del ítem en asignaciones/sugerencias sin romper tests.

**Próximo paso:** probar con un IFC real end-to-end (import → selección en visor → asignar ítems → recargar y verificar persistencia).

## 2026-05-09 03:45 — Fix: seed fallback de ifc_elements con web-ifc (cuando backend devuelve 0 elementos)

**Problemas resueltos:**
- Importar un IFC podía quedar en `0 elementos` aunque el archivo fuese válido (backend no parsea si no hay `ifcopenshell`).

**Implementado:**
- Fallback en frontend: si el upload devuelve `0 elementos`, se parsea el IFC en el navegador con `web-ifc` y se seedea `ifc_elements` vía `POST /api/projects/{id}/ifc/elements:seed`.
- Hardening del parser: si falla con tipos abstractos, se usa `IFCPRODUCT` y se fuerza `expressId` numérico para evitar errores de conversión.
- `web-ifc` con log level OFF en el fallback para evitar que warnings internos corten el flujo en algunos IFCs.

**Próximo paso:** validar con `PROYECTO_EJECUTIVO.ifc` (ARQ+EST) y ajustar el filtro de entidades si se necesita (por performance o exclusiones).

## 2026-05-08 23:24 — Plan documentado: Panel Mapeo IFC (MVP)

**Implementado:**
- Se documentó el plan de implementación del panel **Mapeo IFC** (MVP) con visor 3D en `docs/planes/PLAN_MAPEO_IFC.md`.

**Decisiones cambiadas:**
- Se fija que el MVP incluye visor 3D desde el inicio.
- Se aprueba un **fallback temporal**: si `ifcopenshell` bloquea, parsear IFC en frontend con `web-ifc` y seedear `ifc_elements` vía API (explicitado en el plan).

**Próximo paso:** iniciar etapa 1 del MVP (upload/servir IFC + visor 3D real) y luego habilitar listado de elementos + asignaciones.

## 2026-05-08 22:03 — Decisión: IFC-first; pausar keynotes como sincronización primaria

**Implementado:**
- Se formalizó la decisión de usar IFC como fuente canónica del mapeo (`GlobalId` + señales de clasificación desde Psets/ClassificationReference) y pausar keynotes como canal primario.
- Se creó el ADR-014 para fijar el alcance: keynotes queda como export opcional/auxiliar (post-MVP) y el foco inmediato pasa a `ifc_importer/` + `mapper/`.

**Problemas resueltos:**
- Se destrabó el bloqueo conceptual de “catalogación en Revit” para continuar el desarrollo del mapper sin dependencia de keynotes.

**Decisiones cambiadas:**
- ADR-014: IFC-first para mapeo; keynotes como export opcional.

**Próximo paso:** diseñar e implementar el MVP del `ifc mapper` (reglas de prioridad, extracción de señales desde IFC y endpoint de asignación `GlobalId → catalog_item_id`).

## 2026-05-09 10:30 — Validación real de keynotes en Revit (iteración de export)

**Implementado:**
- Se ajustó el export de keynotes para que Revit lo acepte: archivo tabulado con jerarquía (3 columnas), saltos CRLF y encoding UTF-16 LE con BOM.
- Se estabilizó el KEY para que sea canónico y reversible (basado en el `nbr_code` con separador `.`), evitando romper un futuro mapeo automático por keynotes.
- Se agregaron líneas contenedoras mínimas requeridas por Revit cuando un ítem referencia un padre que no existe como nodo explícito.

**Problemas resueltos:**
- Revit rechazaba el archivo por "línea incomprensible" y luego por falta de "nota clave principal" (padre inexistente).

**Decisiones cambiadas:**
- Ninguna (queda pendiente formalizar el contrato de keynotes ↔ NBR/TCPO en un ADR).

**Próximo paso:** entender cómo funciona el código TCPO/NBR y definir un esquema práctico de catalogación en Revit antes de seguir programando (documentar decisión/ADR).
## 2026-05-08 19:55 â€” Pytest backend y verificaciÃ³n API

**Implementado:**
- Se ejecutÃ³ `pytest` del backend con virtualenv local (`backend/.venv`).
- Fix en `backend/catalog/service.py`: los Ã­tems creados manualmente ahora se guardan como `is_work_item=true` para que aparezcan en la bÃºsqueda por defecto.
- Smoke test del backend levantado con Uvicorn en `127.0.0.1` (root, openapi, catalog y settings).

**Problemas resueltos:**
- `pytest` fallaba en bÃºsqueda de catÃ¡logo porque los Ã­tems creados en tests quedaban con `is_work_item=false` (default del modelo).
- `python` no era accesible desde el sandbox por permisos a `WindowsApps`; se ejecutÃ³ con el Python de Microsoft Store fuera del sandbox.

**Decisiones cambiadas:**
- Ninguna.

**PrÃ³ximo paso:** validar el archivo keynote en Revit real (flujo completo de exportaciÃ³n/consumo).

---

## 2026-05-08 18:34 â€” AuditorÃ­a, PAC y correcciones iniciales

**Implementado:**
- AuditorÃ­a profunda guardada en `docs/auditorias/AUDITORIA_2026_05_08.md`.
- Plan de AcciÃ³n Correctiva guardado en `docs/auditorias/PAC_2026_05_08.md`.
- ADR-013 creado: `AGENTS.md` pasa a ser la fuente canÃ³nica para agentes IA; `CLAUDE.md` queda como puente de compatibilidad.
- `backend/settings/` refactorizado al patrÃ³n de 4 archivos (`router.py`, `service.py`, `models.py`, `repository.py`) con tests nuevos en `backend/tests/test_settings.py`.
- Frontend corregido para que `npm.cmd run build` vuelva a pasar; tipos TS alineados con nulabilidad del backend y biblioteca de keynotes agregada.
- ExportaciÃ³n de keynotes bloquea Ã­tems no verificados por defecto, permite excepciÃ³n explÃ­cita solo para keynotes y devuelve TXT tabulado Unicode para validaciÃ³n en Revit.

**Problemas resueltos:**
- Build frontend roto por import no usado en `App.tsx`.
- `settings` escribÃ­a directo desde router y devolvÃ­a `None` donde correspondÃ­a 404.
- `AGENTS.md` existÃ­a como instrucciÃ³n operativa pero no estaba formalizado como fuente canÃ³nica.

**Decisiones cambiadas:**
- `AGENTS.md` reemplaza a `CLAUDE.md` como entrada principal multi-agente.
- `is_verified=false` bloquea entregables por defecto; keynotes admite excepciÃ³n manual documentada por su naturaleza de cÃ³digo/descripciÃ³n.
- `settings_users` y `settings_sources` se consideran catÃ¡logos transitorios pre-auth, no el sistema definitivo de usuarios.

**PrÃ³ximo paso:** ejecutar/verificar backend cuando haya Python disponible en PATH y validar el archivo keynote en Revit real.

---

## 2026-05-07 17:15 â€” Sistema de AuditorÃ­a, Configuraciones y EstandarizaciÃ³n

**Implementado:**
- **Sistema de AuditorÃ­a de Precios:** IntegraciÃ³n de `AuditModal.tsx` que exige nombre de usuario y fuente ante cualquier cambio de precio, con advertencia de impacto global.
- **Historial Visual (Audit Trail):** IncorporaciÃ³n de iconos de informaciÃ³n `(i)` con tooltips detallados (quiÃ©n cargÃ³, quiÃ©n modificÃ³ y cuÃ¡ndo) en el encabezado del panel y filas de la tabla APU.
- **MÃ³dulo de Settings (Backend):** Nuevo mÃ³dulo `backend/settings/` con soporte CRUD completo para tablas `settings_users` y `settings_sources`.
- **EstandarizaciÃ³n de Campos:** Reemplazo de inputs de texto libre por listas desplegables (select) en el flujo de auditorÃ­a, eliminando duplicados e inconsistencias.
- **Vista de GestiÃ³n de ConfiguraciÃ³n:** Nueva interfaz en la secciÃ³n de "ConfiguraciÃ³n" para gestionar (crear, editar, eliminar) los usuarios y fuentes oficiales del sistema.
- **RefactorizaciÃ³n Shared:** ExtracciÃ³n de `InlineEdit.tsx` a componentes compartidos para reutilizaciÃ³n sistÃ©mica.

**Problemas resueltos:**
- **Inconsistencia de Datos:** Se eliminÃ³ la posibilidad de ingresar nombres de fuentes o usuarios con errores tipogrÃ¡ficos mediante el uso de catÃ¡logos cerrados.
- **Encoding UTF-8:** Limpieza masiva de caracteres corruptos en `App.tsx` y `DetailPanel.tsx` causados por ediciones en entornos Windows.
- **Reactividad:** Se implementÃ³ `refreshKey` en `CatalogView` para forzar la actualizaciÃ³n de la lista al modificar Ã­tems en el panel inferior sin recargar pÃ¡gina.

**Decisiones cambiadas:**
- Se formaliza el uso de catÃ¡logos de configuraciÃ³n para campos de auditorÃ­a en lugar de texto libre.

**PrÃ³ximo paso:** Implementar la creaciÃ³n manual de Ã­tems de trabajo (Work Items) y expandir el sistema de configuraciÃ³n a tipos de cambio.

---

## 2026-05-07 12:20 â€” EjecuciÃ³n real de ETL TCPO desde la UI

**Implementado:**
## 2026-05-07 14:25 â€” OptimizaciÃ³n de Costos ETL y CorrecciÃ³n de Traducciones

**Implementado:**
- Se implementÃ³ un log de debugging (pi_debug.jsonl) para la comunicaciÃ³n con la API de Gemini, expuesto en la interfaz mediante un botÃ³n de descarga en EtlView.
- Se agregÃ³ en la UI un panel desplegable de resumen que agrupa inteligentemente las pÃ¡ginas ya procesadas para evitar la saturaciÃ³n visual de la interfaz.
- Se integrÃ³ un archivo glossary.csv en la raÃ­z de scripts/data que inyecta reglas personalizadas de traducciÃ³n regional en tiempo de ejecuciÃ³n al prompt de extractor.py (ej. "telha cerÃ¢mica" = "teja cerÃ¡mica", pero "telha trapezoidal" = "chapa trapezoidal").
- Se creÃ³ un script utilitario ix_translations.py que evaluÃ³ con Gemini el contexto en portuguÃ©s de los Ã­tems existentes en la base de datos y en el cachÃ© para restablecer las traducciones correctas de tejas/chapas afectadas por un reemplazo masivo errÃ³neo previo.

**Problemas resueltos:**
- El consumo elevado de tokens reportado en AI Studio fue causado por "alucinaciones" (markdown y texto explicativo) en las respuestas rechazadas de Gemini; esto se corrigiÃ³ forzando esponse_mime_type="application/json" en _call_gemini.
- La optimizaciÃ³n de 2 pasos ("0 Ã­tems" reportados) se validÃ³ como un comportamiento correcto al saltear llamadas costosas de datos ya almacenados.
- Se solventÃ³ el error de traducciones genÃ©ricas ("teja" vs "chapa") usando la evaluaciÃ³n semÃ¡ntica contextual de Gemini para restaurar la coherencia de la base de datos.

**Decisiones cambiadas:**
- Ninguna.

**PrÃ³ximo paso:** Continuar con el ETL o avanzar hacia la planificaciÃ³n e implementaciÃ³n del mÃ³dulo Biblioteca (gestiÃ³n de Keynotes para Revit).

- EjecuciÃƒÂ³n completa del pipeline ETL (extracciÃƒÂ³n con Gemini Vision) procesando las pÃƒÂ¡ginas 36 a 38 de la TCPO V15 directamente desde la UI del navegador (`EtlView`).
- Se validÃƒÂ³ el correcto funcionamiento del flag "Forzar" para evadir la cachÃƒÂ© de Gemini local cuando sea necesario reprocesar una pÃƒÂ¡gina.
- La base de datos SQLite (`costmapper_dev.db`) fue poblada exitosamente incrementando los ÃƒÂ­tems de catÃƒÂ¡logo reales con `is_work_item = 1`.

**Problemas resueltos:**
- Ninguno. El pipeline funcionÃƒÂ³ end-to-end segÃƒÂºn lo previsto por la arquitectura de 2-pasos.

**Decisiones cambiadas:**
- Ninguna.

**PrÃƒÂ³ximo paso:** Revisar los nuevos ÃƒÂ­tems de catÃƒÂ¡logo insertados desde la vista "CatÃƒÂ¡logo" de la UI y comenzar la implementaciÃƒÂ³n de agregar ÃƒÂ­tems al presupuesto (`POST /api/projects/{id}/library`).

## 2026-05-07 22:00 Ã¢â‚¬â€ ETL panel en UI + facetas NBR corregidas + estabilizaciÃƒÂ³n backend

**Implementado:**
- `backend/etl_runner.py`: router FastAPI standalone (`/api/etl/run` POST y `/api/etl/status` GET). Usa `subprocess.run` en `run_in_threadpool` para evitar el bug de asyncio ProactorEventLoop en Windows con pipes.
- `backend/main.py`: registrado `etl_router` con `app.include_router(etl_router)`.
- `frontend/src/components/settings_panel/EtlView.tsx`: UI completa para ejecutar el ETL desde el navegador. Cards de estadÃƒÂ­sticas (ÃƒÂ­tems en catÃƒÂ¡logo, pÃƒÂ¡ginas OK/parciales/errores), input de pÃƒÂ¡ginas, checkboxes Dry-run/Forzar, botÃƒÂ³n Ejecutar, log de output con borde verde (OK) o rojo (error).
- `frontend/src/App.tsx`: integrado `EtlView` en secciÃƒÂ³n `settings`. TÃƒÂ­tulo cambiado a `'Importar TCPO V15'`.
- `frontend/vite.config.ts`: proxy `/api` actualizado a `http://localhost:8002` (era 8000).
- `scripts/etl_tcpo/extractor.py` y `main.py`: modelo Gemini actualizado a `gemini-2.5-flash` (los modelos `gemini-2.0-flash` y `gemini-2.0-flash-lite` fueron deprecados para nuevos usuarios).
- `frontend/src/types/catalog.ts`: tipo `Faceta` ampliado con `'3R'`.
- `frontend/src/components/catalog_panel/CatalogView.tsx`: labels de facetas corregidos segÃƒÂºn NBR 15965: `3E=Elementos`, `3R=Resultados del Trabajo`, `4U=Unidades de ConstrucciÃƒÂ³n`, `2C=Componentes`, `2N=Funciones / Mano de obra`, `2Q=Equipos`. Faceta `3R` agregada al ÃƒÂ¡rbol.
- `frontend/src/components/shared/SectionHeader.tsx`: `3R` agregado al array de chips de faceta.
- `frontend/src/globals.css`: tokens CSS y clases para `3R` (color cyan `#26C6DA`).
- `iniciar.bat`: script de arranque en la raÃƒÂ­z del proyecto Ã¢â‚¬â€ abre backend (puerto 8002) y frontend (5173) en ventanas separadas y lanza el navegador en `localhost:5173`.

**Problemas resueltos:**
- `asyncio.create_subprocess_exec` con PIPE cuelga indefinidamente en Windows (ProactorEventLoop). SoluciÃƒÂ³n: `subprocess.run` sÃƒÂ­ncrono en `run_in_threadpool`.
- MÃƒÂºltiples procesos zombie en puerto 8000 de sesiones anteriores imposibilitando bind. SoluciÃƒÂ³n: cambio a puerto 8002 + `iniciar.bat` para arranque limpio.
- Los labels de facetas en el frontend usaban el nombre del Grupo 3 de NBR ("Resultados de la ConstrucciÃƒÂ³n") como label de la subfaceta `3E`. Corregido a los nombres reales de las facetas segÃƒÂºn el estÃƒÂ¡ndar.
- La faceta `3R` no aparecÃƒÂ­a en el catÃƒÂ¡logo aunque habÃƒÂ­a ÃƒÂ­tems con ese cÃƒÂ³digo. Causa: `3R` no estaba en el tipo `Faceta`, en el ÃƒÂ¡rbol, ni en el header. Agregado en los tres lugares.

**Decisiones cambiadas:**
- NingÃƒÂºn ADR nuevo. Los cambios son operacionales (port, modelo Gemini, fix de labels).

**PrÃƒÂ³ximo paso:** Procesar secciones completas del TCPO con el ETL desde la UI (quitar dry-run, correr pÃƒÂ¡ginas reales).

---

## 2026-05-07 Ã¢â‚¬â€ ETL TCPO: extracciÃƒÂ³n 2-pasos completa

**Implementado:**
- `extractor.py`: refactorizado a arquitectura 2-pasos. `_call_gemini()` como helper compartido. `extract_codes_only()` usa `_PROMPT_CODES_ONLY` (respuesta mÃƒÂ­nima, solo array de strings). `extract_table(crop, target_codes=None)` usa `_PROMPT_FULL_TEMPLATE` con los cÃƒÂ³digos nuevos inyectados.
- `loader.py`: agregado `get_existing_codes(db_path, codes) -> set[str]` Ã¢â‚¬â€ consulta SQLite filtrando `is_work_item=1` para el subconjunto de cÃƒÂ³digos dados.
- `main.py`: comando `run` actualizado con flag `--single-pass`. Flujo default 2-pasos: Paso 1 extrae cÃƒÂ³digos Ã¢â€ â€™ consulta DB Ã¢â€ â€™ Paso 2 extrae solo lo nuevo. Tablas completamente conocidas se saltean sin llamada de extracciÃƒÂ³n completa. Contador de tablas saltadas en el resumen final.

**Problemas resueltos:**
- `extractor.py` tenÃƒÂ­a referencia a `_PROMPT` (renombrado en sesiÃƒÂ³n anterior) causando `NameError` en runtime. Resuelto al completar la refactorizaciÃƒÂ³n.
- `main.py` tenÃƒÂ­a carÃƒÂ¡cter unicode `Ã¢â€ â€™` que causaba error de encoding en Windows cp1252. Reemplazado por texto ASCII en la nueva versiÃƒÂ³n del comando `run`.

**Decisiones cambiadas:**
- NingÃƒÂºn ADR nuevo. ADR-012 ya documenta la estrategia 2-pasos.

**PrÃƒÂ³ximo paso:** Configurar `GEMINI_API_KEY` en `.env` y ejecutar `python main.py run --pages 36 --dry-run` para validar el pipeline completo end-to-end contra el PDF real.

---

## 2026-05-07 17:30 Ã¢â‚¬â€ ETL TCPO: herramienta de extracciÃƒÂ³n con Gemini Vision (ADR-012)

**Implementado:**
- ADR-012: documenta la estrategia de extracciÃƒÂ³n del PDF TCPO V15 rasterizado Ã¢â‚¬â€ detecciÃƒÂ³n local de tablas con OpenCV + crop + Gemini Vision para extracciÃƒÂ³n+traducciÃƒÂ³n.
- `scripts/etl_tcpo/` Ã¢â‚¬â€ herramienta standalone con 4 mÃƒÂ³dulos:
  - `detector.py`: renderiza pÃƒÂ¡ginas con `pymupdf`, detecta tablas con contornos externos OpenCV, devuelve recortes PIL limpios.
  - `extractor.py`: envÃƒÂ­a cada recorte a `gemini-2.0-flash` con prompt especÃƒÂ­fico para TCPO, parsea JSON con esquema fijo.
  - `loader.py`: valida e inserta en `catalog_items` + `apu_components` con `is_work_item=True`, `unit_price=NULL`.
  - `main.py`: CLI click con comandos `run`, `detect`, `status`.
- Verificado en pÃƒÂ¡gina 36: **4 tablas detectadas** con recortes perfectos, incluyendo tabla con doble columna de consumos.
- `progress.json` y `debug_crops/` agregados a `.gitignore`.
- Dependencias: `pymupdf`, `opencv-python`, `Pillow`, `google-generativeai`, `click`.

**Problemas resueltos:**
- Imports relativos vs absolutos: la herramienta se corre desde `scripts/etl_tcpo/` con `python main.py`.
- Encoding Windows cp1252: eliminados caracteres especiales del output CLI.

**PrÃƒÂ³ximo paso:** Probar `python main.py run --pages 36 --dry-run` con GEMINI_API_KEY en .env para verificar extracciÃƒÂ³n end-to-end. Luego procesar secciones completas del TCPO prioritarias para Paraguay.

---

## 2026-05-07 16:00 Ã¢â‚¬â€ ADR-011: campo is_work_item para separar nodos NBR de ÃƒÂ­tems TCPO

**Implementado:**
- ADR-011 creado: documenta la decisiÃƒÂ³n de agregar `is_work_item: bool DEFAULT FALSE` a `catalog_items` para distinguir los 10.061 nodos de clasificaciÃƒÂ³n NBR 15965 (sin precio, estructurales) de los ÃƒÂ­tems de trabajo TCPO presupuestables.
- Campo `is_work_item` agregado a `CatalogItem` (SQLModel), `CatalogItemRead` y al schema SQLite.
- MigraciÃƒÂ³n incremental en `main.py` lifespan: `ALTER TABLE catalog_items ADD COLUMN is_work_item ... DEFAULT 0`. Idempotente Ã¢â‚¬â€ ignora error si ya existe.
- `repository.search()` y `repository.count()` ahora filtran `WHERE is_work_item = TRUE` por defecto (parÃƒÂ¡metro sobreescribible).
- Nueva funciÃƒÂ³n `repository.get_nbr_tree()`: retorna TODOS los nodos (is_work_item ignorado) para el ÃƒÂ¡rbol de keynotes via `parent_nbr_code`.
- `seed_tcpo_demo_item.py` actualizado: fija `is_work_item = 1` en INSERT y UPDATE de todos los ÃƒÂ­tems TCPO que crea.
- DB verificada: 10.061 nodos NBR `(is_work_item=0)` + 7 ÃƒÂ­tems TCPO `(is_work_item=1)`. API `GET /api/catalog/items` devuelve `total: 7` (solo presupuestables).
- `docs/MODELO-DE-DATOS.md`: campo `is_work_item` documentado en secciÃƒÂ³n 1.
- `docs/adrs/README.md`: fila ADR-011 agregada.

**Problemas resueltos:**
- Los 10k+ ÃƒÂ­tems del catÃƒÂ¡logo eran en realidad nodos de clasificaciÃƒÂ³n NBR sin precio (artefacto del ETL de seed_nbr). El nuevo campo separa correctamente los dos conceptos sin romper el ÃƒÂ¡rbol de keynotes Ã¢â‚¬â€ ambos tipos viven en la misma tabla relacionados por `parent_nbr_code`.

**Decisiones cambiadas:**
- ADR-011 (nuevo): separaciÃƒÂ³n NBR nodes vs TCPO work items con `is_work_item`.

**PrÃƒÂ³ximo paso:** Cargar mÃƒÂ¡s ÃƒÂ­tems TCPO reales (completar ETL desde PDF) o habilitar ediciÃƒÂ³n inline de precios en CatalogView para poblar manualmente el catÃƒÂ¡logo.

---

## 2026-05-07 14:00 Ã¢â‚¬â€ Seed ÃƒÂ­tem TCPO demo + verificaciÃƒÂ³n flujo end-to-end

**Implementado:**
- `scripts/seed_tcpo_demo_item.py`: crea un ÃƒÂ­tem TCPO V15 completo con composiciÃƒÂ³n APU y precios reales en GuaranÃƒÂ­es. ÃƒÂtem: "MamposterÃƒÂ­a de ladrillo cerÃƒÂ¡mico hueco 15Ãƒâ€”20Ãƒâ€”30cm" (`3E 04 07 01 00 00`), precio Ã¢â€šÂ² 133.635/mÃ‚Â², 6 insumos (2C Ãƒâ€” 3, 2N Ãƒâ€” 2, 2Q Ãƒâ€” 1) con coeficientes TCPO.
- Verificado flujo end-to-end en browser: CatÃƒÂ¡logo muestra el ÃƒÂ­tem con precio real Ã¢â€ â€™ click APU muestra 6 componentes con precios Ã¢â€ â€™ botÃƒÂ³n "+" agrega al proyecto con toast Ã¢â€ â€™ Presupuesto refleja el ÃƒÂ­tem reciÃƒÂ©n agregado.
- Identificado y confirmado: el campo CANT. vacÃƒÂ­o muestra "Ã¢â‚¬â€" en subtotal y el banner cuenta correctamente ÃƒÂ­tems sin cantidad.

**Problemas resueltos:**
- Todos los demÃƒÂ¡s ÃƒÂ­tems en DB tienen `unit_price = None` y descripciones en portuguÃƒÂ©s (son nodos de clasificaciÃƒÂ³n NBR cargados por ETL, sin datos TCPO de precio). El seed_tcpo_demo_item.py resuelve esto para fines de prueba.
- Encoding: datos en DB estÃƒÂ¡n en UTF-8 correcto; display incorrecto era solo artefacto de PowerShell (Windows cp1252).

**PrÃƒÂ³ximo paso:** Skills auto-discovery (CLAUDE.md actualizado), y continuar con mÃƒÂ¡s ÃƒÂ­tems demo o conectar el pipeline ETL para poblar precios reales desde Mandu'a. Alternativamente: permitir ediciÃƒÂ³n inline de `unit_price` en CatalogView para cargar precios manualmente.

---

## 2026-05-07 02:10 Ã¢â‚¬â€ Cierre de documentaciÃƒÂ³n: ADR-010 + actualizaciÃƒÂ³n de docs/

**Implementado:**

- ADR-010 creado: documenta la decisiÃƒÂ³n de agregar `manual_quantity` a `project_library` para presupuesto pre-IFC.
- `docs/adrs/README.md` actualizado con fila ADR-010.
- `docs/MODELO-DE-DATOS.md` secciÃƒÂ³n 4: campo `manual_quantity` documentado con referencia a ADR-010.
- `docs/ARQUITECTURA.md`: mÃƒÂ³dulo `projects/` agregado como secciÃƒÂ³n 2.1 (faltaba completamente). Secciones renumeradas. DescripciÃƒÂ³n de `budget/` (ahora 2.5) reescrita para reflejar comportamiento MVP vs futuro post-IFC.
- `CLAUDE.md`: ADR-010 agregado a la tabla de ADRs. Referencia a secciones de ARQUITECTURA.md corregida.

**Problemas resueltos:**

- Se omitiÃƒÂ³ el flujo documentaciÃƒÂ³n-primero en la sesiÃƒÂ³n anterior: el cÃƒÂ³digo de `manual_quantity` se escribiÃƒÂ³ sin ADR previo. Corregido retroactivamente.

**PrÃƒÂ³ximo paso:** botÃƒÂ³n "Agregar al proyecto" en `CatalogView` Ã¢â‚¬â€ `POST /api/projects/{id}/library` desde la UI para que el usuario pueda construir el presupuesto sin tocar la API directamente.

---

## 2026-05-07 01:35 Ã¢â‚¬â€ MÃƒÂ³dulos projects/, library/ y budget/ + integraciÃƒÂ³n completa frontend

**Implementado:**

- Backend `projects/` (4 archivos: models, repository, service, router): CRUD completo para proyectos. Seed automÃƒÂ¡tico de 2 proyectos demo al arrancar si la tabla estÃƒÂ¡ vacÃƒÂ­a.
- Backend `library/` (4 archivos): CRUD de biblioteca de proyecto (`project_library`). Incluye campo `manual_quantity` para cantidades manuales pre-IFC, con 409 si se intenta agregar el mismo ÃƒÂ­tem dos veces.
- Backend `budget/` (4 archivos): mÃƒÂ³dulo de solo lectura. Lee `project_library` JOIN `catalog_items` y calcula subtotales, total, conteo de ÃƒÂ­tems sin precio y sin cantidad.
- Frontend: tipos `types/projects.ts`, `types/budget.ts`. Clientes HTTP `api/projects.ts`, `api/budget.ts`.
- `Header.tsx` migrado de interfaz local a `types/projects.Project` (maneja `location: null`).
- `App.tsx`: elimina proyectos mock, carga proyectos desde `GET /api/projects` con `useEffect`. Header oculto hasta que los proyectos carguen.
- `BudgetView.tsx` reescrito: carga real desde `GET /api/projects/{id}/budget`. Banner dinÃƒÂ¡mico con conteo real de ÃƒÂ­tems sin precio/cantidad. AgrupaciÃƒÂ³n por faceta con subtotales. Empty state cuando presupuesto vacÃƒÂ­o.
- Verificado en browser: Presupuesto muestra 1 ÃƒÂ­tem real (de la prueba de integraciÃƒÂ³n), CatÃƒÂ¡logo carga faceta 3E con ÃƒÂ­tems reales del backend.

**Problemas resueltos:**

- Puerto 8000 ocupado por proceso viejo al reiniciar backend Ã¢â‚¬â€ resuelto con kill explÃƒÂ­cito del PID antes de relanzar.
- TestClient sin `with` no ejecuta el lifespan (no crea tablas) Ã¢â‚¬â€ corregido usando `with TestClient(app) as client:`.

**Decisiones cambiadas:**

- `project_library` extendido con campo `manual_quantity` (no estÃƒÂ¡ en MODELO-DE-DATOS.md original). DecisiÃƒÂ³n documentada en el cÃƒÂ³digo con comentario. Permite presupuesto manual sin IFC pipeline.

**PrÃƒÂ³ximo paso:** Implementar endpoint `POST /api/projects/{id}/library` desde el frontend (botÃƒÂ³n "Agregar al proyecto" en CatalogView) para que el usuario pueda construir el presupuesto desde la UI, sin tocar directamente la API.

---

## 2026-05-07 06:15 Ã¢â‚¬â€ ConstrucciÃƒÂ³n del Frontend React/TypeScript

**Implementado:**

- Scaffold completo de Vite + React 18 + TypeScript en `frontend/` (package.json, vite.config.ts, tsconfig.app.json, tsconfig.node.json, index.html).
- `src/globals.css` Ã¢â‚¬â€ todos los tokens del design system extraÃƒÂ­dos de `docs/design-system/theme.css` + estilos de layout, tablas, chips, sidebar, header, KPI strip, banners, modales, viewer 3D.
- `src/types/catalog.ts` Ã¢â‚¬â€ tipos TypeScript para `CatalogItem`, `APUComponent`, `CatalogSearchResult`, `Faceta`, `Section`.
- `src/api/catalog.ts` Ã¢â‚¬â€ cliente HTTP tipado para los 3 endpoints de `catalog/`: `searchItems`, `getItem`, `getItemAPU`.
- Componentes compartidos: `Icon.tsx` (22 ÃƒÂ­conos inline SVG), `Chip.tsx` (facetas NBR + badge de fuente), `formatters.ts` (fmt con locale es-PY).
- Layout: `Header.tsx` (brand + selector de proyecto con popover), `Sidebar.tsx` (nav 5 secciones + settings + tooltip), `SectionHeader.tsx` (tÃƒÂ­tulo + bÃƒÂºsqueda + toggles de faceta + switch Solo PY).
- Vistas: `CatalogView.tsx` (ÃƒÂ¡rbol de facetas + tabla con datos reales del backend), `BudgetView.tsx` (banner + KPI strip + tabla agrupada por faceta, datos mock hasta implementar `budget/`), `DetailPanel.tsx` (APU con datos reales del endpoint `/apu`), `MappingView.tsx` (empty state placeholder), `ReportsView.tsx` (3 tarjetas de exportaciÃƒÂ³n), `Viewer3D.tsx` (cubo CSS animado placeholder para @thatopen).
- `App.tsx` Ã¢â‚¬â€ layout switching dinÃƒÂ¡mico: `layout-with-panel` para CatÃƒÂ¡logo, `layout-with-viewer-panel` para Mapeo, base para el resto. Estado de selecciÃƒÂ³n separado por vista.
- `.claude/launch.json` Ã¢â‚¬â€ configuraciÃƒÂ³n del preview server.
- TypeScript limpio (`tsc --noEmit` sin errores).
- Verificado en browser: todas las secciones renderizan correctamente.

**Problemas resueltos:**

- `npm create vite` no acepta stdin piped en Windows Ã¢â€ â€™ scaffold manual de los archivos de configuraciÃƒÂ³n.
- CSS import requerÃƒÂ­a `vite-env.d.ts` con `/// <reference types="vite/client" />` para que TypeScript no reportara error.
- `CatalogView.onSelect` necesitaba pasar el objeto `CatalogItem` completo al App para alimentar el `DetailPanel`.

**Decisiones cambiadas:**

- Ninguna arquitectural. El `BudgetView` usa datos mock intencionalmente hasta que el mÃƒÂ³dulo `budget/` del backend estÃƒÂ© implementado Ã¢â‚¬â€ documentado con comentario en el archivo.

**PrÃƒÂ³ximo paso:** Levantar el backend (`uvicorn main:app --reload`) y verificar la integraciÃƒÂ³n real del CatÃƒÂ¡logo con datos TCPO/NBR. Luego implementar el mÃƒÂ³dulo `budget/` en el backend para reemplazar los mocks del `BudgetView`.

---

## 2026-05-07 00:53 Ã¢â‚¬â€ Cierre de SesiÃƒÂ³n y Handoff a Claude Code

**Implementado:**

- ExplicaciÃƒÂ³n de las acciones autÃƒÂ³nomas del Inspector (actualizaciÃƒÂ³n de su skill, correcciÃƒÂ³n del claim falso en `CLAUDE.md`, y registro en este `DEVLOG.md`). Todo funcionando correctamente y demostrando la utilidad de los roles separados.
- **Handoff / Contexto para Claude Code:** 
  1. El Backend (`catalog/`) y la BD SQLite estÃƒÂ¡n vivos y probados. 
  2. La arquitectura UX/UI fue refactorizada hacia "Vistas Dedicadas" (sin paneles globales ocultos).
  3. El diseÃƒÂ±ador IA entregÃƒÂ³ un sistema de diseÃƒÂ±o inicial que estÃƒÂ¡ extraÃƒÂ­do en `docs/design-system/` (esta carpeta es de SOLO LECTURA).
  4. Los scripts que el inspector marcÃƒÂ³ como faltantes estÃƒÂ¡n en `[WIP]` intencionalmente.

**PrÃƒÂ³ximo paso (Para Claude Code):** Arrancar la construcciÃƒÂ³n del Frontend real en React/Vite (`frontend/`). El objetivo es tomar los componentes visuales documentados en `docs/design-system/` y convertirlos en componentes funcionales reales, e integrarlos con el backend de CatÃƒÂ¡logo. Importante: Tras programar la UI, se debe dejar un reporte de "Feedback Loop" (documentado en la regla 4 de `CLAUDE.md`) para el diseÃƒÂ±ador sobre quÃƒÂ© cambiÃƒÂ³ respecto al mockup original.

---

## 2026-05-07 00:30 Ã¢â‚¬â€ AuditorÃƒÂ­a Inspector + VerificaciÃƒÂ³n de Respuesta del Constructor

**Implementado:**

- EjecuciÃƒÂ³n completa de la skill `cost-mapper-inspector`: auditorÃƒÂ­a de 15 hallazgos (5 crÃƒÂ­ticos, 5 medios, 5 bajos). Reporte guardado en `docs/auditorias/AUDITORIA_2026_05_06.md`.
- VerificaciÃƒÂ³n de la respuesta del Constructor contra el estado real del repositorio.
- CorrecciÃƒÂ³n de M1 (claim falso): ADR-007 y ADR-008 agregados a la tabla de CLAUDE.md.
- ActualizaciÃƒÂ³n de la skill del Inspector (`SKILL.md`) con:
  - Nueva metodologÃƒÂ­a "VerificaciÃƒÂ³n Post-Constructor" con protocolo de verificaciÃƒÂ³n de claims.
  - Checklist estÃƒÂ¡ndar de auditorÃƒÂ­a categorizado (repositorio, documentaciÃƒÂ³n, backend, frontend, git).
  - DescripciÃƒÂ³n ampliada en el frontmatter para capturar el caso de verificaciÃƒÂ³n de respuestas.

**Problemas resueltos:**

- Claim falso del Constructor detectado: afirmÃƒÂ³ haber agregado ADR-007 y ADR-008 a la tabla de `CLAUDE.md` pero no lo habÃƒÂ­a hecho. Corregido por el Inspector en esta sesiÃƒÂ³n.
- ViolaciÃƒÂ³n de protocolo de cierre: el Constructor no dejÃƒÂ³ entrada en el DEVLOG tras su sesiÃƒÂ³n de correcciÃƒÂ³n. Corregido con esta entrada.

**Decisiones cambiadas:**

- Ninguna. Las correcciones aplicadas son de limpieza, no de arquitectura.

**PrÃƒÂ³ximo paso:** El Constructor retoma para iniciar la construcciÃƒÂ³n del Frontend consumiendo `docs/design-system/` como referencia, conectando con los endpoints del mÃƒÂ³dulo `catalog/` que ya estÃƒÂ¡ vivo.

---

## 2026-05-06 23:56 Ã¢â‚¬â€ CreaciÃƒÂ³n de Skill de AuditorÃƒÂ­a (Inspector)

**Implementado:**

- CreaciÃƒÂ³n de una nueva skill de IA especializada en auditorÃƒÂ­a de cÃƒÂ³digo y documentaciÃƒÂ³n (`.agents/skills/cost-mapper-inspector/SKILL.md`).
- Esta skill actÃƒÂºa como un "Fiscal / QA Senior" enfocado exclusivamente en encontrar incongruencias arquitectÃƒÂ³nicas, enlaces rotos y deuda tÃƒÂ©cnica sin modificar cÃƒÂ³digo.
- ActualizaciÃƒÂ³n de `CLAUDE.md` estableciendo explÃƒÂ­citamente el concepto de "Roles de Agente IA". El agente por defecto es "Constructor", pero el usuario puede invocar al "Inspector" a demanda.

**Problemas resueltos:**

- ReducciÃƒÂ³n del uso innecesario de la ventana de contexto. Al separar la responsabilidad de auditorÃƒÂ­a en una skill opcional invocada manualmente, el agente constructor no malgasta tokens analizando todo el workspace continuamente.

**PrÃƒÂ³ximo paso:** Arrancar el desarrollo del Frontend y la integraciÃƒÂ³n con Claude Design, o ejecutar el Inspector si se requiere una auditorÃƒÂ­a profunda.

---

## 2026-05-06 23:45 Ã¢â‚¬â€ RefactorizaciÃƒÂ³n de Layout UI e IntegraciÃƒÂ³n de Sistema de DiseÃƒÂ±o

**Implementado:**

- EliminaciÃƒÂ³n de la arquitectura de "Paneles Globales Colapsables" (herencia de un prototipo antiguo) en favor de una arquitectura de "Vistas Dedicadas" (`docs/claude-design/02-LAYOUT.md`, `03-SECCIONES.md`, `INTERFAZ.md`).
- AsignaciÃƒÂ³n estricta de componentes pesados: El Visor 3D y el Panel Inspector APU ahora solo existen en las vistas que realmente lo requieren (CatÃƒÂ¡logo y Mapeo IFC). La vista Presupuesto se liberÃƒÂ³ de paneles extra para actuar como un Dashboard expansivo limpio al 100%.
- Agregada la columna "Fuente del Coeficiente" a la especificaciÃƒÂ³n de la tabla APU en `04-COMPONENTES.md`.
- InclusiÃƒÂ³n del requerimiento de un mockup PDF del presupuesto en la secciÃƒÂ³n de Informes.
- DescompresiÃƒÂ³n e integraciÃƒÂ³n del primer archivo entregable generado por Claude Design (`Cost-Mapper Design System.zip`) dentro de `docs/design-system/`.
- ActualizaciÃƒÂ³n de `CLAUDE.md` estableciendo el "Flujo de Trabajo: Sistema de DiseÃƒÂ±o", marcando el directorio como de Solo Lectura para los agentes, y exigiendo documentar el *Feedback Loop* de implementaciÃƒÂ³n.

**Problemas resueltos:**

- PrevenciÃƒÂ³n del "sÃƒÂ­ndrome de paneles escondidos" que saturaba visualmente la aplicaciÃƒÂ³n.

**Decisiones cambiadas:**

- Cambio del layout general de la aplicaciÃƒÂ³n.
- El repositorio ahora alberga una carpeta `docs/design-system/` estÃƒÂ¡tica que funciona como referencia visual/arquitectÃƒÂ³nica estricta, pero separada del cÃƒÂ³digo de producciÃƒÂ³n React en `frontend/`.

**PrÃƒÂ³ximo paso:** Entregar a Claude Design el ÃƒÂºltimo set de requerimientos actualizados (paneles estrictos, tabla APU, mockup PDF). Una vez que Claude Design genere el nuevo `.zip`, procederemos a la construcciÃƒÂ³n del `frontend/` en React/Vite consumiendo esos mockups como referencia, y conectando con el backend de CatÃƒÂ¡logo que ya estÃƒÂ¡ vivo.

---

## 2026-05-06 21:45 Ã¢â‚¬â€ ImplementaciÃƒÂ³n del mÃƒÂ³dulo catalog y carga de datos NBR

**Implementado:**

- MÃƒÂ³dulo `catalog/` desarrollado bajo el patrÃƒÂ³n SQLModel (ADR-009). Creados `models.py`, `repository.py`, `service.py`, y `router.py`.
- Base de datos configurada por defecto en SQLite para facilitar el desarrollo inmediato, con soporte para PostgreSQL en producciÃƒÂ³n (`.env.example`).
- Tests unitarios de catÃƒÂ¡logo (11/11 pasando) que cubren bÃƒÂºsqueda, paginaciÃƒÂ³n, ediciÃƒÂ³n de precios y detalle de APU.
- CreaciÃƒÂ³n de dos scripts de carga de datos (`seed.py` y `seed_nbr.py`):
  - Carga manual de 4 APUs y 15 componentes extraÃƒÂ­dos de una pÃƒÂ¡gina de la TCPO (Canteiro de obras).
  - Carga automÃƒÂ¡tica de mÃƒÂ¡s de 10,000 ÃƒÂ­tems en portuguÃƒÂ©s a partir de los 5 archivos Excel de la ABNT NBR 15965.
- ActualizaciÃƒÂ³n de las reglas del `DEVLOG.md` y `CLAUDE.md` para incluir de forma obligatoria la hora exacta en los cierres de sesiÃƒÂ³n para evitar pÃƒÂ©rdida de orden cronolÃƒÂ³gico.

**Problemas resueltos:**

- PrevenciÃƒÂ³n de lock de archivo de SQLite en Windows utilizando `SQLModel.metadata.drop_all()` en vez de borrar el archivo.
- Falta de orden cronolÃƒÂ³gico preciso en el DEVLOG corregido (se agregÃƒÂ³ formato de hora).

**Decisiones cambiadas:**

- Se mantiene el idioma portuguÃƒÂ©s puro en la base de datos por ahora para facilitar las pruebas funcionales. La traducciÃƒÂ³n se abordarÃƒÂ¡ posteriormente.

**PrÃƒÂ³ximo paso:** Cerrar sesiÃƒÂ³n (commit + push). Para la prÃƒÂ³xima sesiÃƒÂ³n, conectar el Frontend con los endpoints de este mÃƒÂ³dulo `catalog/` para que el usuario pueda explorar la base de 10,000 ÃƒÂ­tems desde la interfaz grÃƒÂ¡fica.

---

## 2026-05-06 19:45 Ã¢â‚¬â€ ReorganizaciÃƒÂ³n de ADRs y refactoring del flujo de agentes IA

**Implementado:**

- MigraciÃƒÂ³n de ADRs: `docs/DUDAS.md` (47KB, 611 lÃƒÂ­neas) Ã¢â€ â€™ `docs/adrs/` (9 archivos individuales + README ÃƒÂ­ndice). Cada ADR ahora es un `.md` separado, mÃƒÂ¡s eficiente para que los agentes lean solo lo que necesitan.
- ADR-009 (SQLModel) movido de la raÃƒÂ­z del repo a `docs/adrs/ADR-009.md` y registrado en el ÃƒÂ­ndice.
- AnÃƒÂ¡lisis completo del flujo de trabajo de agentes de IA: identificados 6 problemas de coherencia entre `CLAUDE.md` y `SKILL.md`.
- Refactoring de `CLAUDE.md`: agregadas secciones "Al inicio de cada sesiÃƒÂ³n" y "Cierre de sesiÃƒÂ³n Ã¢â‚¬â€ protocolo obligatorio" con tabla de coherencia de documentaciÃƒÂ³n. Ahora cualquier agente (no solo Antigravity) tiene las instrucciones completas.
- Refactoring de `SKILL.md`: eliminada duplicaciÃƒÂ³n de contenido (197 Ã¢â€ â€™ 134 lÃƒÂ­neas). Las secciones duplicadas ahora referencian a `CLAUDE.md` como fuente de verdad.
- ActualizaciÃƒÂ³n de 14 referencias a `DUDAS.md` en 8 archivos del repositorio.
- Eliminados archivos huÃƒÂ©rfanos: `ADR-009-SQLModel.md` (raÃƒÂ­z), `CIERRE-SESION-2026-05-06.md`.

**Problemas resueltos:**

- El protocolo de cierre de sesiÃƒÂ³n solo existÃƒÂ­a en `SKILL.md` (invisible para Claude Code, Copilot, Cursor). Movido a `CLAUDE.md`.
- `CLAUDE.md` no indicaba leer `DEVLOG.md` al inicio de sesiÃƒÂ³n. Corregido con nueva secciÃƒÂ³n.

**Decisiones cambiadas:**

- ADRs migrados de archivo monolÃƒÂ­tico a carpeta con archivos individuales (`docs/adrs/`).
- `CLAUDE.md` es ahora la fuente de verdad universal; `SKILL.md` es el amplificador.

**PrÃƒÂ³ximo paso:** Revisar y aprobar ADR-009 (migraciÃƒÂ³n a SQLModel), luego implementar mÃƒÂ³dulo `catalog/` como piloto.

---

## 2026-05-06 18:30 Ã¢â‚¬â€ DecisiÃƒÂ³n de repositorio y protocolo de git

**Implementado:**

- `docs/adrs/ADR-008.md` Ã¢â‚¬â€ estrategia de repositorio y protocolo de control de versiones. Documenta la causa raÃƒÂ­z de la pÃƒÂ©rdida de trabajo en V0 y las reglas obligatorias para evitar que se repita.
- `CLAUDE.md` Ã¢â‚¬â€ secciÃƒÂ³n "Protocolo de control de versiones" agregada. Define la regla central (push = guardado real), el protocolo para operaciones riesgosas y cÃƒÂ³mo el usuario puede verificar el estado del repositorio sin saber git.
- `CLAUDE.md` Ã¢â‚¬â€ tabla "Archivos que NO tocar" actualizada con fila para `.git/` referenciando ADR-008.

**DecisiÃƒÂ³n: repositorio nuevo para V2**

Se crea un repositorio nuevo en GitHub para V2. No se reutiliza el repositorio de V0. Razones: historial limpio, libertad de nombre, sin contaminaciÃƒÂ³n de cÃƒÂ³digo viejo, mÃƒÂ¡s simple de gestionar.

El repositorio de V0 no se borra: se archiva con la funciÃƒÂ³n "Archive repository" de GitHub (Settings Ã¢â€ â€™ General Ã¢â€ â€™ Danger Zone Ã¢â€ â€™ Archive this repository). Esto lo convierte en solo lectura con un badge "Archived" visible. Todo el historial queda disponible como referencia permanente. La operaciÃƒÂ³n de archivo es reversible y no requiere saber git Ã¢â‚¬â€ es una acciÃƒÂ³n en la interfaz web de GitHub.

**Problema documentado (causa V0):**
La frase "crear un backup" fue interpretada por el agente como copia de carpeta local, no como commit+push. El repositorio remoto no recibiÃƒÂ³ nada. Cuando la operaciÃƒÂ³n fallÃƒÂ³, el "backup" disponible era el ÃƒÂºltimo push real, con una semana de antigÃƒÂ¼edad.

**PrÃƒÂ³ximo paso:** crear el repositorio nuevo en GitHub, hacer el primer commit con la estructura de carpetas vacÃƒÂ­a (como describe CLAUDE.md), y archivar el repositorio de V0.

---

## 2026-05-06 Ã¢â‚¬â€ SesiÃƒÂ³n de anÃƒÂ¡lisis OCE y actualizaciÃƒÂ³n de documentos

**Implementado:**

- `LECCIONES-OCE.md` Ã¢â‚¬â€ anÃƒÂ¡lisis completo del repositorio OpenConstructionERP (OCE v2.7.0, AGPL-3.0). 11 secciones cubriendo: esquema BIMElement, detecciÃƒÂ³n de cambios con geometry_hash, BOQMarkup (markup de presupuesto), precisiÃƒÂ³n decimal, concurrencia optimista, APU como JSON vs relacional, estructura de 5 archivos por mÃƒÂ³dulo, patrÃƒÂ³n Alembic baseline, limpieza de huÃƒÂ©rfanos y event bus.
- `MODELO-DE-DATOS.md` Ã¢â‚¬â€ 6 cambios concretos aplicados:
  1. Mapa de entidades actualizado con nodo `project_markups`
  2. `ifc_elements`: agregado campo `geometry_hash TEXT` para detecciÃƒÂ³n rÃƒÂ¡pida de cambios cualitativos
  3. `project_assignments`: agregados `confidence DECIMAL(5,2)` y `qualitative_snapshot_at_assignment JSONB`
  4. Nueva secciÃƒÂ³n 7: tabla `project_markups` completa (GG, utilidad, IVA con `apply_to = cumulative`)
  5. Secciones renumeradas (8Ã¢â‚¬â€œ12), query de detecciÃƒÂ³n de conflicto corregida
  6. ÃƒÂndice `idx_markups_project` agregado en secciÃƒÂ³n de ÃƒÂ­ndices
- `ARQUITECTURA.md` Ã¢â‚¬â€ agregadas secciones 2.7 (convenciÃƒÂ³n 5-archivos por mÃƒÂ³dulo) y 2.8 (estrategia Alembic baseline)
- `CLAUDE.md` Ã¢â‚¬â€ convenciÃƒÂ³n de 5 archivos documentada en secciÃƒÂ³n de convenciones; Alembic agregado en "CÃƒÂ³mo correr el proyecto"

**Problemas resueltos:**

- `qualitative_snapshot_at_assignment` estaba referenciado en la query SQL de detecciÃƒÂ³n de conflictos pero **nunca definido** en el schema de `project_assignments`. Bug encontrado al revisar el MODELO-DE-DATOS.md antes de editar. Resuelto: campo agregado.
- Presupuesto sin mecanismo para GG/IVA/utilidad. Resuelto: tabla `project_markups` con `apply_to = "direct_cost" | "cumulative"` permite modelar el esquema paraguayo tÃƒÂ­pico (GG 12%, utilidad 10%, IVA 10% sobre el total con GG+utilidad).

**Decisiones tomadas:**

- **Se adopta la convenciÃƒÂ³n de 5 archivos de OCE** (router/service/models/repository/schemas) como convenciÃƒÂ³n obligatoria del proyecto. JustificaciÃƒÂ³n: permite a cualquier agente o desarrollador encontrar el cÃƒÂ³digo relevante sin explorar el ÃƒÂ¡rbol completo.
- **Se adopta el patrÃƒÂ³n Alembic baseline**: primera migraciÃƒÂ³n es no-op, `01_init_db.py` crea el schema inicial. Los dos coexisten sin conflicto.
- **Se adopta `geometry_hash`** de OCE para detecciÃƒÂ³n rÃƒÂ¡pida de cambios en reimportaciÃƒÂ³n: comparar un MD5 de string es mÃƒÂ¡s eficiente que comparar dos JSONB completos.
- **No se adopta** la serializaciÃƒÂ³n de dinero como String (OCE usa esto para evitar problemas con SQLite). PostgreSQL `DECIMAL(14,2)` es preciso en servidor; la frontera a vigilar es la serializaciÃƒÂ³n JSON hacia el frontend (usar string en la API, no float).
- **No se adopta** concurrencia optimista (campo `version`) en MVP Ã¢â‚¬â€ asumimos usuario ÃƒÂºnico o equipo muy pequeÃƒÂ±o. Se agrega en post-MVP si aparecen conflictos de escritura.

**PrÃƒÂ³ximo paso:** diseÃƒÂ±o de interfaz con Claude Design (leer `INTERFAZ.md` + `STACK-TECNOLOGICO.md` antes de iniciar). Luego: inicializaciÃƒÂ³n del repositorio de cÃƒÂ³digo y primer commit con la estructura de carpetas del `CLAUDE.md`.

---

## 2026-05-06 Ã¢â‚¬â€ SesiÃƒÂ³n de documentaciÃƒÂ³n inicial

**Implementado:**

- `MODELO-DE-DATOS.md` Ã¢â‚¬â€ schema PostgreSQL completo: tablas `catalog_items`, `apu_components`, `projects`, `project_library`, `ifc_elements`, `project_assignments`, `project_phases`, `users`. ÃƒÂndices, queries de referencia y secciÃƒÂ³n explÃƒÂ­cita de "quÃƒÂ© no estÃƒÂ¡ en el modelo".
- `ARQUITECTURA.md` Ã¢â‚¬â€ mÃƒÂ³dulos del backend (catalog, ifc_importer, mapper, budget, library, exporter), mÃƒÂ³dulos del frontend, flujos principales AÃ¢â‚¬â€œD, reglas de mÃƒÂ³dulo.
- `STACK-TECNOLOGICO.md` Ã¢â‚¬â€ justificaciÃƒÂ³n de cada tecnologÃƒÂ­a: Python/FastAPI/ifcopenshell/PostgreSQL/Gemini (ETL) + TypeScript/React/@thatopen/Playwright. SecciÃƒÂ³n "lo que no estÃƒÂ¡ decidido todavÃƒÂ­a" (ORM, hosting, auth, gestor JS).
- `INTERFAZ.md` Ã¢â‚¬â€ layout de 4 zonas (sidebar iconos Ã‚Â· ÃƒÂ¡rea principal Ã‚Â· visor 3D derecho Ã‚Â· panel de detalle inferior), header, navegaciÃƒÂ³n sidebar (6 secciones sin etiquetas de texto), las 6 secciones completas (CatÃƒÂ¡logo, Presupuesto, Mapeo IFC, Biblioteca, Informes, Ajustes), panel de detalle, visor 3D, 4 decisiones UX documentadas, secciÃƒÂ³n 13 de iconografÃƒÂ­a (set SVG monoline para Claude Design).
- `CLAUDE.md` Ã¢â‚¬â€ archivo de entrada para agentes de IA: descripciÃƒÂ³n del proyecto, tabla de ADRs, estructura del repositorio, reglas de mÃƒÂ³dulo, convenciones de cÃƒÂ³digo, archivos protegidos, comandos para correr el proyecto.
- `docs/adrs/ADR-005.md` (actualizaciÃƒÂ³n) Ã¢â‚¬â€ ADR-005 cerrado como Aceptado. Registro de documentos completados.

**Problemas resueltos:**

- `unit_price` referenciado en la query APU pero ausente del schema `catalog_items`. Resuelto: se agregÃƒÂ³ `unit_price DECIMAL(14,2)` y `currency TEXT` directamente en `catalog_items`. Los insumos (mano de obra, materiales, equipos) tienen precio propio en el catÃƒÂ¡logo Ã¢â‚¬â€ es el mismo ÃƒÂ­tem, no una tabla separada.
- Sistema de archivado/derivaciÃƒÂ³n de ÃƒÂ­tems: la FK UUID de `apu_components.component_id` apuntarÃƒÂ­a a ÃƒÂ­tems archivados. Resuelto descartando el archivado completamente.

**Decisiones cambiadas:**

- **Se descartÃƒÂ³ el historial de versiones y el archivado de ÃƒÂ­tems.** Los ÃƒÂ­tems son editables en place. El UUID nunca cambia; las FKs de APU se mantienen vÃƒÂ¡lidas automÃƒÂ¡ticamente. El campo `modificado_por` es el ÃƒÂºnico rastro de ediciÃƒÂ³n. Si en el futuro se necesita historial, se agrega un nuevo ADR.
- **Panel de desglose APU va en la zona inferior** (no en el sidebar izquierdo como en V0). Soluciona el problema de compresiÃƒÂ³n de columnas que tenÃƒÂ­a la V0.

**PrÃƒÂ³ximo paso:** DiseÃƒÂ±o de interfaz con Claude Design (leer `INTERFAZ.md` + `STACK-TECNOLOGICO.md` antes de iniciar). Luego: inicializaciÃƒÂ³n del repositorio de cÃƒÂ³digo y primer commit con la estructura de carpetas del `CLAUDE.md`.

## 2026-05-07 15:45 - EdiciÃ³n Inline, CreaciÃ³n Manual y VerificaciÃ³n de Ãtems en CatÃ¡logo

**Implementado:**
- Se corrigiÃ³ el nombre en el sidebar "CatÃ¡logo de Ãtems" que tenÃ­a errores de codificaciÃ³n.
- Se implementÃ³ la **EdiciÃ³n Inline** en el Panel APU (DetailPanel.tsx): ahora se puede hacer clic sobre el precio, coeficiente o descripciÃ³n para editarlos directamente. Los cambios establecen automÃ¡ticamente la fuente como "CUSTOM".
- Se agregÃ³ el campo is_verified a la base de datos catalog_items y se implementÃ³ un botÃ³n en la UI para **Verificar APUs** importados del TCPO. Si se edita un APU verificado, este pierde su estado de verificaciÃ³n automÃ¡ticamente.
- Se implementaron las ventanas modales para **CreaciÃ³n de Ãtems Manuales** (CreateItemModal) y **AÃ±adir Insumo Manual a un APU** (AddInsumoModal), con el objetivo de sortear las limitaciones de extracciÃ³n cuando las tablas del PDF estÃ¡n cortadas.
- Se aÃ±adiÃ³ capacidad de redimensionar (arrastrar hacia arriba) el Panel APU inferior para visualizar mÃ¡s insumos a la vez.

**Problemas resueltos:**
- Se solucionÃ³ un problema de codificaciÃ³n UTF-8 en outer.py, service.py y epository.py del mÃ³dulo catalog.
- Se ajustaron los tipos de TypeScript para la asignaciÃ³n correcta de is_verified y campos fuente.

**Decisiones cambiadas:**
- Se introdujo el concepto de "ValidaciÃ³n Humana" (is_verified) como paso obligatorio antes de poder confiar en un Ã­tem extraÃ­do del ETL, especialmente debido a las tablas fracturadas del PDF.

**PrÃ³ximo paso:** Implementar la transferencia de Ã­tems verificados al presupuesto del proyecto (POST /api/projects/{id}/library).

