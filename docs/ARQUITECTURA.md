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
│              ┌──────────┬─────────┼──────────┬──────────┐          │
│              ▼          ▼         ▼          ▼          ▼          │
│        ┌──────────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌────────┐   │
│        │ catalog  │ │  ifc   │ │mapper │ │ budget │ │library │   │
│        │ module   │ │importer│ │       │ │        │ │& export│   │
│        └────┬─────┘ └───┬────┘ └───┬───┘ └───┬────┘ └───┬────┘   │
│             └───────────┴──────────┴──────────┴──────────┘        │
│                                    │                               │
│                          ┌─────────▼────────┐                      │
│                          │   PostgreSQL DB   │                      │
│                          └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────┐
                    │       PIPELINE ETL (Python)  │
                    │  scripts/ numerados          │
                    │  TCPO · Mandu'a · Traducciones│
                    └──────────────┬───────────────┘
                                   │ carga inicial y actualizaciones
                                   ▼
                          PostgreSQL (catalog_items)
```

---

## Capas del sistema

### 1. Pipeline ETL — carga del catálogo

Scripts Python numerados que corren **fuera del servidor**, como tareas de mantenimiento. No forman parte del servidor web. Populan `catalog_items` y `apu_components` desde las fuentes oficiales.

| Script               | Responsabilidad                                                    |
| -------------------- | ------------------------------------------------------------------ |
| `01_init_db.py`      | Crea el schema PostgreSQL con índices. Se ejecuta una sola vez.    |
| `02_cargar_mandua.py`| Carga el catálogo Mandu'a (precios PY). Re-ejecutable para updates.|
| `03_cargar_tcpo.py`  | Carga partidas TCPO desde el Excel. Setea `creado_por = "catalog_tcpo"`. |
| `04_traducir.py`     | Traducción PT→ES con Gemini. Cachéa por MD5 del texto original.    |
| `05_clasificar.py`   | Clasificación de relevancia PY. Puede correr junto con traducción. |

**Contrato de salida:** filas en `catalog_items` con `unit_price = NULL` y `fuente_precios = NULL` para ítems que aún no tienen precio local. El resto de campos completos.

**Referencia:** `LECCIONES-V0.md` sección 4 — estos scripts son rescatables de V0 con adaptaciones menores.

---

### 2. Backend — módulos del servidor

#### 2.1 `catalog` — Catálogo de ítems

**Responsabilidad:** CRUD completo sobre `catalog_items` y `apu_components`. Búsqueda, filtrado por faceta y árbol NBR. Edición inline de precios y fuentes.

**Entradas:**
- Queries de búsqueda (texto, `nbr_code`, `facet`, `relevant_py`)
- Payload de edición (`unit_price`, `currency`, `fuente_precios`, `fuente_factores`, `modificado_por`)

**Salidas:**
- Listas de ítems con paginación
- Detalle de ítem con su APU completa (JOIN con `apu_components` y `catalog_items` de cada componente)

**Tablas que toca:** `catalog_items`, `apu_components`

**Regla de negocio clave:** al editar `unit_price` o `fuente_precios` de un ítem, el módulo actualiza también `modificado_por` y `updated_at`. El cambio es global — afecta a todos los APU que usen ese ítem como componente.

---

#### 2.2 `ifc_importer` — Ingesta del modelo IFC

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

**Nota sobre cantidades:** las cantidades geométricas (m², m³) se calculan en este módulo con `ifcopenshell` y se pasan al módulo `budget` en memoria — **no se persisten en la DB** (ver `MODELO-DE-DATOS.md` sección 12).

---

#### 2.3 `mapper` — Asignación GlobalId → ítem

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

#### 2.4 `budget` — Cálculo del presupuesto

**Responsabilidad:** calcular el presupuesto del proyecto combinando las cantidades geométricas (calculadas en tiempo real con `ifcopenshell`) con los precios snapshot de `project_assignments`.

**Entradas:**
- `project_id`
- Cantidades por `global_id` (calculadas por `ifc_importer` en tiempo real o cacheadas en sesión)

**Salidas:**
- Presupuesto agrupado por `nbr_code` con subtotales
- Desglose por elemento IFC
- Alertas de ítems sin precio (`unit_price = NULL` en `catalog_items`)

**Tablas que toca:** `project_assignments`, `catalog_items`, `ifc_elements`

**Lo que NO hace:** no modifica precios — solo lee. La edición de precios es responsabilidad del módulo `catalog`.

---

#### 2.5 `library` — Biblioteca del proyecto y keynotes

**Responsabilidad:** gestionar la biblioteca de ítems candidatos de un proyecto (`project_library`) y generar el archivo de keynotes para Revit.

**Entradas:**
- `project_id`
- Ítems a agregar/remover de la biblioteca
- Selección de facetas para el keynote (`["3E", "4U"]` o `["3E", "4U", "2C"]`)

**Salidas:**
- Estado de la `project_library` del proyecto
- Archivo `.txt` de keynotes (formato tabulado: `código\tdescripción\tcódigo_padre`)

**Tablas que toca:** `project_library`, `catalog_items`

**Formato del keynote file:**
```
3E[TAB][TAB]
3E 02[TAB]Resultados de obra gruesa[TAB]3E
3E 02 10[TAB]Muros de mampostería cerámica[TAB]3E 02
```
Solo se incluyen ítems con `bim_taggable = true` de las facetas seleccionadas. Los ítems sin precio (`unit_price = NULL`) se incluyen igual — el keynote file es para clasificación, no para precios.

---

#### 2.6 `exporter` — Exportación de informes

**Responsabilidad:** generar los formatos de entregable del presupuesto a partir de los datos calculados por `budget`.

**Formatos (MVP):**
- Excel (`.xlsx`) — presupuesto completo con desglose por faceta
- CSV — para consumo por otros sistemas

**Formatos (post-MVP):**
- PDF — presupuesto formal con encabezado del proyecto
- Integración directa con modelos IFC (IfcCostSchedule) — ver ADR-005

**Entradas:** resultado del módulo `budget` + metadatos del proyecto

**Tablas que toca:** solo lectura, ninguna escritura

---

### 2.7 Convención de estructura interna de módulos

Cada módulo del backend sigue una estructura de **5 archivos** fija. Esta convención facilita que cualquier desarrollador o agente de IA encuentre rápidamente el código relevante sin necesidad de explorar el árbol completo.

```
backend/<modulo>/
├── router.py       ← endpoints FastAPI (rutas HTTP, validación de request/response)
├── service.py      ← lógica de negocio (orquesta repository + reglas del dominio)
├── models.py       ← modelos SQLAlchemy (tablas de DB de este módulo)
├── repository.py   ← acceso a DB (queries SQL crudas o SQLAlchemy, sin lógica)
└── schemas.py      ← modelos Pydantic (serialización request/response a la API)
```

**Responsabilidades y límites:**
- `router.py` no llama a `repository.py` directamente — siempre pasa por `service.py`.
- `service.py` no construye queries SQL — llama métodos de `repository.py`.
- `models.py` define únicamente las tablas que este módulo **posee** (ver regla 1 de módulo: ningún módulo escribe en la tabla de otro). Puede importar modelos de otros módulos para relaciones FK, pero solo en lectura.
- `repository.py` no tiene lógica de negocio — solo SELECT/INSERT/UPDATE/DELETE.
- `schemas.py` no importa `models.py` — son capas separadas para evitar acoplar la representación de DB con la representación de API.

**Ejemplo — módulo `catalog`:**
```
backend/catalog/
├── router.py     → GET /catalog/items, PUT /catalog/items/{id}, GET /catalog/items/{id}/apu
├── service.py    → buscar_items(), actualizar_precio(), obtener_apu_completo()
├── models.py     → CatalogItem, APUComponent (SQLAlchemy)
├── repository.py → get_by_nbr_code(), search_fulltext(), update_price()
└── schemas.py    → CatalogItemResponse, APUComponentResponse, PriceUpdateRequest
```

*Lección de OCE: su módulo `bim_hub` sigue exactamente este patrón. La separación permite reemplazar el ORM (SQLAlchemy → SQLModel) sin tocar `router.py` ni `schemas.py`.*

---

### 2.8 Estrategia de migraciones (Alembic)

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

Búsqueda y filtrado del catálogo por faceta, texto y relevancia PY. Panel de detalle con la composición APU del ítem seleccionado — tabla editable con columnas: Clase, Código, Descripción, Unidad, Coef., Precio, Moneda, Fuente.

La edición de precio o fuente desde este panel dispara el diálogo de advertencia de cambio global (ver `INTERFAZ.md` sección 1) y llama al endpoint del módulo `catalog`.

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

Presupuesto del proyecto agrupado por faceta NBR. Resalta ítems con `unit_price = NULL` para que el usuario los complete antes de exportar. Conectado al `ifc_viewer` para selección bidireccional.

---

## Flujos principales

### Flujo A — Primera vez: cargar catálogo

```
ETL scripts (local)
  → 01_init_db     → schema PostgreSQL creado
  → 03_cargar_tcpo → catalog_items populado (unit_price = NULL)
  → 04_traducir    → description_es completo
  → 02_cargar_mandua → precios PY disponibles para matching manual
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
| `INTERFAZ.md`        | Decisiones de comportamiento del frontend                       |
| `LECCIONES-V0.md`    | Scripts ETL rescatables del prototipo anterior                  |
