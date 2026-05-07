# Modelo de Datos — Cost-Mapper V2

> **Propósito de este documento:** Esquema conceptual de la base de datos. Define las entidades, sus campos clave y las relaciones entre ellas. Las decisiones de diseño aquí documentadas derivan directamente de los ADRs — cada campo importante tiene una razón. Este documento es la referencia para diseñar las migraciones de PostgreSQL.

**Documentos previos requeridos:** `ISO-12006.md`, `docs/adrs/` (ADR-001, ADR-004, ADR-007)

---

## Mapa de entidades

```
┌─────────────────┐       ┌──────────────────┐
│  catalog_items  │◄──────│  apu_components  │
│  (catálogo NBR) │       │  (composición APU│
└────────┬────────┘       └──────────────────┘
         │
         │  referenciado por
         ▼
┌──────────────────┐     ┌─────────────────────┐
│ project_library  │     │  project_assignments│
│ (ítems candidatos│     │  (GlobalId → ítem)  │
└──────┬───────────┘     └──────────┬──────────┘
       │                            │
       └──────────┬─────────────────┘
                  ▼
           ┌─────────────┐
           │   projects  │
           └──────┬──────┘
                  │
       ┌──────────┼──────────┬──────────────────┐
       ▼          ▼          ▼                  ▼
┌───────────┐ ┌──────────┐ ┌────────────────┐ ┌──────────────────┐
│ifc_elements│ │ project  │ │project_markups │ │  project_phases  │
│(modelo 3D)│ │ _phases  │ │(GG, IVA, util.)│ │  (flujo de caja) │
└───────────┘ └──────────┘ └────────────────┘ └──────────────────┘
```

---

## 1. `catalog_items` — El catálogo de ítems

La tabla central del sistema. Contiene todos los ítems presupuestables: los extraídos del PDF TCPO V15, y los creados por usuarios. Un ítem es la unidad mínima de presupuesto — tiene una descripción, una clasificación NBR 15965, un precio unitario y una composición APU.

```
catalog_items
─────────────────────────────────────────────────────────────
id                  UUID          PK. El UUID oficial de NBR 15965
                                  (Partes 4 y 5) o un UUID generado
                                  localmente (Capa 2 y 3 del ADR-001)

uuid_status         TEXT          "official" | "provisional" | "local"
                                  Determina la interoperabilidad IFC.

nbr_code            TEXT          Código de faceta NBR 15965.
                                  Ej: "3E 05 20 10", "2N 30 00"
                                  El padre es siempre un prefijo del hijo
                                  → búsquedas por árbol con LIKE.

facet               TEXT          Los dos primeros caracteres del código.
                                  Ej: "3E", "2N", "2C"
                                  Campo derivado pero almacenado para
                                  performance de filtros.

description_pt      TEXT          Descripción original en portugués (TCPO V15)
description_es      TEXT          Descripción traducida al español

unit                TEXT          Unidad de medida. Ej: "m²", "m³", "un", "hr"

classification_source TEXT        "v15_official" | "user"
                                  Origen de la clasificación NBR del ítem.

confidence          INT           0–100. Solo para clasificaciones automáticas.
                                  NULL si es oficial o manual.

creado_por          TEXT          "catalog_tcpo" | "catalog_mandua"
                                  | "user:{user_id}" | "import:{fuente}"

oficial             BOOLEAN       true = proviene de un catálogo oficial
                                  sin modificación del usuario.

bim_taggable        BOOLEAN       true = puede etiquetarse en el modelo BIM.
                                  Determinado por faceta según ISO-12006.md.
                                  3E, 4U → true siempre
                                  2C → true (configurable)
                                  2N, 2Q, 1S → false siempre

relevant_py         BOOLEAN       true = relevante para el mercado paraguayo.
                                  Asignado durante el ETL de traducción.

fuente_factores     TEXT          Origen de rendimientos y consumos de la APU.
                                  "tcpo" | "mopc" | "user" | "unit" | etc.
                                  Editable por el usuario.

unit_price          DECIMAL(14,2) Precio unitario vigente del ítem en el catálogo.
                                  NULL si aún no fue cargado (ej. ítem TCPO sin
                                  precio local asignado todavía).
                                  Para ítems TCPO cargados con precio en BRL,
                                  este campo se llena cuando el usuario lo
                                  actualiza al precio local (PYG o USD).

currency            TEXT          Moneda del unit_price.
                                  "PYG" | "USD" | "BRL"
                                  NULL si unit_price es NULL.

fuente_precios      TEXT          Origen del valor monetario del ítem.
                                  "mandua_2026_03" | "relevamiento_propio"
                                  | "tcpo_brl" | "licitacion_mopc_2025" | etc.
                                  Editable por usuario y por proyecto.
                                  NULL si unit_price es NULL.

parent_nbr_code     TEXT          Código NBR del ítem padre en la jerarquía.
                                  NULL para los nodos raíz de cada faceta.
                                  Permite reconstruir el árbol de clasificación.

modificado_por      TEXT          Último usuario o proceso que editó el ítem.
                                  Mismo vocabulario que creado_por:
                                  "catalog_tcpo" | "catalog_mandua"
                                  | "user:{user_id}" | "import:{fuente}"
                                  NULL si nunca fue modificado desde la carga.

created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
─────────────────────────────────────────────────────────────
```

**Decisiones de diseño:**
- `id` es el UUID NBR, no un autoincremental. Permite sincronización con bSDD y garantiza que dos instancias de Cost-Mapper que hablen del mismo UUID hablen del mismo ítem.
- `facet` es campo derivado almacenado — los filtros por faceta son frecuentes y no vale recalcularlos en cada query.
- `fuente_precios` y `fuente_factores` son independientes porque la composición técnica (cuántos kg de cemento) y el precio de cada insumo son datos de naturaleza distinta con ciclos de actualización distintos.
- `unit_price` y `currency` viven en `catalog_items` porque los insumos (`2N`, `2C`, `2Q`) tienen precio propio en el catálogo. Es desde este campo que el panel APU muestra y edita precios. `unit_price` puede ser NULL para ítems TCPO recién cargados que aún no tienen precio local asignado.
- Los ítems son **editables en place**, incluyendo los de fuentes oficiales (TCPO, MOPC). Cuando se edita un valor, se actualiza `fuente_precios` o `fuente_factores` para reflejar el nuevo origen, y `modificado_por` queda registrado. El UUID no cambia, por lo que las referencias en `apu_components` y `project_assignments` siguen siendo válidas automáticamente.

---

## 2. `apu_components` — Composición del Análisis de Precio Unitario

Cada ítem presupuestable puede tener una descomposición en insumos: mano de obra (`2N`), equipos (`2Q`) y materiales/componentes (`2C`). Esta tabla almacena esa composición.

```
apu_components
─────────────────────────────────────────────────────────────
id                  UUID          PK

item_id             UUID          FK → catalog_items.id
                                  El ítem "padre" que se está descomponiendo.

component_id        UUID          FK → catalog_items.id
                                  El insumo (debe ser 2N, 2Q o 2C).

quantity            DECIMAL(12,6) Cantidad del insumo por unidad del ítem padre.
                                  Ej: 0.15 hr de albañil por m² de muro.

unit                TEXT          Unidad del insumo. Ej: "hr", "kg", "un"

notes               TEXT          Observaciones de rendimiento o condición.
                                  Opcional.

source              TEXT          "tcpo" | "mopc" | "user"
                                  Origen de este rendimiento específico.
─────────────────────────────────────────────────────────────
```

**Decisión de diseño:** `component_id` apunta a otro `catalog_items`. Los insumos son ítems de pleno derecho en el catálogo — no son una tabla separada de "materiales". Esto permite que un insumo tenga su propio precio, su propio UUID y pueda aparecer en múltiples APUs.

**Panel de desglose APU** — query de la vista de composición (equivalente al panel V0):

```sql
SELECT
  ci.facet                     AS clase,       -- "2N" → M.O., "2Q" → Equipo, "2C" → MAT.
  ci.nbr_code                  AS codigo,
  ci.description_es            AS descripcion,
  ci.unit                      AS unidad,
  ac.quantity                  AS coef,
  ci.unit_price                AS precio,
  ci.currency,
  ci.fuente_precios            AS fuente,
  ac.id                        AS apu_component_id  -- necesario para edición inline
FROM apu_components ac
JOIN catalog_items ci ON ci.id = ac.component_id
WHERE ac.item_id = :item_id
ORDER BY ci.facet, ci.nbr_code;
```

**Edición desde el panel APU:** cuando el usuario modifica `precio` o `fuente` en esta tabla, el UPDATE se ejecuta sobre `catalog_items` (no sobre `apu_components`), actualizando `unit_price`, `fuente_precios` y `modificado_por` del componente. Esto significa que **el cambio es global**: editar el precio de "carpintero H" desde el APU de "Canteiro de obras" actualiza ese precio para todos los ítems que usen "carpintero H" como insumo. El panel debe indicarlo visualmente para que el usuario sea consciente del alcance del cambio.

---

## 3. `projects` — Proyectos de construcción

```
projects
─────────────────────────────────────────────────────────────
id                  UUID          PK

name                TEXT          Nombre del proyecto.
description         TEXT          Descripción libre.
location            TEXT          Ubicación. Ej: "Asunción, PY"
type                TEXT          Tipo de obra. "residencial" | "comercial"
                                  | "infraestructura" | "industrial"

owner_id            UUID          FK → users.id

currency            TEXT          Moneda base del presupuesto. "PYG" | "USD"

ifc_file_path       TEXT          Ruta al último IFC importado.
ifc_imported_at     TIMESTAMPTZ   Fecha del último import.

created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
─────────────────────────────────────────────────────────────
```

---

## 4. `project_library` — Biblioteca de ítems del proyecto

Los ítems que el usuario preselecciona para un proyecto antes de modelar. **Esta tabla es la fuente del archivo de keynotes** generado para Revit. No es lo mismo que las asignaciones reales — un ítem puede estar en la biblioteca sin estar asignado a ningún elemento IFC.

```
project_library
─────────────────────────────────────────────────────────────
id                  UUID          PK

project_id          UUID          FK → projects.id
item_id             UUID          FK → catalog_items.id

added_by            UUID          FK → users.id
added_at            TIMESTAMPTZ

notes               TEXT          Nota del usuario sobre por qué agregó este ítem.
                                  Opcional.

UNIQUE(project_id, item_id)       Un ítem no puede estar dos veces en la
                                  misma biblioteca.
─────────────────────────────────────────────────────────────
```

**Decisión de diseño:** Tabla separada de `project_assignments` (ver ADR-004). La distinción es crítica: la biblioteca es la _intención_ (qué ítems pienso usar), las asignaciones son la _realidad_ (qué ítem está vinculado a qué elemento IFC).

**Copia entre proyectos:** Copiar la biblioteca de un proyecto a otro es simplemente un INSERT SELECT entre las filas de `project_library` de un `project_id` a otro. No hay lógica especial — la función de copia es una operación directa sobre esta tabla.

---

## 5. `ifc_elements` — Elementos del modelo 3D

Los elementos geométricos extraídos del IFC importado. Se actualiza en cada importación.

```
ifc_elements
─────────────────────────────────────────────────────────────
id                  UUID          PK (interno)

project_id          UUID          FK → projects.id
global_id           TEXT          El GlobalId IFC del elemento.
                                  Identificador persistente — no cambia
                                  aunque el elemento se modifique en Revit.
                                  La combinación (project_id, global_id)
                                  es única.

ifc_type            TEXT          Clase IFC del elemento.
                                  Ej: "IfcWall", "IfcSlab", "IfcColumn"

ifc_name            TEXT          Nombre del elemento en el modelo.
ifc_level           TEXT          Nivel/planta del modelo.

nbr_classification  TEXT          Código NBR extraído del
                                  IfcClassificationReference, si existe.
                                  NULL si el elemento no trae clasificación.

qualitative_snapshot JSONB        Snapshot de parámetros cualitativos al
                                  momento del último import.
                                  Ej: {"thickness": 0.15, "material": "ceramic",
                                       "type": "IfcWallType_BrickWall_15"}
                                  Usado para mostrar detalles al usuario
                                  en el panel de mapeo.

geometry_hash       TEXT          Hash MD5 del `qualitative_snapshot` serializado.
                                  Calculado al momento del import.
                                  Permite detectar cambios cualitativos en
                                  reimportaciones con una comparación de string
                                  en lugar de comparar el JSON completo.
                                  (Lección de OCE: más liviano que comparar JSONB)

last_import_at      TIMESTAMPTZ   Cuándo fue el último import que vio
                                  este elemento.

status              TEXT          "active" | "deleted"
                                  "deleted" cuando el GlobalId desaparece
                                  en una reimportación.

UNIQUE(project_id, global_id)
─────────────────────────────────────────────────────────────
```

**Sobre las cantidades:** Las cantidades **no se almacenan**. Se recalculan desde la geometría en cada importación con `ifcopenshell`. Esta tabla guarda la identidad y los parámetros cualitativos del elemento, no sus medidas.

---

## 6. `project_assignments` — Asignaciones GlobalId → Ítem

El vínculo real entre un elemento 3D del modelo y un ítem del presupuesto. **Esta tabla es la fuente del presupuesto.** Un elemento IFC puede tener múltiples ítems asignados (ej. un muro puede tener ítem de estructura + ítem de revoque + ítem de pintura).

```
project_assignments
─────────────────────────────────────────────────────────────
id                  UUID          PK

project_id          UUID          FK → projects.id
ifc_element_id      UUID          FK → ifc_elements.id
item_id             UUID          FK → catalog_items.id

classification_source TEXT        "ifc_classification" | "user"
                                  ifc_classification = asignado automáticamente
                                  desde el IfcClassificationReference del modelo.
                                  user = asignado o corregido manualmente.
                                  Determina el comportamiento en reimportaciones
                                  (ADR-004, sección de sincronización).

confidence          DECIMAL(5,2)  Nivel de confianza de la asignación automática
                                  (0.00–100.00). NULL para asignaciones manuales
                                  (classification_source = 'user') y para las
                                  asignadas por IfcClassificationReference (que
                                  son exactas por definición).
                                  El panel de mapeo puede ordenar las asignaciones
                                  automáticas de menor a mayor confianza para que
                                  el usuario revise primero las más dudosas.

qualitative_snapshot_at_assignment JSONB  Copia del `qualitative_snapshot` de
                                  `ifc_elements` al momento en que se creó o
                                  confirmó esta asignación.
                                  Se usa para detectar si el elemento cambió
                                  cualitativamente en una reimportación posterior:
                                  si `ifc_elements.geometry_hash` difiere del
                                  hash calculado sobre este campo, hay conflicto.

unit_price          DECIMAL(14,2) Precio unitario al momento de la asignación.
                                  En la moneda del proyecto.
                                  Snapshot del precio — no se recalcula
                                  automáticamente si el catálogo cambia.

price_updated_at    TIMESTAMPTZ   Cuándo se actualizó el precio por última vez.

fase_id             UUID          FK → project_phases.id
                                  NULL en MVP. Reservado para flujo de caja
                                  (ADR-007).

assigned_by         UUID          FK → users.id
assigned_at         TIMESTAMPTZ
─────────────────────────────────────────────────────────────
```

**Decisiones de diseño:**
- `unit_price` se almacena como snapshot porque el presupuesto debe ser reproducible: si el precio del catálogo cambia mañana, el presupuesto de hoy no debe cambiar solo. El usuario actualiza precios explícitamente.
- `fase_id` es nullable desde el MVP para evitar una migración de esquema cuando se implemente el módulo de flujo de caja en post-MVP.
- `classification_source` es la columna que determina el comportamiento en reimportaciones: si la keynote cambia en Revit y el ítem fue asignado por `ifc_classification`, se actualiza automáticamente. Si fue asignado por `user`, se genera una alerta de conflicto.

---

## 7. `project_markups` — Sobrecostos del presupuesto

Los porcentajes adicionales que se aplican sobre el costo directo del presupuesto: gastos generales, utilidad del contratista, IVA, imprevistos, etc. Son por proyecto — distintos proyectos pueden tener distintos esquemas de sobrecostos.

```
project_markups
─────────────────────────────────────────────────────────────
id                  UUID          PK

project_id          UUID          FK → projects.id ON DELETE CASCADE

name                TEXT          Nombre legible. Ej: "Gastos Generales",
                                  "Utilidad del Contratista", "IVA 10%"

markup_type         TEXT          "percentage" | "fixed"
                                  percentage = porcentaje sobre una base.
                                  fixed = monto fijo en la moneda del proyecto.

category            TEXT          "overhead" | "profit" | "tax" | "contingency"
                                  Categoría semántica para agrupar en el informe.

percentage          DECIMAL(6,3)  Porcentaje a aplicar. Ej: 10.000 para 10%.
                                  NULL si markup_type = 'fixed'.

fixed_amount        DECIMAL(14,2) Monto fijo. NULL si markup_type = 'percentage'.

apply_to            TEXT          "direct_cost" | "cumulative"
                                  direct_cost = % del total de ítems del presupuesto.
                                  cumulative = % del subtotal anterior incluidos
                                  los markups previos en sort_order.
                                  Permite calcular IVA sobre el total con GG y
                                  utilidad ya incluidos.

sort_order          INTEGER       Orden de aplicación (ascendente).
                                  Los markups se aplican en este orden.
                                  Importante: el IVA debe tener sort_order
                                  mayor que GG y utilidad.

is_active           BOOLEAN       false = el markup existe pero está desactivado.
                                  Permite desactivar sin borrar.

created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
─────────────────────────────────────────────────────────────
```

**Decisiones de diseño:**
- Un presupuesto paraguayo típico tiene: Gastos Generales (~12%), Utilidad (~10%), IVA (10% sobre el total con GG y utilidad). Estos tres se modelan con `sort_order` 1, 2, 3 y `apply_to` = `cumulative` para el IVA.
- Los markups no modifican el costo directo — se calculan en el módulo `budget` al momento de generar el resumen del presupuesto y al exportar. No se persisten como totales.
- `fixed_amount` cubre el caso de empresas que cotizan gastos administrativos como monto fijo independiente de la magnitud de la obra.

**Ejemplo de configuración típica:**

| sort_order | name | type | value | apply_to |
|---|---|---|---|---|
| 1 | Gastos Generales | percentage | 12.000 | direct_cost |
| 2 | Utilidad | percentage | 10.000 | direct_cost |
| 3 | IVA 10% | percentage | 10.000 | cumulative |

El IVA con `apply_to = cumulative` se calcula sobre el subtotal que ya incluye GG y utilidad.

---

## 8. `project_phases` — Fases de ejecución (post-MVP)

Fases de ejecución del proyecto para el módulo de flujo de caja. Diseñada desde el inicio para que la FK `project_assignments.fase_id` no requiera migración posterior.

```
project_phases
─────────────────────────────────────────────────────────────
id                  UUID          PK

project_id          UUID          FK → projects.id
name                TEXT          Nombre libre. Ej: "Fundaciones", "Estructura"
order               INT           Orden de la fase dentro del proyecto.

start_date          DATE          Fecha de inicio estimada.
duration_days       INT           Duración estimada en días.

nbr_1f_code         TEXT          Código 1F de NBR 15965. Opcional.
                                  Metadato de clasificación del tipo de etapa.

notes               TEXT
─────────────────────────────────────────────────────────────
```

**Estado:** Tabla definida en el esquema inicial pero sin lógica de negocio en MVP. El módulo de flujo de caja (curva S, desembolso por período) se implementa en post-MVP.

---

## 9. `users` — Usuarios del sistema

```
users
─────────────────────────────────────────────────────────────
id                  UUID          PK

email               TEXT          UNIQUE. Identificador de autenticación.
name                TEXT
role                TEXT          "admin" | "user"

created_at          TIMESTAMPTZ
─────────────────────────────────────────────────────────────
```

---

## 10. Consultas clave y lo que revelan del diseño

Las consultas más frecuentes determinan los índices necesarios y validan que el modelo es correcto.

**Presupuesto del proyecto** — la consulta más importante:

```sql
SELECT
  ci.nbr_code,
  ci.description_es,
  ci.unit,
  COUNT(pa.id)          AS elementos,
  -- cantidad: calculada en Python con ifcopenshell, no desde DB
  pa.unit_price,
  SUM(cantidad * pa.unit_price) AS subtotal
FROM project_assignments pa
JOIN catalog_items ci ON ci.id = pa.item_id
WHERE pa.project_id = :project_id
GROUP BY ci.id, pa.unit_price
ORDER BY ci.nbr_code;
```

**Generar el archivo de keynotes** — desde la biblioteca del proyecto:

```sql
SELECT
  ci.nbr_code    AS code,
  ci.description_es AS description,
  ci.parent_nbr_code AS parent_code
FROM project_library pl
JOIN catalog_items ci ON ci.id = pl.item_id
WHERE pl.project_id = :project_id
  AND ci.bim_taggable = true
  AND ci.facet = ANY(:selected_facets)  -- ['3E', '4U'] o los que el usuario eligió
ORDER BY ci.nbr_code;
```

**Elementos sin asignar después de importar un IFC:**

```sql
SELECT ie.global_id, ie.ifc_type, ie.ifc_name, ie.ifc_level
FROM ifc_elements ie
LEFT JOIN project_assignments pa
  ON pa.ifc_element_id = ie.id AND pa.project_id = ie.project_id
WHERE ie.project_id = :project_id
  AND ie.status = 'active'
  AND pa.id IS NULL;
```

**Ítems editados por usuarios** — auditoría rápida del catálogo:

```sql
SELECT id, nbr_code, description_es, fuente_precios, fuente_factores,
       modificado_por, updated_at
FROM catalog_items
WHERE modificado_por LIKE 'user:%'
ORDER BY updated_at DESC;
```

**Detección de conflicto en reimportación** (cambio cualitativo):

```sql
-- Elementos cuyo snapshot cambió entre la importación previa y la actual
SELECT ie.global_id, pa.item_id, ie.qualitative_snapshot AS nuevo,
       pa.qualitative_snapshot_at_assignment AS anterior
FROM ifc_elements ie
JOIN project_assignments pa ON pa.ifc_element_id = ie.id
WHERE ie.project_id = :project_id
  AND ie.geometry_hash != md5(pa.qualitative_snapshot_at_assignment::text);
```

---

## 11. Índices recomendados

```sql
-- Búsquedas por faceta (filtros frecuentes en el catálogo)
CREATE INDEX idx_catalog_facet ON catalog_items(facet);

-- Búsqueda por código NBR (árbol de clasificación)
CREATE INDEX idx_catalog_nbr_code ON catalog_items(nbr_code text_pattern_ops);

-- Keynote file: ítems bim_taggable de un proyecto
CREATE INDEX idx_catalog_bim_taggable ON catalog_items(bim_taggable) WHERE bim_taggable = true;

-- Sincronización IFC: buscar por GlobalId
CREATE INDEX idx_ifc_global_id ON ifc_elements(project_id, global_id);

-- Presupuesto: asignaciones de un proyecto
CREATE INDEX idx_assignments_project ON project_assignments(project_id);

-- Auditoría: ítems modificados por usuarios
CREATE INDEX idx_catalog_modificado_por ON catalog_items(modificado_por) WHERE modificado_por LIKE 'user:%';

-- Markups activos de un proyecto (orden de aplicación)
CREATE INDEX idx_markups_project ON project_markups(project_id, sort_order) WHERE is_active = true;
```

---

## 12. Lo que NO está en este modelo (y por qué)

| Concepto                    | Decisión                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Cantidades por elemento      | No se almacenan. Siempre recalculadas desde geometría IFC con `ifcopenshell` (ADR-004).           |
| Historial de ediciones de ítems | Los ítems son editables en place. `modificado_por` + `updated_at` registran quién y cuándo fue la última modificación. No se guarda historial de valores anteriores — si se necesita en el futuro, se implementa como tabla separada. |
| Permisos granulares          | MVP asume usuario único o equipo pequeño. Control de acceso por `role` en `users` es suficiente. |
| Versionado de IFC            | Cada importación sobreescribe `ifc_elements`. El historial de cambios se infiere del `DEVLOG.md` y del diff entre presupuestos exportados, no de la DB. |
| Flujo de caja / curva S      | Post-MVP. La tabla `project_phases` está definida, pero la lógica de cálculo no existe en MVP (ADR-007). |
