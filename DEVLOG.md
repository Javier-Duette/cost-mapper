# DEVLOG â€” Cost-Mapper V2

> **PropÃ³sito de este archivo:** Log cronolÃ³gico de sesiones de trabajo. Al final de cada sesiÃ³n se agrega una entrada con la fecha, quÃ© se implementÃ³ o decidiÃ³, quÃ© problemas aparecieron y cuÃ¡l es el siguiente paso concreto. No es un documento formal â€” es el puente entre sesiones para que cualquier agente (o colaborador) sepa exactamente dÃ³nde quedÃ³ el proyecto sin tener que releer todo.
> 
> **Formato de entrada:** fecha y hora (ej: `## 2026-05-06 14:30 â€” Titulo`) Â· implementado Â· problemas Â· decisiones cambiadas Â· prÃ³ximo paso.

## 2026-05-07 17:15 — Sistema de Auditoría, Configuraciones y Estandarización

**Implementado:**
- **Sistema de Auditoría de Precios:** Integración de `AuditModal.tsx` que exige nombre de usuario y fuente ante cualquier cambio de precio, con advertencia de impacto global.
- **Historial Visual (Audit Trail):** Incorporación de iconos de información `(i)` con tooltips detallados (quién cargó, quién modificó y cuándo) en el encabezado del panel y filas de la tabla APU.
- **Módulo de Settings (Backend):** Nuevo módulo `backend/settings/` con soporte CRUD completo para tablas `settings_users` y `settings_sources`.
- **Estandarización de Campos:** Reemplazo de inputs de texto libre por listas desplegables (select) en el flujo de auditoría, eliminando duplicados e inconsistencias.
- **Vista de Gestión de Configuración:** Nueva interfaz en la sección de "Configuración" para gestionar (crear, editar, eliminar) los usuarios y fuentes oficiales del sistema.
- **Refactorización Shared:** Extracción de `InlineEdit.tsx` a componentes compartidos para reutilización sistémica.

**Problemas resueltos:**
- **Inconsistencia de Datos:** Se eliminó la posibilidad de ingresar nombres de fuentes o usuarios con errores tipográficos mediante el uso de catálogos cerrados.
- **Encoding UTF-8:** Limpieza masiva de caracteres corruptos en `App.tsx` y `DetailPanel.tsx` causados por ediciones en entornos Windows.
- **Reactividad:** Se implementó `refreshKey` en `CatalogView` para forzar la actualización de la lista al modificar ítems en el panel inferior sin recargar página.

**Decisiones cambiadas:**
- Se formaliza el uso de catálogos de configuración para campos de auditoría en lugar de texto libre.

**Próximo paso:** Implementar la creación manual de ítems de trabajo (Work Items) y expandir el sistema de configuración a tipos de cambio.

---

## 2026-05-07 12:20 — Ejecución real de ETL TCPO desde la UI

**Implementado:**
## 2026-05-07 14:25 — Optimización de Costos ETL y Corrección de Traducciones

**Implementado:**
- Se implementó un log de debugging (pi_debug.jsonl) para la comunicación con la API de Gemini, expuesto en la interfaz mediante un botón de descarga en EtlView.
- Se agregó en la UI un panel desplegable de resumen que agrupa inteligentemente las páginas ya procesadas para evitar la saturación visual de la interfaz.
- Se integró un archivo glossary.csv en la raíz de scripts/data que inyecta reglas personalizadas de traducción regional en tiempo de ejecución al prompt de extractor.py (ej. "telha cerâmica" = "teja cerámica", pero "telha trapezoidal" = "chapa trapezoidal").
- Se creó un script utilitario ix_translations.py que evaluó con Gemini el contexto en portugués de los ítems existentes en la base de datos y en el caché para restablecer las traducciones correctas de tejas/chapas afectadas por un reemplazo masivo erróneo previo.

**Problemas resueltos:**
- El consumo elevado de tokens reportado en AI Studio fue causado por "alucinaciones" (markdown y texto explicativo) en las respuestas rechazadas de Gemini; esto se corrigió forzando esponse_mime_type="application/json" en _call_gemini.
- La optimización de 2 pasos ("0 ítems" reportados) se validó como un comportamiento correcto al saltear llamadas costosas de datos ya almacenados.
- Se solventó el error de traducciones genéricas ("teja" vs "chapa") usando la evaluación semántica contextual de Gemini para restaurar la coherencia de la base de datos.

**Decisiones cambiadas:**
- Ninguna.

**Próximo paso:** Continuar con el ETL o avanzar hacia la planificación e implementación del módulo Biblioteca (gestión de Keynotes para Revit).

- EjecuciÃ³n completa del pipeline ETL (extracciÃ³n con Gemini Vision) procesando las pÃ¡ginas 36 a 38 de la TCPO V15 directamente desde la UI del navegador (`EtlView`).
- Se validÃ³ el correcto funcionamiento del flag "Forzar" para evadir la cachÃ© de Gemini local cuando sea necesario reprocesar una pÃ¡gina.
- La base de datos SQLite (`costmapper_dev.db`) fue poblada exitosamente incrementando los Ã­tems de catÃ¡logo reales con `is_work_item = 1`.

**Problemas resueltos:**
- Ninguno. El pipeline funcionÃ³ end-to-end segÃºn lo previsto por la arquitectura de 2-pasos.

**Decisiones cambiadas:**
- Ninguna.

**PrÃ³ximo paso:** Revisar los nuevos Ã­tems de catÃ¡logo insertados desde la vista "CatÃ¡logo" de la UI y comenzar la implementaciÃ³n de agregar Ã­tems al presupuesto (`POST /api/projects/{id}/library`).

## 2026-05-07 22:00 â€” ETL panel en UI + facetas NBR corregidas + estabilizaciÃ³n backend

**Implementado:**
- `backend/etl_runner.py`: router FastAPI standalone (`/api/etl/run` POST y `/api/etl/status` GET). Usa `subprocess.run` en `run_in_threadpool` para evitar el bug de asyncio ProactorEventLoop en Windows con pipes.
- `backend/main.py`: registrado `etl_router` con `app.include_router(etl_router)`.
- `frontend/src/components/settings_panel/EtlView.tsx`: UI completa para ejecutar el ETL desde el navegador. Cards de estadÃ­sticas (Ã­tems en catÃ¡logo, pÃ¡ginas OK/parciales/errores), input de pÃ¡ginas, checkboxes Dry-run/Forzar, botÃ³n Ejecutar, log de output con borde verde (OK) o rojo (error).
- `frontend/src/App.tsx`: integrado `EtlView` en secciÃ³n `settings`. TÃ­tulo cambiado a `'Importar TCPO V15'`.
- `frontend/vite.config.ts`: proxy `/api` actualizado a `http://localhost:8002` (era 8000).
- `scripts/etl_tcpo/extractor.py` y `main.py`: modelo Gemini actualizado a `gemini-2.5-flash` (los modelos `gemini-2.0-flash` y `gemini-2.0-flash-lite` fueron deprecados para nuevos usuarios).
- `frontend/src/types/catalog.ts`: tipo `Faceta` ampliado con `'3R'`.
- `frontend/src/components/catalog_panel/CatalogView.tsx`: labels de facetas corregidos segÃºn NBR 15965: `3E=Elementos`, `3R=Resultados del Trabajo`, `4U=Unidades de ConstrucciÃ³n`, `2C=Componentes`, `2N=Funciones / Mano de obra`, `2Q=Equipos`. Faceta `3R` agregada al Ã¡rbol.
- `frontend/src/components/shared/SectionHeader.tsx`: `3R` agregado al array de chips de faceta.
- `frontend/src/globals.css`: tokens CSS y clases para `3R` (color cyan `#26C6DA`).
- `iniciar.bat`: script de arranque en la raÃ­z del proyecto â€” abre backend (puerto 8002) y frontend (5173) en ventanas separadas y lanza el navegador en `localhost:5173`.

**Problemas resueltos:**
- `asyncio.create_subprocess_exec` con PIPE cuelga indefinidamente en Windows (ProactorEventLoop). SoluciÃ³n: `subprocess.run` sÃ­ncrono en `run_in_threadpool`.
- MÃºltiples procesos zombie en puerto 8000 de sesiones anteriores imposibilitando bind. SoluciÃ³n: cambio a puerto 8002 + `iniciar.bat` para arranque limpio.
- Los labels de facetas en el frontend usaban el nombre del Grupo 3 de NBR ("Resultados de la ConstrucciÃ³n") como label de la subfaceta `3E`. Corregido a los nombres reales de las facetas segÃºn el estÃ¡ndar.
- La faceta `3R` no aparecÃ­a en el catÃ¡logo aunque habÃ­a Ã­tems con ese cÃ³digo. Causa: `3R` no estaba en el tipo `Faceta`, en el Ã¡rbol, ni en el header. Agregado en los tres lugares.

**Decisiones cambiadas:**
- NingÃºn ADR nuevo. Los cambios son operacionales (port, modelo Gemini, fix de labels).

**PrÃ³ximo paso:** Procesar secciones completas del TCPO con el ETL desde la UI (quitar dry-run, correr pÃ¡ginas reales).

---

## 2026-05-07 â€” ETL TCPO: extracciÃ³n 2-pasos completa

**Implementado:**
- `extractor.py`: refactorizado a arquitectura 2-pasos. `_call_gemini()` como helper compartido. `extract_codes_only()` usa `_PROMPT_CODES_ONLY` (respuesta mÃ­nima, solo array de strings). `extract_table(crop, target_codes=None)` usa `_PROMPT_FULL_TEMPLATE` con los cÃ³digos nuevos inyectados.
- `loader.py`: agregado `get_existing_codes(db_path, codes) -> set[str]` â€” consulta SQLite filtrando `is_work_item=1` para el subconjunto de cÃ³digos dados.
- `main.py`: comando `run` actualizado con flag `--single-pass`. Flujo default 2-pasos: Paso 1 extrae cÃ³digos â†’ consulta DB â†’ Paso 2 extrae solo lo nuevo. Tablas completamente conocidas se saltean sin llamada de extracciÃ³n completa. Contador de tablas saltadas en el resumen final.

**Problemas resueltos:**
- `extractor.py` tenÃ­a referencia a `_PROMPT` (renombrado en sesiÃ³n anterior) causando `NameError` en runtime. Resuelto al completar la refactorizaciÃ³n.
- `main.py` tenÃ­a carÃ¡cter unicode `â†’` que causaba error de encoding en Windows cp1252. Reemplazado por texto ASCII en la nueva versiÃ³n del comando `run`.

**Decisiones cambiadas:**
- NingÃºn ADR nuevo. ADR-012 ya documenta la estrategia 2-pasos.

**PrÃ³ximo paso:** Configurar `GEMINI_API_KEY` en `.env` y ejecutar `python main.py run --pages 36 --dry-run` para validar el pipeline completo end-to-end contra el PDF real.

---

## 2026-05-07 17:30 â€” ETL TCPO: herramienta de extracciÃ³n con Gemini Vision (ADR-012)

**Implementado:**
- ADR-012: documenta la estrategia de extracciÃ³n del PDF TCPO V15 rasterizado â€” detecciÃ³n local de tablas con OpenCV + crop + Gemini Vision para extracciÃ³n+traducciÃ³n.
- `scripts/etl_tcpo/` â€” herramienta standalone con 4 mÃ³dulos:
  - `detector.py`: renderiza pÃ¡ginas con `pymupdf`, detecta tablas con contornos externos OpenCV, devuelve recortes PIL limpios.
  - `extractor.py`: envÃ­a cada recorte a `gemini-2.0-flash` con prompt especÃ­fico para TCPO, parsea JSON con esquema fijo.
  - `loader.py`: valida e inserta en `catalog_items` + `apu_components` con `is_work_item=True`, `unit_price=NULL`.
  - `main.py`: CLI click con comandos `run`, `detect`, `status`.
- Verificado en pÃ¡gina 36: **4 tablas detectadas** con recortes perfectos, incluyendo tabla con doble columna de consumos.
- `progress.json` y `debug_crops/` agregados a `.gitignore`.
- Dependencias: `pymupdf`, `opencv-python`, `Pillow`, `google-generativeai`, `click`.

**Problemas resueltos:**
- Imports relativos vs absolutos: la herramienta se corre desde `scripts/etl_tcpo/` con `python main.py`.
- Encoding Windows cp1252: eliminados caracteres especiales del output CLI.

**PrÃ³ximo paso:** Probar `python main.py run --pages 36 --dry-run` con GEMINI_API_KEY en .env para verificar extracciÃ³n end-to-end. Luego procesar secciones completas del TCPO prioritarias para Paraguay.

---

## 2026-05-07 16:00 â€” ADR-011: campo is_work_item para separar nodos NBR de Ã­tems TCPO

**Implementado:**
- ADR-011 creado: documenta la decisiÃ³n de agregar `is_work_item: bool DEFAULT FALSE` a `catalog_items` para distinguir los 10.061 nodos de clasificaciÃ³n NBR 15965 (sin precio, estructurales) de los Ã­tems de trabajo TCPO presupuestables.
- Campo `is_work_item` agregado a `CatalogItem` (SQLModel), `CatalogItemRead` y al schema SQLite.
- MigraciÃ³n incremental en `main.py` lifespan: `ALTER TABLE catalog_items ADD COLUMN is_work_item ... DEFAULT 0`. Idempotente â€” ignora error si ya existe.
- `repository.search()` y `repository.count()` ahora filtran `WHERE is_work_item = TRUE` por defecto (parÃ¡metro sobreescribible).
- Nueva funciÃ³n `repository.get_nbr_tree()`: retorna TODOS los nodos (is_work_item ignorado) para el Ã¡rbol de keynotes via `parent_nbr_code`.
- `seed_tcpo_demo_item.py` actualizado: fija `is_work_item = 1` en INSERT y UPDATE de todos los Ã­tems TCPO que crea.
- DB verificada: 10.061 nodos NBR `(is_work_item=0)` + 7 Ã­tems TCPO `(is_work_item=1)`. API `GET /api/catalog/items` devuelve `total: 7` (solo presupuestables).
- `docs/MODELO-DE-DATOS.md`: campo `is_work_item` documentado en secciÃ³n 1.
- `docs/adrs/README.md`: fila ADR-011 agregada.

**Problemas resueltos:**
- Los 10k+ Ã­tems del catÃ¡logo eran en realidad nodos de clasificaciÃ³n NBR sin precio (artefacto del ETL de seed_nbr). El nuevo campo separa correctamente los dos conceptos sin romper el Ã¡rbol de keynotes â€” ambos tipos viven en la misma tabla relacionados por `parent_nbr_code`.

**Decisiones cambiadas:**
- ADR-011 (nuevo): separaciÃ³n NBR nodes vs TCPO work items con `is_work_item`.

**PrÃ³ximo paso:** Cargar mÃ¡s Ã­tems TCPO reales (completar ETL desde PDF) o habilitar ediciÃ³n inline de precios en CatalogView para poblar manualmente el catÃ¡logo.

---

## 2026-05-07 14:00 â€” Seed Ã­tem TCPO demo + verificaciÃ³n flujo end-to-end

**Implementado:**
- `scripts/seed_tcpo_demo_item.py`: crea un Ã­tem TCPO V15 completo con composiciÃ³n APU y precios reales en GuaranÃ­es. Ãtem: "MamposterÃ­a de ladrillo cerÃ¡mico hueco 15Ã—20Ã—30cm" (`3E 04 07 01 00 00`), precio â‚² 133.635/mÂ², 6 insumos (2C Ã— 3, 2N Ã— 2, 2Q Ã— 1) con coeficientes TCPO.
- Verificado flujo end-to-end en browser: CatÃ¡logo muestra el Ã­tem con precio real â†’ click APU muestra 6 componentes con precios â†’ botÃ³n "+" agrega al proyecto con toast â†’ Presupuesto refleja el Ã­tem reciÃ©n agregado.
- Identificado y confirmado: el campo CANT. vacÃ­o muestra "â€”" en subtotal y el banner cuenta correctamente Ã­tems sin cantidad.

**Problemas resueltos:**
- Todos los demÃ¡s Ã­tems en DB tienen `unit_price = None` y descripciones en portuguÃ©s (son nodos de clasificaciÃ³n NBR cargados por ETL, sin datos TCPO de precio). El seed_tcpo_demo_item.py resuelve esto para fines de prueba.
- Encoding: datos en DB estÃ¡n en UTF-8 correcto; display incorrecto era solo artefacto de PowerShell (Windows cp1252).

**PrÃ³ximo paso:** Skills auto-discovery (CLAUDE.md actualizado), y continuar con mÃ¡s Ã­tems demo o conectar el pipeline ETL para poblar precios reales desde Mandu'a. Alternativamente: permitir ediciÃ³n inline de `unit_price` en CatalogView para cargar precios manualmente.

---

## 2026-05-07 02:10 â€” Cierre de documentaciÃ³n: ADR-010 + actualizaciÃ³n de docs/

**Implementado:**

- ADR-010 creado: documenta la decisiÃ³n de agregar `manual_quantity` a `project_library` para presupuesto pre-IFC.
- `docs/adrs/README.md` actualizado con fila ADR-010.
- `docs/MODELO-DE-DATOS.md` secciÃ³n 4: campo `manual_quantity` documentado con referencia a ADR-010.
- `docs/ARQUITECTURA.md`: mÃ³dulo `projects/` agregado como secciÃ³n 2.1 (faltaba completamente). Secciones renumeradas. DescripciÃ³n de `budget/` (ahora 2.5) reescrita para reflejar comportamiento MVP vs futuro post-IFC.
- `CLAUDE.md`: ADR-010 agregado a la tabla de ADRs. Referencia a secciones de ARQUITECTURA.md corregida.

**Problemas resueltos:**

- Se omitiÃ³ el flujo documentaciÃ³n-primero en la sesiÃ³n anterior: el cÃ³digo de `manual_quantity` se escribiÃ³ sin ADR previo. Corregido retroactivamente.

**PrÃ³ximo paso:** botÃ³n "Agregar al proyecto" en `CatalogView` â€” `POST /api/projects/{id}/library` desde la UI para que el usuario pueda construir el presupuesto sin tocar la API directamente.

---

## 2026-05-07 01:35 â€” MÃ³dulos projects/, library/ y budget/ + integraciÃ³n completa frontend

**Implementado:**

- Backend `projects/` (4 archivos: models, repository, service, router): CRUD completo para proyectos. Seed automÃ¡tico de 2 proyectos demo al arrancar si la tabla estÃ¡ vacÃ­a.
- Backend `library/` (4 archivos): CRUD de biblioteca de proyecto (`project_library`). Incluye campo `manual_quantity` para cantidades manuales pre-IFC, con 409 si se intenta agregar el mismo Ã­tem dos veces.
- Backend `budget/` (4 archivos): mÃ³dulo de solo lectura. Lee `project_library` JOIN `catalog_items` y calcula subtotales, total, conteo de Ã­tems sin precio y sin cantidad.
- Frontend: tipos `types/projects.ts`, `types/budget.ts`. Clientes HTTP `api/projects.ts`, `api/budget.ts`.
- `Header.tsx` migrado de interfaz local a `types/projects.Project` (maneja `location: null`).
- `App.tsx`: elimina proyectos mock, carga proyectos desde `GET /api/projects` con `useEffect`. Header oculto hasta que los proyectos carguen.
- `BudgetView.tsx` reescrito: carga real desde `GET /api/projects/{id}/budget`. Banner dinÃ¡mico con conteo real de Ã­tems sin precio/cantidad. AgrupaciÃ³n por faceta con subtotales. Empty state cuando presupuesto vacÃ­o.
- Verificado en browser: Presupuesto muestra 1 Ã­tem real (de la prueba de integraciÃ³n), CatÃ¡logo carga faceta 3E con Ã­tems reales del backend.

**Problemas resueltos:**

- Puerto 8000 ocupado por proceso viejo al reiniciar backend â€” resuelto con kill explÃ­cito del PID antes de relanzar.
- TestClient sin `with` no ejecuta el lifespan (no crea tablas) â€” corregido usando `with TestClient(app) as client:`.

**Decisiones cambiadas:**

- `project_library` extendido con campo `manual_quantity` (no estÃ¡ en MODELO-DE-DATOS.md original). DecisiÃ³n documentada en el cÃ³digo con comentario. Permite presupuesto manual sin IFC pipeline.

**PrÃ³ximo paso:** Implementar endpoint `POST /api/projects/{id}/library` desde el frontend (botÃ³n "Agregar al proyecto" en CatalogView) para que el usuario pueda construir el presupuesto desde la UI, sin tocar directamente la API.

---

## 2026-05-07 06:15 â€” ConstrucciÃ³n del Frontend React/TypeScript

**Implementado:**

- Scaffold completo de Vite + React 18 + TypeScript en `frontend/` (package.json, vite.config.ts, tsconfig.app.json, tsconfig.node.json, index.html).
- `src/globals.css` â€” todos los tokens del design system extraÃ­dos de `docs/design-system/theme.css` + estilos de layout, tablas, chips, sidebar, header, KPI strip, banners, modales, viewer 3D.
- `src/types/catalog.ts` â€” tipos TypeScript para `CatalogItem`, `APUComponent`, `CatalogSearchResult`, `Faceta`, `Section`.
- `src/api/catalog.ts` â€” cliente HTTP tipado para los 3 endpoints de `catalog/`: `searchItems`, `getItem`, `getItemAPU`.
- Componentes compartidos: `Icon.tsx` (22 Ã­conos inline SVG), `Chip.tsx` (facetas NBR + badge de fuente), `formatters.ts` (fmt con locale es-PY).
- Layout: `Header.tsx` (brand + selector de proyecto con popover), `Sidebar.tsx` (nav 5 secciones + settings + tooltip), `SectionHeader.tsx` (tÃ­tulo + bÃºsqueda + toggles de faceta + switch Solo PY).
- Vistas: `CatalogView.tsx` (Ã¡rbol de facetas + tabla con datos reales del backend), `BudgetView.tsx` (banner + KPI strip + tabla agrupada por faceta, datos mock hasta implementar `budget/`), `DetailPanel.tsx` (APU con datos reales del endpoint `/apu`), `MappingView.tsx` (empty state placeholder), `ReportsView.tsx` (3 tarjetas de exportaciÃ³n), `Viewer3D.tsx` (cubo CSS animado placeholder para @thatopen).
- `App.tsx` â€” layout switching dinÃ¡mico: `layout-with-panel` para CatÃ¡logo, `layout-with-viewer-panel` para Mapeo, base para el resto. Estado de selecciÃ³n separado por vista.
- `.claude/launch.json` â€” configuraciÃ³n del preview server.
- TypeScript limpio (`tsc --noEmit` sin errores).
- Verificado en browser: todas las secciones renderizan correctamente.

**Problemas resueltos:**

- `npm create vite` no acepta stdin piped en Windows â†’ scaffold manual de los archivos de configuraciÃ³n.
- CSS import requerÃ­a `vite-env.d.ts` con `/// <reference types="vite/client" />` para que TypeScript no reportara error.
- `CatalogView.onSelect` necesitaba pasar el objeto `CatalogItem` completo al App para alimentar el `DetailPanel`.

**Decisiones cambiadas:**

- Ninguna arquitectural. El `BudgetView` usa datos mock intencionalmente hasta que el mÃ³dulo `budget/` del backend estÃ© implementado â€” documentado con comentario en el archivo.

**PrÃ³ximo paso:** Levantar el backend (`uvicorn main:app --reload`) y verificar la integraciÃ³n real del CatÃ¡logo con datos TCPO/NBR. Luego implementar el mÃ³dulo `budget/` en el backend para reemplazar los mocks del `BudgetView`.

---

## 2026-05-07 00:53 â€” Cierre de SesiÃ³n y Handoff a Claude Code

**Implementado:**

- ExplicaciÃ³n de las acciones autÃ³nomas del Inspector (actualizaciÃ³n de su skill, correcciÃ³n del claim falso en `CLAUDE.md`, y registro en este `DEVLOG.md`). Todo funcionando correctamente y demostrando la utilidad de los roles separados.
- **Handoff / Contexto para Claude Code:** 
  1. El Backend (`catalog/`) y la BD SQLite estÃ¡n vivos y probados. 
  2. La arquitectura UX/UI fue refactorizada hacia "Vistas Dedicadas" (sin paneles globales ocultos).
  3. El diseÃ±ador IA entregÃ³ un sistema de diseÃ±o inicial que estÃ¡ extraÃ­do en `docs/design-system/` (esta carpeta es de SOLO LECTURA).
  4. Los scripts que el inspector marcÃ³ como faltantes estÃ¡n en `[WIP]` intencionalmente.

**PrÃ³ximo paso (Para Claude Code):** Arrancar la construcciÃ³n del Frontend real en React/Vite (`frontend/`). El objetivo es tomar los componentes visuales documentados en `docs/design-system/` y convertirlos en componentes funcionales reales, e integrarlos con el backend de CatÃ¡logo. Importante: Tras programar la UI, se debe dejar un reporte de "Feedback Loop" (documentado en la regla 4 de `CLAUDE.md`) para el diseÃ±ador sobre quÃ© cambiÃ³ respecto al mockup original.

---

## 2026-05-07 00:30 â€” AuditorÃ­a Inspector + VerificaciÃ³n de Respuesta del Constructor

**Implementado:**

- EjecuciÃ³n completa de la skill `cost-mapper-inspector`: auditorÃ­a de 15 hallazgos (5 crÃ­ticos, 5 medios, 5 bajos). Reporte guardado en `docs/auditorias/AUDITORIA_2026_05_06.md`.
- VerificaciÃ³n de la respuesta del Constructor contra el estado real del repositorio.
- CorrecciÃ³n de M1 (claim falso): ADR-007 y ADR-008 agregados a la tabla de CLAUDE.md.
- ActualizaciÃ³n de la skill del Inspector (`SKILL.md`) con:
  - Nueva metodologÃ­a "VerificaciÃ³n Post-Constructor" con protocolo de verificaciÃ³n de claims.
  - Checklist estÃ¡ndar de auditorÃ­a categorizado (repositorio, documentaciÃ³n, backend, frontend, git).
  - DescripciÃ³n ampliada en el frontmatter para capturar el caso de verificaciÃ³n de respuestas.

**Problemas resueltos:**

- Claim falso del Constructor detectado: afirmÃ³ haber agregado ADR-007 y ADR-008 a la tabla de `CLAUDE.md` pero no lo habÃ­a hecho. Corregido por el Inspector en esta sesiÃ³n.
- ViolaciÃ³n de protocolo de cierre: el Constructor no dejÃ³ entrada en el DEVLOG tras su sesiÃ³n de correcciÃ³n. Corregido con esta entrada.

**Decisiones cambiadas:**

- Ninguna. Las correcciones aplicadas son de limpieza, no de arquitectura.

**PrÃ³ximo paso:** El Constructor retoma para iniciar la construcciÃ³n del Frontend consumiendo `docs/design-system/` como referencia, conectando con los endpoints del mÃ³dulo `catalog/` que ya estÃ¡ vivo.

---

## 2026-05-06 23:56 â€” CreaciÃ³n de Skill de AuditorÃ­a (Inspector)

**Implementado:**

- CreaciÃ³n de una nueva skill de IA especializada en auditorÃ­a de cÃ³digo y documentaciÃ³n (`.agents/skills/cost-mapper-inspector/SKILL.md`).
- Esta skill actÃºa como un "Fiscal / QA Senior" enfocado exclusivamente en encontrar incongruencias arquitectÃ³nicas, enlaces rotos y deuda tÃ©cnica sin modificar cÃ³digo.
- ActualizaciÃ³n de `CLAUDE.md` estableciendo explÃ­citamente el concepto de "Roles de Agente IA". El agente por defecto es "Constructor", pero el usuario puede invocar al "Inspector" a demanda.

**Problemas resueltos:**

- ReducciÃ³n del uso innecesario de la ventana de contexto. Al separar la responsabilidad de auditorÃ­a en una skill opcional invocada manualmente, el agente constructor no malgasta tokens analizando todo el workspace continuamente.

**PrÃ³ximo paso:** Arrancar el desarrollo del Frontend y la integraciÃ³n con Claude Design, o ejecutar el Inspector si se requiere una auditorÃ­a profunda.

---

## 2026-05-06 23:45 â€” RefactorizaciÃ³n de Layout UI e IntegraciÃ³n de Sistema de DiseÃ±o

**Implementado:**

- EliminaciÃ³n de la arquitectura de "Paneles Globales Colapsables" (herencia de un prototipo antiguo) en favor de una arquitectura de "Vistas Dedicadas" (`docs/claude-design/02-LAYOUT.md`, `03-SECCIONES.md`, `INTERFAZ.md`).
- AsignaciÃ³n estricta de componentes pesados: El Visor 3D y el Panel Inspector APU ahora solo existen en las vistas que realmente lo requieren (CatÃ¡logo y Mapeo IFC). La vista Presupuesto se liberÃ³ de paneles extra para actuar como un Dashboard expansivo limpio al 100%.
- Agregada la columna "Fuente del Coeficiente" a la especificaciÃ³n de la tabla APU en `04-COMPONENTES.md`.
- InclusiÃ³n del requerimiento de un mockup PDF del presupuesto en la secciÃ³n de Informes.
- DescompresiÃ³n e integraciÃ³n del primer archivo entregable generado por Claude Design (`Cost-Mapper Design System.zip`) dentro de `docs/design-system/`.
- ActualizaciÃ³n de `CLAUDE.md` estableciendo el "Flujo de Trabajo: Sistema de DiseÃ±o", marcando el directorio como de Solo Lectura para los agentes, y exigiendo documentar el *Feedback Loop* de implementaciÃ³n.

**Problemas resueltos:**

- PrevenciÃ³n del "sÃ­ndrome de paneles escondidos" que saturaba visualmente la aplicaciÃ³n.

**Decisiones cambiadas:**

- Cambio del layout general de la aplicaciÃ³n.
- El repositorio ahora alberga una carpeta `docs/design-system/` estÃ¡tica que funciona como referencia visual/arquitectÃ³nica estricta, pero separada del cÃ³digo de producciÃ³n React en `frontend/`.

**PrÃ³ximo paso:** Entregar a Claude Design el Ãºltimo set de requerimientos actualizados (paneles estrictos, tabla APU, mockup PDF). Una vez que Claude Design genere el nuevo `.zip`, procederemos a la construcciÃ³n del `frontend/` en React/Vite consumiendo esos mockups como referencia, y conectando con el backend de CatÃ¡logo que ya estÃ¡ vivo.

---

## 2026-05-06 21:45 â€” ImplementaciÃ³n del mÃ³dulo catalog y carga de datos NBR

**Implementado:**

- MÃ³dulo `catalog/` desarrollado bajo el patrÃ³n SQLModel (ADR-009). Creados `models.py`, `repository.py`, `service.py`, y `router.py`.
- Base de datos configurada por defecto en SQLite para facilitar el desarrollo inmediato, con soporte para PostgreSQL en producciÃ³n (`.env.example`).
- Tests unitarios de catÃ¡logo (11/11 pasando) que cubren bÃºsqueda, paginaciÃ³n, ediciÃ³n de precios y detalle de APU.
- CreaciÃ³n de dos scripts de carga de datos (`seed.py` y `seed_nbr.py`):
  - Carga manual de 4 APUs y 15 componentes extraÃ­dos de una pÃ¡gina de la TCPO (Canteiro de obras).
  - Carga automÃ¡tica de mÃ¡s de 10,000 Ã­tems en portuguÃ©s a partir de los 5 archivos Excel de la ABNT NBR 15965.
- ActualizaciÃ³n de las reglas del `DEVLOG.md` y `CLAUDE.md` para incluir de forma obligatoria la hora exacta en los cierres de sesiÃ³n para evitar pÃ©rdida de orden cronolÃ³gico.

**Problemas resueltos:**

- PrevenciÃ³n de lock de archivo de SQLite en Windows utilizando `SQLModel.metadata.drop_all()` en vez de borrar el archivo.
- Falta de orden cronolÃ³gico preciso en el DEVLOG corregido (se agregÃ³ formato de hora).

**Decisiones cambiadas:**

- Se mantiene el idioma portuguÃ©s puro en la base de datos por ahora para facilitar las pruebas funcionales. La traducciÃ³n se abordarÃ¡ posteriormente.

**PrÃ³ximo paso:** Cerrar sesiÃ³n (commit + push). Para la prÃ³xima sesiÃ³n, conectar el Frontend con los endpoints de este mÃ³dulo `catalog/` para que el usuario pueda explorar la base de 10,000 Ã­tems desde la interfaz grÃ¡fica.

---

## 2026-05-06 19:45 â€” ReorganizaciÃ³n de ADRs y refactoring del flujo de agentes IA

**Implementado:**

- MigraciÃ³n de ADRs: `docs/DUDAS.md` (47KB, 611 lÃ­neas) â†’ `docs/adrs/` (9 archivos individuales + README Ã­ndice). Cada ADR ahora es un `.md` separado, mÃ¡s eficiente para que los agentes lean solo lo que necesitan.
- ADR-009 (SQLModel) movido de la raÃ­z del repo a `docs/adrs/ADR-009.md` y registrado en el Ã­ndice.
- AnÃ¡lisis completo del flujo de trabajo de agentes de IA: identificados 6 problemas de coherencia entre `CLAUDE.md` y `SKILL.md`.
- Refactoring de `CLAUDE.md`: agregadas secciones "Al inicio de cada sesiÃ³n" y "Cierre de sesiÃ³n â€” protocolo obligatorio" con tabla de coherencia de documentaciÃ³n. Ahora cualquier agente (no solo Antigravity) tiene las instrucciones completas.
- Refactoring de `SKILL.md`: eliminada duplicaciÃ³n de contenido (197 â†’ 134 lÃ­neas). Las secciones duplicadas ahora referencian a `CLAUDE.md` como fuente de verdad.
- ActualizaciÃ³n de 14 referencias a `DUDAS.md` en 8 archivos del repositorio.
- Eliminados archivos huÃ©rfanos: `ADR-009-SQLModel.md` (raÃ­z), `CIERRE-SESION-2026-05-06.md`.

**Problemas resueltos:**

- El protocolo de cierre de sesiÃ³n solo existÃ­a en `SKILL.md` (invisible para Claude Code, Copilot, Cursor). Movido a `CLAUDE.md`.
- `CLAUDE.md` no indicaba leer `DEVLOG.md` al inicio de sesiÃ³n. Corregido con nueva secciÃ³n.

**Decisiones cambiadas:**

- ADRs migrados de archivo monolÃ­tico a carpeta con archivos individuales (`docs/adrs/`).
- `CLAUDE.md` es ahora la fuente de verdad universal; `SKILL.md` es el amplificador.

**PrÃ³ximo paso:** Revisar y aprobar ADR-009 (migraciÃ³n a SQLModel), luego implementar mÃ³dulo `catalog/` como piloto.

---

## 2026-05-06 18:30 â€” DecisiÃ³n de repositorio y protocolo de git

**Implementado:**

- `docs/adrs/ADR-008.md` â€” estrategia de repositorio y protocolo de control de versiones. Documenta la causa raÃ­z de la pÃ©rdida de trabajo en V0 y las reglas obligatorias para evitar que se repita.
- `CLAUDE.md` â€” secciÃ³n "Protocolo de control de versiones" agregada. Define la regla central (push = guardado real), el protocolo para operaciones riesgosas y cÃ³mo el usuario puede verificar el estado del repositorio sin saber git.
- `CLAUDE.md` â€” tabla "Archivos que NO tocar" actualizada con fila para `.git/` referenciando ADR-008.

**DecisiÃ³n: repositorio nuevo para V2**

Se crea un repositorio nuevo en GitHub para V2. No se reutiliza el repositorio de V0. Razones: historial limpio, libertad de nombre, sin contaminaciÃ³n de cÃ³digo viejo, mÃ¡s simple de gestionar.

El repositorio de V0 no se borra: se archiva con la funciÃ³n "Archive repository" de GitHub (Settings â†’ General â†’ Danger Zone â†’ Archive this repository). Esto lo convierte en solo lectura con un badge "Archived" visible. Todo el historial queda disponible como referencia permanente. La operaciÃ³n de archivo es reversible y no requiere saber git â€” es una acciÃ³n en la interfaz web de GitHub.

**Problema documentado (causa V0):**
La frase "crear un backup" fue interpretada por el agente como copia de carpeta local, no como commit+push. El repositorio remoto no recibiÃ³ nada. Cuando la operaciÃ³n fallÃ³, el "backup" disponible era el Ãºltimo push real, con una semana de antigÃ¼edad.

**PrÃ³ximo paso:** crear el repositorio nuevo en GitHub, hacer el primer commit con la estructura de carpetas vacÃ­a (como describe CLAUDE.md), y archivar el repositorio de V0.

---

## 2026-05-06 â€” SesiÃ³n de anÃ¡lisis OCE y actualizaciÃ³n de documentos

**Implementado:**

- `LECCIONES-OCE.md` â€” anÃ¡lisis completo del repositorio OpenConstructionERP (OCE v2.7.0, AGPL-3.0). 11 secciones cubriendo: esquema BIMElement, detecciÃ³n de cambios con geometry_hash, BOQMarkup (markup de presupuesto), precisiÃ³n decimal, concurrencia optimista, APU como JSON vs relacional, estructura de 5 archivos por mÃ³dulo, patrÃ³n Alembic baseline, limpieza de huÃ©rfanos y event bus.
- `MODELO-DE-DATOS.md` â€” 6 cambios concretos aplicados:
  1. Mapa de entidades actualizado con nodo `project_markups`
  2. `ifc_elements`: agregado campo `geometry_hash TEXT` para detecciÃ³n rÃ¡pida de cambios cualitativos
  3. `project_assignments`: agregados `confidence DECIMAL(5,2)` y `qualitative_snapshot_at_assignment JSONB`
  4. Nueva secciÃ³n 7: tabla `project_markups` completa (GG, utilidad, IVA con `apply_to = cumulative`)
  5. Secciones renumeradas (8â€“12), query de detecciÃ³n de conflicto corregida
  6. Ãndice `idx_markups_project` agregado en secciÃ³n de Ã­ndices
- `ARQUITECTURA.md` â€” agregadas secciones 2.7 (convenciÃ³n 5-archivos por mÃ³dulo) y 2.8 (estrategia Alembic baseline)
- `CLAUDE.md` â€” convenciÃ³n de 5 archivos documentada en secciÃ³n de convenciones; Alembic agregado en "CÃ³mo correr el proyecto"

**Problemas resueltos:**

- `qualitative_snapshot_at_assignment` estaba referenciado en la query SQL de detecciÃ³n de conflictos pero **nunca definido** en el schema de `project_assignments`. Bug encontrado al revisar el MODELO-DE-DATOS.md antes de editar. Resuelto: campo agregado.
- Presupuesto sin mecanismo para GG/IVA/utilidad. Resuelto: tabla `project_markups` con `apply_to = "direct_cost" | "cumulative"` permite modelar el esquema paraguayo tÃ­pico (GG 12%, utilidad 10%, IVA 10% sobre el total con GG+utilidad).

**Decisiones tomadas:**

- **Se adopta la convenciÃ³n de 5 archivos de OCE** (router/service/models/repository/schemas) como convenciÃ³n obligatoria del proyecto. JustificaciÃ³n: permite a cualquier agente o desarrollador encontrar el cÃ³digo relevante sin explorar el Ã¡rbol completo.
- **Se adopta el patrÃ³n Alembic baseline**: primera migraciÃ³n es no-op, `01_init_db.py` crea el schema inicial. Los dos coexisten sin conflicto.
- **Se adopta `geometry_hash`** de OCE para detecciÃ³n rÃ¡pida de cambios en reimportaciÃ³n: comparar un MD5 de string es mÃ¡s eficiente que comparar dos JSONB completos.
- **No se adopta** la serializaciÃ³n de dinero como String (OCE usa esto para evitar problemas con SQLite). PostgreSQL `DECIMAL(14,2)` es preciso en servidor; la frontera a vigilar es la serializaciÃ³n JSON hacia el frontend (usar string en la API, no float).
- **No se adopta** concurrencia optimista (campo `version`) en MVP â€” asumimos usuario Ãºnico o equipo muy pequeÃ±o. Se agrega en post-MVP si aparecen conflictos de escritura.

**PrÃ³ximo paso:** diseÃ±o de interfaz con Claude Design (leer `INTERFAZ.md` + `STACK-TECNOLOGICO.md` antes de iniciar). Luego: inicializaciÃ³n del repositorio de cÃ³digo y primer commit con la estructura de carpetas del `CLAUDE.md`.

---

## 2026-05-06 â€” SesiÃ³n de documentaciÃ³n inicial

**Implementado:**

- `MODELO-DE-DATOS.md` â€” schema PostgreSQL completo: tablas `catalog_items`, `apu_components`, `projects`, `project_library`, `ifc_elements`, `project_assignments`, `project_phases`, `users`. Ãndices, queries de referencia y secciÃ³n explÃ­cita de "quÃ© no estÃ¡ en el modelo".
- `ARQUITECTURA.md` â€” mÃ³dulos del backend (catalog, ifc_importer, mapper, budget, library, exporter), mÃ³dulos del frontend, flujos principales Aâ€“D, reglas de mÃ³dulo.
- `STACK-TECNOLOGICO.md` â€” justificaciÃ³n de cada tecnologÃ­a: Python/FastAPI/ifcopenshell/PostgreSQL/Gemini (ETL) + TypeScript/React/@thatopen/Playwright. SecciÃ³n "lo que no estÃ¡ decidido todavÃ­a" (ORM, hosting, auth, gestor JS).
- `INTERFAZ.md` â€” layout de 4 zonas (sidebar iconos Â· Ã¡rea principal Â· visor 3D derecho Â· panel de detalle inferior), header, navegaciÃ³n sidebar (6 secciones sin etiquetas de texto), las 6 secciones completas (CatÃ¡logo, Presupuesto, Mapeo IFC, Biblioteca, Informes, Ajustes), panel de detalle, visor 3D, 4 decisiones UX documentadas, secciÃ³n 13 de iconografÃ­a (set SVG monoline para Claude Design).
- `CLAUDE.md` â€” archivo de entrada para agentes de IA: descripciÃ³n del proyecto, tabla de ADRs, estructura del repositorio, reglas de mÃ³dulo, convenciones de cÃ³digo, archivos protegidos, comandos para correr el proyecto.
- `docs/adrs/ADR-005.md` (actualizaciÃ³n) â€” ADR-005 cerrado como Aceptado. Registro de documentos completados.

**Problemas resueltos:**

- `unit_price` referenciado en la query APU pero ausente del schema `catalog_items`. Resuelto: se agregÃ³ `unit_price DECIMAL(14,2)` y `currency TEXT` directamente en `catalog_items`. Los insumos (mano de obra, materiales, equipos) tienen precio propio en el catÃ¡logo â€” es el mismo Ã­tem, no una tabla separada.
- Sistema de archivado/derivaciÃ³n de Ã­tems: la FK UUID de `apu_components.component_id` apuntarÃ­a a Ã­tems archivados. Resuelto descartando el archivado completamente.

**Decisiones cambiadas:**

- **Se descartÃ³ el historial de versiones y el archivado de Ã­tems.** Los Ã­tems son editables en place. El UUID nunca cambia; las FKs de APU se mantienen vÃ¡lidas automÃ¡ticamente. El campo `modificado_por` es el Ãºnico rastro de ediciÃ³n. Si en el futuro se necesita historial, se agrega un nuevo ADR.
- **Panel de desglose APU va en la zona inferior** (no en el sidebar izquierdo como en V0). Soluciona el problema de compresiÃ³n de columnas que tenÃ­a la V0.

**PrÃ³ximo paso:** DiseÃ±o de interfaz con Claude Design (leer `INTERFAZ.md` + `STACK-TECNOLOGICO.md` antes de iniciar). Luego: inicializaciÃ³n del repositorio de cÃ³digo y primer commit con la estructura de carpetas del `CLAUDE.md`.

## 2026-05-07 15:45 - Edición Inline, Creación Manual y Verificación de Ítems en Catálogo

**Implementado:**
- Se corrigió el nombre en el sidebar "Catálogo de Ítems" que tenía errores de codificación.
- Se implementó la **Edición Inline** en el Panel APU (DetailPanel.tsx): ahora se puede hacer clic sobre el precio, coeficiente o descripción para editarlos directamente. Los cambios establecen automáticamente la fuente como "CUSTOM".
- Se agregó el campo is_verified a la base de datos catalog_items y se implementó un botón en la UI para **Verificar APUs** importados del TCPO. Si se edita un APU verificado, este pierde su estado de verificación automáticamente.
- Se implementaron las ventanas modales para **Creación de Ítems Manuales** (CreateItemModal) y **Añadir Insumo Manual a un APU** (AddInsumoModal), con el objetivo de sortear las limitaciones de extracción cuando las tablas del PDF están cortadas.
- Se añadió capacidad de redimensionar (arrastrar hacia arriba) el Panel APU inferior para visualizar más insumos a la vez.

**Problemas resueltos:**
- Se solucionó un problema de codificación UTF-8 en outer.py, service.py y epository.py del módulo catalog.
- Se ajustaron los tipos de TypeScript para la asignación correcta de is_verified y campos fuente.

**Decisiones cambiadas:**
- Se introdujo el concepto de "Validación Humana" (is_verified) como paso obligatorio antes de poder confiar en un ítem extraído del ETL, especialmente debido a las tablas fracturadas del PDF.

**Próximo paso:** Implementar la transferencia de ítems verificados al presupuesto del proyecto (POST /api/projects/{id}/library).
