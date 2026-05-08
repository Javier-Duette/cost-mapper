# Arquitectura — Cost-Mapper V2

> **Propósito de este documento:** Describir cómo está organizado el sistema en módulos, qué hace cada uno, cómo se comunican y dónde están los límites de responsabilidad. Este documento es la referencia para cualquier desarrollador (o agente de IA) que quiera modificar una parte del sistema sin tener que entender todo el resto.
>
> **Documentos previos requeridos:** `MODELO-DE-DATOS.md`, `docs/adrs/` (ADR-004, ADR-006)

---

## Vista general del sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (TypeScript)                        │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │   catalog   │  │  ifc_viewer  │  │  mapping  │  │  budget   │  │
│  │    panel    │  │  (3D WebGL)  │  │   panel   │  │   panel   │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘  │
│         └────────────────┴────────────────┴──────────────┘        │
│                                    │                               │
│                          API Client (fetch/REST)                   │
└────────────────────────────────────┼────────────────────────────────┘
                                     │ HTTP/JSON
┌────────────────────────────────────┼────────────────────────────────┐
│                        BACKEND (Python)                             │
│                                    │                               │
│                          ┌─────────▼────────┐                      │
│                          │   API Gateway    │                      │
│                          │   (FastAPI)      │                      │
│                          └────────┬─────────┘                      │
│              ┌──────────┬─────────┼──────────┬──────────┬──────────┐          │
│              ▼          ▼         ▼          ▼          ▼          ▼          │
│        ┌──────────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│        │ catalog  │ │  ifc   │ │mapper │ │ budget │ │library │ │settings│   │
│        │ module   │ │importer│ │       │ │        │ │& export│ │        │   │
│        └────┬─────┘ └───┬────┘ └───┬───┘ └───┬────┘ └───┬────┘ └────┬───┘   │
│             └───────────┴──────────┴──────────┴──────────┴──────────┘        │
│                                    │                               │
│                          ┌─────────▼────────┐                      │
│                          │   PostgreSQL DB   │                      │
│                          └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────┐
                    │       PIPELINE ETL (Python)  │
                    │  scripts/etl_tcpo/           │
                    │  TCPO V15 · PDF → catálogo   │
                    └──────────────┬───────────────┘
                                   │ carga inicial y actualizaciones
                                   ▼
                          SQLite/PostgreSQL (catalog_items)
```

---

## Capas del sistema

### 1. Pipeline ETL — carga del catálogo

Herramienta CLI Python en `scripts/etl_tcpo/` que corre **fuera del servidor**, como tarea de mantenimiento. No forma parte del servidor web. Popula `catalog_items` y `apu_components` extrayendo datos del PDF TCPO V15 rasterizado con Gemini Vision.

| Módulo               | Responsabilidad                                                         |
| -------------------- | ----------------------------------------------------------------------- |
| `detector.py`        | Renderiza páginas con `pymupdf`, detecta tablas con OpenCV, devuelve recortes PIL. |
| `extractor.py`       | Envía cada recorte a Gemini Vision (`gemini-2.5-flash`), parsea JSON con esquema fijo. Arquitectura 2-pasos: Pass 1 extrae solo códigos → Pass 2 extrae los no conocidos. |
| `loader.py`          | Valida e inserta en `catalog_items` + `apu_components` con `is_work_item=True`, `unit_price=NULL`. Incluye `get_existing_codes()` para el filtro del Paso 1. |
| `main.py`            | CLI con comandos `run`, `detect`, `status`. Flags: `--pages`, `--dry-run`, `--force`, `--single-pass`. |

**Contrato de salida:** filas en `catalog_items` con `is_work_item=True`, `unit_price=NULL` y `fuente_precios=NULL`. Descripciones en PT y ES (Gemini traduce en el mismo llamado de extracción).

**Invocación desde la UI:** el módulo `etl_runner.py` del backend expone `/api/etl/run` y `/api/etl/status` que ejecutan esta CLI como subproceso.

**Dependencias ETL:** `pymupdf`, `opencv-python`, `Pillow`, `google-generativeai`, `click`.

**Referencia:** ADR-012 — estrategia de extracción PDF + Gemini Vision.

---

### 2. Backend — módulos del servidor

#### 2.1 `projects` — Proyectos de construcción

**Responsabilidad:** CRUD de proyectos. Tabla raíz del sistema — todos los módulos project-scoped (library, ifc_elements, assignments) referencian un `project_id`. Incluye seed automático de proyectos demo en desarrollo.

**Entradas:** payload de creación/edición (`name`, `location`, `type`, `currency`)

**Salidas:** lista de proyectos, detalle de proyecto

**Tablas que toca:** `projects`

---

#### 2.2 `catalog` — Catálogo de ítems

**Responsabilidad:** CRUD completo sobre `catalog_items` y `apu_components`. Búsqueda, filtrado por faceta y árbol NBR. Edición inline de precios, fuentes, coeficientes y descripciones. Creación manual de ítems e insumos cuando el PDF TCPO trae tablas incompletas.

**Entradas:**
- Queries de búsqueda (texto, `nbr_code`, `facet`, `relevant_py`)
- Payload de edición (`unit_price`, `currency`, `fuente_precios`, `fuente_factores`, `modificado_por`)

**Salidas:**
- Listas de ítems con paginación
- Detalle de ítem con su APU completa (JOIN con `apu_components` y `catalog_items` de cada componente)

**Tablas que toca:** `catalog_items`, `apu_components`

**Regla de negocio clave:** al editar `unit_price`, `fuente_precios`, `fuente_factores`, descripción o un coeficiente APU, el módulo actualiza también `modificado_por` y `updated_at`. El cambio es global cuando afecta a `catalog_items` — impacta todos los APU que usen ese ítem como componente.

**Verificación humana:** `catalog_items.is_verified` indica que un humano revisó ítem, APU, fuentes y precios. Cualquier edición posterior invalida esa verificación (`is_verified=false`, `verificado_por=NULL`, `fecha_verificacion=NULL`) hasta una nueva confirmación desde el flujo de verificación.

---

#### 2.3 `ifc_importer` — Ingesta del modelo IFC

**Responsabilidad:** leer el archivo IFC subido por el usuario, extraer todos los elementos 3D, calcular cantidades desde geometría, detectar clasificaciones NBR embebidas y persistir en `ifc_elements`.

**Herramienta:** `ifcopenshell` (Python, LGPL). Sin dependencia de ningún software BIM específico.

**Entradas:**
- Archivo `.ifc` subido por el usuario
- `project_id`

**Salidas:**
- Filas en `ifc_elements` (upsert por `global_id`)
- Reporte de importación: total de elementos, cuántos traen `IfcClassificationReference`, cuántos no

**Tablas que toca:** `ifc_elements`

**Lo que NO hace:** no asigna ítems, no calcula el presupuesto. Solo popula `ifc_elements` con identidad, geometría y parámetros cualitativos.

**Nota sobre cantidades:** las cantidades geométricas (m², m³) se calculan en este módulo con `ifcopenshell` y se pasan al módulo `budget` en memoria — **no se persisten en la DB** (ver `MODELO-DE-DATOS.md` sección 13).

---

#### 2.4 `mapper` — Asignación GlobalId → ítem

**Responsabilidad:** crear y gestionar las filas de `project_assignments`. Maneja dos flujos: asignación automática desde `IfcClassificationReference` y asignación manual asistida.

**Entradas:**
- Lista de `ifc_elements` del proyecto (post-importación)
- Biblioteca del proyecto (`project_library`) para resolver códigos NBR → `item_id`
- Acciones manuales del usuario (aceptar sugerencia, buscar y asignar, corregir)

**Salidas:**
- Filas en `project_assignments` con `classification_source` = `"ifc_classification"` o `"user"`
- Lista de elementos sin asignar (para el panel de mapeo)
- Lista de conflictos detectados en reimportación (elemento cuyo `qualitative_snapshot` cambió y tenía asignación previa por `ifc_classification`)

**Tablas que toca:** `project_assignments`, `ifc_elements`, `project_library`, `catalog_items`

**Regla de negocio clave (reimportación):** si un elemento tiene asignación con `classification_source = "ifc_classification"` y su `qualitative_snapshot` cambió, el mapper propone actualizar la asignación automáticamente. Si la asignación era `"user"`, genera alerta de conflicto sin modificar.

---

#### 2.5 `budget` — Cálculo del presupuesto

**Responsabilidad:** calcular el presupuesto del proyecto. Módulo de solo lectura — no modifica ninguna tabla.

**Comportamiento actual (MVP — sin IFC):** lee de `project_library JOIN catalog_items`. Usa `manual_quantity` del ítem de biblioteca como cantidad. Ver ADR-010.

**Comportamiento futuro (post-IFC):** leerá de `project_assignments JOIN ifc_elements JOIN catalog_items`, calculando cantidades desde geometría en tiempo real con `ifcopenshell`. `manual_quantity` quedará como fallback para ítems en biblioteca sin asignación IFC.

**Entradas:** `project_id`

**Salidas:**
- Presupuesto agrupado por `facet` / `nbr_code` con subtotales
- KPIs: total, items_count, items_without_price, items_without_quantity
- Alertas de ítems sin precio o sin cantidad

**Tablas que toca (MVP):** `project_library`, `catalog_items` (solo lectura)

**Lo que NO hace:** no modifica precios. La edición de precios es responsabilidad del módulo `catalog`.

---

#### 2.6 `library` — Biblioteca del proyecto y keynotes

**Responsabilidad:** gestionar la biblioteca de ítems candidatos de un proyecto (`project_library`) y generar el archivo de keynotes para Revit.

**Estado actual (MVP implementado):** CRUD completo. Los 4 endpoints están operativos:
- `GET /api/projects/{id}/library` — lista ítems de la biblioteca con `manual_quantity`
- `POST /api/projects/{id}/library` — agrega ítem; devuelve 409 si ya existe
- `PATCH /api/projects/{id}/library/{entry_id}` — actualiza `notes` y `manual_quantity`
- `DELETE /api/projects/{id}/library/{entry_id}` — elimina entrada

**Entradas:**
- `project_id`
- Ítems a agregar/remover de la biblioteca (`item_id`, `notes`, `manual_quantity`)
- Selección de facetas para el keynote (`["3E", "4U"]` o `["3E", "4U", "2C"]`)

**Salidas:**
- Estado de la `project_library` del proyecto
- Archivo `.txt` de keynotes en TSV (`código\tdescripción\tcódigo_padre`) desde `GET /api/projects/{id}/library/export/keynotes`

**Tablas que toca:** `project_library`, `catalog_items`

**Campo `manual_quantity`:** nullable Decimal(14,4). Permite presupuesto pre-IFC. Ver ADR-010.

**Formato del keynote file (MVP básico implementado):**
```
3E[TAB][TAB]
3E 02[TAB]Resultados de obra gruesa[TAB]3E
3E 02 10[TAB]Muros de mampostería cerámica[TAB]3E 02
```
Solo se incluyen ítems con `bim_taggable = true` de las facetas seleccionadas.

**Estado real de keynotes:** la generación básica TSV existe. Aún requiere validación técnica con Revit real y cierre de encoding final; la preferencia documentada por el PAC es Unicode apto para acentos/ñ/guaraní. Hasta esa validación, el formato se considera funcional para pruebas internas, no cerrado para obra real.

**Verificación antes de exportar:** por defecto no se debe exportar ningún entregable con ítems no verificados (`is_verified=false`). Keynotes tiene una excepción controlada: puede permitir override manual porque usa código y descripción, no precios ni coeficientes. Ese override debe mostrar advertencia explícita y quedar auditado; PDF/Excel/informes IFC no tienen override en MVP.

---

#### 2.7 `etl_runner` — Trigger de ETL desde la UI

**Responsabilidad:** exponer endpoints HTTP para que la UI pueda disparar y monitorear el pipeline ETL sin usar la terminal.

**Nota estructural:** este módulo es un router standalone (`backend/etl_runner.py`), no sigue la convención de 4 archivos porque no tiene acceso directo a la DB — delega toda la lógica al CLI de `scripts/etl_tcpo/`.

**Entradas:**
- `POST /api/etl/run` — `{ pages, dry_run, force }` — ejecuta `scripts/etl_tcpo/main.py run` como subproceso
- `GET /api/etl/status` — devuelve resumen de `scripts/data/tcpo_progress.json`

**Salidas:**
- `{ ok: bool, output: string }` — stdout completo del proceso ETL
- `{ total_items: int, pages: {...} }` — estado actual del progreso

**Implementación:** usa `subprocess.run` síncrono en `fastapi.concurrency.run_in_threadpool` para evitar el bug de asyncio ProactorEventLoop en Windows con pipes.

---

#### 2.8 `settings` — Configuración transitoria pre-auth

**Responsabilidad:** gestión de catálogos maestros para auditoría y validación antes de implementar autenticación real.

**Entradas:** payload CRUD para usuarios de verificación y fuentes de precios/factores.

**Salidas:** listas de usuarios y fuentes activos para selectores del frontend.

**Tablas que toca:** `settings_users`, `settings_sources`.

**Regla de negocio clave:** `settings_users` no reemplaza a `users` ni define permisos. Es un catálogo transitorio que evita nombres libres inconsistentes en `AuditModal` y `VerifyModal`. `settings_sources` normaliza las fuentes usadas en `fuente_precios` y `fuente_factores`.

**Deuda conocida:** el PAC-20..PAC-24 debe alinear `backend/settings/` con la convención ADR-009 de 4 archivos. Esta sección documenta el estado funcional actual, no cierra esa deuda estructural.

---

#### 2.9 `exporter` — Exportación de informes

**Responsabilidad:** generar los formatos de entregable del presupuesto a partir de los datos calculados por `budget`.

**Formatos (MVP):**
- Excel (`.xlsx`) — presupuesto completo con desglose por faceta
- CSV — para consumo por otros sistemas

**Formatos (post-MVP):**
- PDF — presupuesto formal con encabezado del proyecto
- Integración directa con modelos IFC (IfcCostSchedule) — ver ADR-005

**Entradas:** resultado del módulo `budget` + metadatos del proyecto

**Tablas que toca:** solo lectura, ninguna escritura

**Regla de verificación:** antes de generar PDF, Excel, CSV o informes IFC, el exportador debe verificar que todos los ítems incluidos tengan `catalog_items.is_verified=true`. Si hay ítems no verificados, responde con error bloqueante y lista de ítems pendientes. En MVP no hay override para PDF/Excel; el override solo está permitido para keynotes bajo el módulo `library`.

---

### 2.10 Convención de estructura interna de módulos

Cada módulo del backend sigue una estructura de **4 archivos** fija (ADR-009). Esta convención facilita que cualquier desarrollador o agente de IA encuentre rápidamente el código relevante sin necesidad de explorar el árbol completo.

```
backend/<modulo>/
├── router.py       ← endpoints FastAPI (rutas HTTP, validación de request/response)
├── service.py      ← lógica de negocio (orquesta repository + reglas del dominio)
├── models.py       ← modelos SQLModel (SQLAlchemy + Pydantic combinados — ADR-009)
└── repository.py   ← acceso a DB (queries SQL crudas o SQLModel, sin lógica)
```

**Responsabilidades y límites:**
- `router.py` no llama a `repository.py` directamente — siempre pasa por `service.py`.
- `service.py` no construye queries SQL — llama métodos de `repository.py`.
- `models.py` define los modelos SQLModel que este módulo **posee** (ver regla 1 de módulo: ningún módulo escribe en la tabla de otro). Los modelos con `table=True` mapean a tablas de DB; los modelos sin `table=True` (ej: `CatalogItemCreate`, `CatalogItemUpdate`) se usan para validación de request/response. Puede importar modelos de otros módulos para relaciones FK, pero solo en lectura.
- `repository.py` no tiene lógica de negocio — solo SELECT/INSERT/UPDATE/DELETE.

**Ejemplo — módulo `catalog`:**
```
backend/catalog/
├── router.py     → GET /catalog/items, PUT /catalog/items/{id}, GET /catalog/items/{id}/apu
├── service.py    → buscar_items(), actualizar_precio(), obtener_apu_completo()
├── models.py     → CatalogItem (table=True), CatalogItemCreate, CatalogItemUpdate, APUComponent (table=True)
└── repository.py → get_by_nbr_code(), search_fulltext(), update_price()
```

*Evolución: la convención original de OCE usaba 5 archivos con `schemas.py` separado. ADR-009 consolida `models.py` + `schemas.py` en un solo archivo usando SQLModel, que combina SQLAlchemy y Pydantic en una sola clase.*

---

### 2.11 Estrategia de migraciones (Alembic)

Las migraciones de schema usan **Alembic** con el patrón de "baseline sin-op":

1. **Primera migración (`001_baseline.py`):** no-op. Las tablas ya existen porque `01_init_db.py` las creó con `create_all()`. Esta migración solo marca el estado inicial como "migrado" sin ejecutar DDL.
2. **Migraciones posteriores:** cada cambio de schema (nueva columna, nuevo índice, nueva tabla) tiene su propio archivo de migración Alembic generado con `alembic revision --autogenerate`.

**Por qué este enfoque:** `01_init_db.py` es el script de primera instalación — crea todo desde cero. Alembic maneja los cambios incrementales en instancias ya desplegadas. Los dos coexisten sin conflicto.

```bash
# Generar una nueva migración después de editar models.py
alembic revision --autogenerate -m "add geometry_hash to ifc_elements"

# Aplicar migraciones pendientes
alembic upgrade head
```

*Lección de OCE: su primera migración Alembic es explícitamente un no-op con un comentario que dice exactamente eso. Evita el error de intentar crear tablas que ya existen en instalaciones nuevas.*

---

### 3. Frontend — módulos de interfaz

#### 3.1 `catalog_panel` — Explorador y editor del catálogo

Búsqueda y filtrado del catálogo por faceta, texto y relevancia PY. Panel de detalle con la composición APU del ítem seleccionado.

**Estado actual (MVP implementado):**
- Árbol de facetas NBR en sidebar izquierdo. Sin selección → empty state (no carga 10k ítems)
- Tabla de ítems con datos reales del backend (`GET /api/catalog/items`)
- Botón `+` por fila (visible en hover): agrega al `project_library` del proyecto activo vía `POST /api/projects/{id}/library`
- Feedback visual con toast: éxito (verde) o duplicado (amarillo)
- Panel APU en `area-panel`: datos reales de `GET /api/catalog/items/{id}/apu`

La edición de precio, fuente, descripción o coeficiente desde este panel dispara el diálogo de auditoría correspondiente y llama al endpoint del módulo `catalog`. Si el ítem estaba verificado, la edición invalida la verificación y exige nueva revisión humana.

---

#### 3.2 `ifc_viewer` — Visor 3D

Visor WebGL del modelo IFC usando `@thatopen/components`. Muestra una vista isométrica del modelo con selección bidireccional:

- Clic en elemento 3D → resalta la fila correspondiente en el panel de presupuesto
- Clic en fila del presupuesto → resalta el elemento 3D y pone el resto translúcido

**Herramienta:** `@thatopen/components` (TypeScript, open source). Software-agnóstica: acepta cualquier IFC válido independiente del software de origen.

---

#### 3.3 `mapping_panel` — Panel de mapeo

Interfaz para completar las asignaciones post-importación. Divide los elementos en tres grupos:

- **Auto-asignados** — asignados desde `IfcClassificationReference`. El usuario verifica.
- **Sin asignar** — requieren mapeo manual. El panel sugiere ítems por `IfcType`.
- **Conflictos** — elementos cuyo snapshot cambió en una reimportación con asignación manual previa.

---

#### 3.4 `budget_panel` — Vista del presupuesto

Presupuesto del proyecto agrupado por faceta NBR. Resalta ítems con `unit_price = NULL` para que el usuario los complete antes de exportar.

**Estado actual (MVP implementado):**
- Carga desde `GET /api/projects/{id}/budget` (lee `project_library JOIN catalog_items`)
- KPI strip: costo directo, ítems totales, sin precio, sin cantidad
- Banner dinámico cuando hay ítems sin precio o sin cantidad
- Filas agrupadas por faceta con subtotales
- Edición inline de `manual_quantity` — **pendiente de implementar** (próximo paso)

---

#### 3.5 `settings_panel` — Panel de configuración y ETL

Interfaz para ejecutar el pipeline ETL TCPO desde el navegador sin usar la terminal y para mantener catálogos transitorios de usuarios/fuentes.

**Estado actual (MVP implementado):** `EtlView.tsx` — cards de estadísticas (ítems en catálogo, páginas OK/parciales/errores), input de páginas, checkboxes Dry-run/Forzar, botón Ejecutar, log de output con borde coloreado según resultado.

Llama a `POST /api/etl/run` y `GET /api/etl/status` del módulo `etl_runner`.

**SettingsView implementado:** permite crear, editar y desactivar/eliminar entradas de `settings_users` y `settings_sources`. Estos datos alimentan los selectores de auditoría y verificación humana.

---

#### 3.6 `shared` — Componentes reutilizables

Componentes de uso transversal a todas las vistas:

| Componente | Descripción |
|---|---|
| `Icon.tsx` | 22 íconos inline SVG |
| `Chip.tsx` | Badges de faceta NBR + `SourceBadge` para fuente de precio |
| `Header.tsx` | Barra superior con selector de proyecto |
| `Sidebar.tsx` | Navegación principal con tooltips |
| `SectionHeader.tsx` | Título de sección + búsqueda + filtros de faceta |
| `DetailPanel.tsx` | Panel APU inferior (área-panel) |
| `Toast.tsx` | Notificaciones transitorias con auto-dismiss (3s). Hook `useToast` para gestionar el stack. Tipos: `success` / `warning` / `error`. |
| `formatters.ts` | `fmt(n)` — formato numérico con locale `es-PY` |

---

## Flujos principales

### Flujo A — Primera vez: cargar catálogo

```
Opción 1: desde la UI
  Usuario abre sección "Importar TCPO V15" (settings_panel/EtlView)
  → ingresa rango de páginas del PDF TCPO V15
  → activa Dry-run para previsualizar sin tocar DB
  → ejecuta → backend llama a scripts/etl_tcpo/main.py run
  → Gemini Vision extrae tablas → loader inserta en catalog_items

Opción 2: desde la terminal
  cd scripts/etl_tcpo
  python main.py run --pages 37-50
  → mismo pipeline, sin pasar por el backend
```

### Flujo B — Preparar un proyecto nuevo

```
Usuario crea proyecto
  → agrega ítems a project_library (módulo library)
  → configura facetas del keynote
  → descarga keynote .txt (módulo library)
  → carga keynote en Revit
  → modela aplicando keynotes NBR a elementos
  → exporta IFC desde Revit
```

### Flujo C — Importar IFC y generar presupuesto

```
Usuario sube IFC
  → ifc_importer: extrae ifc_elements + calcula cantidades
  → mapper: auto-asigna desde IfcClassificationReference
  → mapping_panel: usuario completa asignaciones faltantes
  → budget: calcula presupuesto con cantidades × unit_price
  → exporter: genera Excel/PDF
```

### Flujo D — Actualizar precios del catálogo

```
Usuario abre catalog_panel o APU panel de un ítem
  → edita unit_price y fuente_precios de un componente
  → diálogo de advertencia: "cambio global"
  → confirma → catalog module: UPDATE catalog_items
  → budget recalcula con nuevos precios en la próxima apertura
```

---

## Reglas de módulo

Estas reglas garantizan que los módulos sean modificables de forma independiente:

1. **Ningún módulo escribe en la tabla de otro módulo.** `budget` no escribe en `project_assignments`. `ifc_importer` no escribe en `catalog_items`. Las fronteras son estrictas.

2. **Las cantidades geométricas no se persisten.** `ifc_importer` las calcula y las pasa en memoria. Si el frontend necesita mostrarlas, las pide al backend que las recalcula. Esto evita que la DB quede desincronizada con el IFC.

3. **El módulo `catalog` es el único que escribe en `catalog_items`.** Cualquier operación que modifique precios, fuentes o descripciones pasa por este módulo, nunca directo desde otro.

4. **Los módulos de frontend no tienen lógica de negocio.** Formatean datos y llaman endpoints. El cálculo del presupuesto, la resolución de conflictos de reimportación y la generación del keynote file ocurren en el backend.

---

## Referencias

| Documento            | Relación                                                        |
| -------------------- | --------------------------------------------------------------- |
| `MODELO-DE-DATOS.md` | Define las tablas que cada módulo lee y escribe                 |
| `docs/adrs/ADR-004.md` | Flujo IFC completo — justifica el diseño del módulo ifc_importer y mapper |
| `docs/adrs/ADR-006.md` | Requisito de modularidad — justifica las reglas de módulo       |
| `docs/adrs/ADR-009.md` | Migración a SQLModel — justifica la estructura de 4 archivos por módulo |
| `INTERFAZ.md`        | Decisiones de comportamiento del frontend                       |
| `LECCIONES-V0.md`    | Scripts ETL rescatables del prototipo anterior                  |
