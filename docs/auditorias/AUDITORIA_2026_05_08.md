# Auditoría Cost-Mapper — 2026-05-08

**Inspector:** cost-mapper-inspector (rol QA Senior)  
**Alcance:** workspace actual completo, incluyendo cambios sin commit.  
**Modo:** auditoría sin correcciones de código.  
**Metodología:** inventario `rg --files` + estado Git + cruce documental + muestreo dirigido backend/frontend/ETL + checks no destructivos.

---

## Resumen ejecutivo

El proyecto avanzó sustancialmente desde la auditoría del 2026-05-06: ya existen módulos reales de `projects`, `library`, `budget`, `settings`, frontend React funcional, ETL TCPO con Gemini Vision, y generación inicial de keynotes.

El riesgo principal ya no es "documentación adelantada" sino **desfase entre arquitectura documentada y código que está creciendo rápido**. Hay tres focos de atención:

1. El workspace contiene cambios relevantes sin commit, incluyendo `AGENTS.md` sin seguimiento. Según ADR-008, este estado todavía no cuenta como guardado real.
2. `settings` fue implementado como router directo contra DB y rompe la convención de 4 archivos / capas.
3. El frontend no compila actualmente por TypeScript estricto (`Icon` importado y no usado en `App.tsx`).

**Total de hallazgos:** 5 Críticos · 7 Medios · 5 Bajos

---

## Contexto verificado

- Último commit local: `9a638c4 feat: implement audit system with official settings lists and management UI`.
- `git status --short` muestra cambios sin commit en `backend/library/*`, `frontend/src/*`, y archivos nuevos `AGENTS.md` y `frontend/src/components/library_panel/LibraryView.tsx`.
- `AGENTS.md` existe en el workspace pero no está versionado (`git ls-files AGENTS.md` no lo lista).
- `pytest` no pudo ejecutarse porque `pytest`, `python` y `py` no están disponibles en PATH.
- `npm.cmd run build` sí se ejecutó y falla en TypeScript antes de llegar a Vite.

---

## Críticos

### C1 — El workspace actual viola el protocolo de guardado real de ADR-008

**Evidencia:** `git status --short` reporta 11 archivos modificados y 2 archivos nuevos sin seguimiento. Entre ellos: `backend/library/models.py`, `backend/library/service.py`, `frontend/src/App.tsx`, `frontend/src/components/reports_panel/ReportsView.tsx`, `frontend/src/types/library.ts`, `AGENTS.md` y `frontend/src/components/library_panel/LibraryView.tsx`.

**Impacto:** bloquea cierre seguro de sesión. ADR-008 define que push = guardado real; el estado actual puede perderse o quedar invisible para otros agentes/colaboradores.

**Ubicación:** workspace Git completo.

**Recomendación:** antes de nuevas tareas de construcción, estabilizar estos cambios, revisar que el build pase, actualizar DEVLOG y hacer commit + push.

**Bloqueo:** MVP operativo y continuidad del proyecto.

---

### C2 — `AGENTS.md` es ahora fuente operativa, pero no está versionado

**Evidencia:** `AGENTS.md` existe en la raíz y el usuario lo está usando como instrucción principal. `git ls-files AGENTS.md` no devuelve el archivo. En cambio, `CLAUDE.md` sí está versionado y las skills siguen apuntando mayormente a `CLAUDE.md`.

**Impacto:** alto riesgo de bifurcación del contrato de agentes. Codex ve `AGENTS.md`, otros agentes pueden seguir `CLAUDE.md`, y GitHub no reflejará el archivo nuevo si no se agrega.

**Ubicación:** `AGENTS.md`, `CLAUDE.md`, `.agents/skills/cost-mapper-agent/SKILL.md`, `.agents/skills/cost-mapper-inspector/SKILL.md`.

**Recomendación:** decidir una fuente canónica: mantener `AGENTS.md` y actualizar skills/docs para referenciarlo, o eliminarlo y conservar `CLAUDE.md`. Luego versionar la decisión.

**Bloqueo:** continuidad entre agentes y cumplimiento de ADR-006/ADR-008.

---

### C3 — El frontend no compila

**Evidencia:** `npm.cmd run build` falla con:

```text
src/App.tsx(25,1): error TS6133: 'Icon' is declared but its value is never read.
```

`tsconfig.app.json` tiene `noUnusedLocals: true`, por lo que cualquier import no usado bloquea el build.

**Impacto:** el frontend no puede producir artefacto de build. Aunque sea una falla simple, actualmente bloquea verificación mínima antes de PR o cierre de sesión.

**Ubicación:** `frontend/src/App.tsx`.

**Recomendación:** eliminar el import no usado o usarlo realmente. Reejecutar `npm.cmd run build`.

**Bloqueo:** MVP frontend.

---

### C4 — `settings` rompe la arquitectura por capas y concentra DB + lógica en el router

**Evidencia:** `backend/settings/` solo contiene `router.py` y `models.py`; faltan `service.py` y `repository.py`. `backend/settings/router.py` ejecuta `select()`, `session.add()`, `session.delete()` y `session.commit()` directamente desde endpoints. `docs/ARQUITECTURA.md` sección 2.10 exige `router.py`, `service.py`, `models.py`, `repository.py`.

**Impacto:** rompe el patrón de módulo más importante del backend. Además, introduce una excepción no documentada, distinta de `etl_runner.py`, que sí tiene justificación explícita.

**Ubicación:** `backend/settings/router.py`, `backend/settings/models.py`, `docs/ARQUITECTURA.md`.

**Recomendación:** refactorizar `settings` a 4 archivos o documentar formalmente una excepción. Por consistencia, la opción recomendada es crear `service.py` y `repository.py`.

**Bloqueo:** arquitectura mantenible del MVP.

---

### C5 — `settings` devuelve `None` donde FastAPI espera un modelo

**Evidencia:** `backend/settings/router.py` tiene `response_model=UserSetting` y `response_model=SourceSetting`, pero en `update_user()` y `update_source()` hace `if not db_user: return None` / `if not db_source: return None`.

**Impacto:** para IDs inexistentes, la API puede responder con error de validación o comportamiento inconsistente en vez de un 404 claro. Esto afecta una vista expuesta de configuración.

**Ubicación:** `backend/settings/router.py`.

**Recomendación:** mover la validación a service y lanzar `HTTPException(status_code=404)` cuando no exista el recurso.

**Bloqueo:** estabilidad de Settings UI.

---

## Medios

### M1 — Campos de verificación/auditoría implementados pero no documentados en el modelo de datos

**Evidencia:** `CatalogItem` tiene `is_verified`, `verificado_por` y `fecha_verificacion`. `docs/MODELO-DE-DATOS.md` no documenta esos campos en `catalog_items`. `docs/ARQUITECTURA.md` menciona `settings_users` y `settings_sources`, pero `MODELO-DE-DATOS.md` todavía documenta una tabla genérica `users`.

**Impacto:** el schema conceptual dejó de representar el sistema real. Esto es sensible porque estos campos bloquean exportaciones y keynotes.

**Ubicación:** `backend/catalog/models.py`, `backend/settings/models.py`, `docs/MODELO-DE-DATOS.md`, `docs/ARQUITECTURA.md`.

**Recomendación:** actualizar `MODELO-DE-DATOS.md` con `settings_users`, `settings_sources` y campos de verificación en `catalog_items`. Evaluar si requiere ADR nuevo o actualización explícita del ADR existente.

**Bloqueo:** documentación de arquitectura y futuras migraciones.

---

### M2 — `ARQUITECTURA.md` afirma que edición inline de precios está pendiente, pero el código ya la implementa

**Evidencia:** `docs/ARQUITECTURA.md` sección `catalog_panel` dice que la edición de precio/fuente está "pendiente de implementar". El código actual incluye `AuditModal`, `InlineEdit`, `updateItem()` y actualización de precio/fuente desde `DetailPanel.tsx`.

**Impacto:** un agente o colaborador podría intentar implementar una funcionalidad ya existente, duplicando UI o endpoints.

**Ubicación:** `docs/ARQUITECTURA.md`, `frontend/src/components/shared/DetailPanel.tsx`, `frontend/src/components/shared/AuditModal.tsx`, `frontend/src/api/catalog.ts`.

**Recomendación:** actualizar estado actual del `catalog_panel` y registrar el flujo de auditoría como implementado.

**Bloqueo:** no bloquea MVP, pero afecta planificación.

---

### M3 — `INTERFAZ.md` declara Settings post-MVP, pero ya se implementó gestión de usuarios/fuentes

**Evidencia:** `docs/INTERFAZ.md` sección 9 dice que la configuración general del sistema es post-MVP. El código actual tiene `SettingsView.tsx` y endpoints CRUD para usuarios/fuentes oficiales.

**Impacto:** documentación UX desactualizada. Esta vista ya forma parte del flujo de auditoría de precios y verificación.

**Ubicación:** `docs/INTERFAZ.md`, `frontend/src/components/settings_panel/SettingsView.tsx`, `backend/settings/router.py`.

**Recomendación:** actualizar `INTERFAZ.md` para separar ETL, usuarios de verificación y fuentes oficiales como estado MVP implementado.

**Bloqueo:** planificación y diseño, no runtime.

---

### M4 — Tipos TypeScript no reflejan nulabilidad real del backend

**Evidencia:** `CatalogItemRead` en backend permite `unit_price`, `currency`, `fuente_precios` y `fuente_factores` como `None`. En `frontend/src/types/catalog.ts`, `CatalogItem.unit_price`, `currency`, `fuente_precios`, `fuente_factores` están tipados como no-null. Lo mismo ocurre con `APUComponentRead.precio`, `currency`, `fuente_precio`.

**Impacto:** TypeScript permite usos inseguros. La UI ya sabe que hay ítems sin precio, pero los tipos dicen lo contrario.

**Ubicación:** `backend/catalog/models.py`, `frontend/src/types/catalog.ts`.

**Recomendación:** alinear tipos frontend con response models del backend (`number | null`, `string | null`) y revisar renderizados que dependan de esos campos.

**Bloqueo:** robustez frontend ante datos reales TCPO incompletos.

---

### M5 — `Icon` se usa con nombres no existentes

**Evidencia:** `LibraryView.tsx` usa `<Icon name="download" />` y `<Icon name="trash" />`. `Icon.tsx` define `export`, `import`, `delete`, etc., pero no `download` ni `trash`.

**Impacto:** los botones de exportación/remoción aparecen sin icono. No rompe compilación porque `Icon` retorna `null`, pero sí degrada UX y contradice el sistema visual.

**Ubicación:** `frontend/src/components/library_panel/LibraryView.tsx`, `frontend/src/components/shared/Icon.tsx`.

**Recomendación:** usar nombres existentes (`export`, `delete`) o agregar iconos al set.

**Bloqueo:** bajo para MVP, medio para calidad UI.

---

### M6 — `library.repository` devuelve diccionarios aunque el contrato dice modelos tipados

**Evidencia:** `repository.list_entries()` arma `data = entry.model_dump()` y agrega campos del `CatalogItem` en un dict. `service.list_entries()` declara retorno `list[LibraryEntryReadWithItem]`, pero recibe dicts.

**Impacto:** funciona por serialización de FastAPI, pero debilita el contrato interno y contradice la intención de SQLModel/ADR-009 de tipos claros.

**Ubicación:** `backend/library/repository.py`, `backend/library/service.py`, `backend/library/models.py`.

**Recomendación:** construir instancias `LibraryEntryReadWithItem` o ajustar las anotaciones a la realidad y justificarlo.

**Bloqueo:** mantenibilidad.

---

### M7 — La generación de keynotes ya existe, pero el estado documental sigue mezclado

**Evidencia:** `backend/library/router.py` expone `GET /api/projects/{id}/library/export/keynotes` y `service.generate_keynotes_file()` genera TSV. `docs/ARQUITECTURA.md` todavía presenta parte del keynote file como pendiente en la sección `library`, mientras otros flujos ya lo asumen.

**Impacto:** el roadmap de Biblioteca queda ambiguo: no queda claro si falta el backend, la UI, filtros de faceta, codificación Revit o QA.

**Ubicación:** `backend/library/router.py`, `backend/library/service.py`, `docs/ARQUITECTURA.md`, `docs/INTERFAZ.md`.

**Recomendación:** documentar estado granular: export básico implementado; pendientes filtros de faceta, codificación final para Revit, tests y validación con archivo real.

**Bloqueo:** roadmap de Biblioteca/Revit.

---

## Bajos

### B1 — Mojibake extendido en documentación y algunos docstrings

**Evidencia:** `rg "Ã|â|Â"` detecta corrupción en `DEVLOG.md`, docstrings de backend y varias secciones de docs. Ejemplos: `Cost-Mapper V2 â€”`, `CatÃ¡logo`, `Ã­tems`, `â†’`.

**Impacto:** dificulta lectura y puede confundir búsquedas textuales. No necesariamente indica corrupción de datos de DB, pero sí de archivos fuente/documentales.

**Ubicación:** `DEVLOG.md`, `backend/catalog/service.py`, `backend/catalog/repository.py`, múltiples docs.

**Recomendación:** hacer limpieza UTF-8 controlada por archivo, con diff revisado. Priorizar docs de entrada (`DEVLOG`, `AGENTS/CLAUDE`, skills) y UI visible.

---

### B2 — `catalog.service` mantiene imports locales y helpers privados

**Evidencia:** `catalog.service` importa `_now` y `_uuid` desde `models.py` y además hace imports locales de `APUComponent`, `_uuid` y `HTTPException` dentro de funciones.

**Impacto:** acoplamiento innecesario entre service y detalles privados del modelo. No bloquea, pero baja la calidad de mantenimiento.

**Ubicación:** `backend/catalog/service.py`, `backend/catalog/models.py`.

**Recomendación:** mover helpers a utilidad compartida o usar stdlib directamente. Mover imports al top salvo justificación circular real.

---

### B3 — Tests backend existentes están desactualizados frente a módulos nuevos

**Evidencia:** solo existe `backend/tests/test_catalog.py`. No hay tests para `projects`, `library`, `budget`, `settings`, keynotes ni ETL runner.

**Impacto:** cambios recientes no tienen red de seguridad. El build frontend ya encontró una falla; backend no pudo verificarse por entorno.

**Ubicación:** `backend/tests/`.

**Recomendación:** agregar tests mínimos por módulo implementado antes de seguir expandiendo features.

---

### B4 — Dependencias backend no incluyen el stack ETL que el backend puede disparar desde UI

**Evidencia:** `backend/requirements.txt` no incluye `pymupdf`, `opencv-python`, `Pillow`, `google-generativeai` ni `click`; están en `scripts/etl_tcpo/requirements.txt`. Sin instalar ambos sets, `/api/etl/run` puede fallar en runtime.

**Impacto:** setup de desarrollo ambiguo. La UI ofrece ejecutar ETL, pero los requisitos están en otro archivo.

**Ubicación:** `backend/requirements.txt`, `scripts/etl_tcpo/requirements.txt`, `backend/etl_runner.py`.

**Recomendación:** documentar explícitamente que la función ETL desde UI requiere instalar también `scripts/etl_tcpo/requirements.txt`, o crear un extra/dev requirements.

---

### B5 — `etl_runner` acepta páginas como string libre sin validación previa

**Evidencia:** `RunRequest.pages: str` se pasa directo a `main.py run --pages`. La validación ocurre en el CLI, no en API. Si el usuario ingresa formato inválido, el backend devuelve `ok=false` con stdout/stderr combinado, no un 422 semántico.

**Impacto:** UX degradada y errores menos accionables desde el navegador.

**Ubicación:** `backend/etl_runner.py`, `scripts/etl_tcpo/main.py`, `frontend/src/components/settings_panel/EtlView.tsx`.

**Recomendación:** validar formato de páginas en API o frontend antes de lanzar subprocess.

---

## Checks ejecutados

| Check | Resultado |
|---|---|
| `rg --files` | OK. Inventario usado para verificar estructura real. |
| `git status --short` | Workspace sucio; hay cambios y archivos nuevos sin seguimiento. |
| `git log --oneline -5` | Último commit local: `9a638c4 feat: implement audit system with official settings lists and management UI`. |
| `pytest` | No ejecutado: `pytest` no está en PATH. |
| `python -m pytest` | No ejecutado: `python` no está en PATH. |
| `py -m pytest` | No ejecutado: `py` no está en PATH. |
| `npm run build` | Bloqueado por política de PowerShell sobre `npm.ps1`. |
| `npm.cmd run build` | Ejecutado; falla por TS6133 en `frontend/src/App.tsx`. |

---

## Preguntas abiertas

1. ¿`AGENTS.md` reemplaza oficialmente a `CLAUDE.md`, o debe convivir como entrada específica para Codex?
2. ¿El bloqueo de exportación por `is_verified=false` debe aplicar solo a keynotes o también a PDF/Excel del presupuesto?
3. ¿`settings_users` reemplaza al futuro `users` del modelo de datos, o es solo un catálogo simple pre-auth?
4. ¿La exportación keynote debe ser UTF-16/ANSI para Revit desde el MVP, o alcanza con `text/plain` UTF-8 en esta etapa?

---

## Próximos pasos recomendados

| Prioridad | Acción | Responsable |
|---|---|---|
| Alta | Corregir build frontend eliminando el import no usado en `App.tsx` y reejecutar `npm.cmd run build`. | Constructor |
| Alta | Resolver fuente canónica `AGENTS.md` vs `CLAUDE.md`, versionar `AGENTS.md` si queda como oficial, y actualizar skills. | Constructor |
| Alta | Refactorizar `settings` a 4 archivos o documentar excepción explícita. | Constructor |
| Alta | Actualizar `MODELO-DE-DATOS.md` con campos de verificación y tablas settings. | Constructor |
| Media | Alinear nulabilidad de tipos frontend con responses backend. | Constructor |
| Media | Actualizar `ARQUITECTURA.md` e `INTERFAZ.md` para reflejar edición de precios, Settings y keynotes reales. | Constructor |
| Media | Agregar tests mínimos para `library`, `budget`, `settings` y keynotes. | Constructor |
| Baja | Limpiar mojibake en archivos fuente/documentales con revisión por diff. | Constructor |

---

*Inspector desactivado. Control devuelto al usuario.*
