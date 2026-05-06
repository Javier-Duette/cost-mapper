# Lecciones de OpenConstructionERP (OCE)

> **Propósito:** Extraer del repositorio open source de OCE ([github.com/datadrivenconstruction/openconstructionerp](https://github.com/datadrivenconstruction/openconstructionerp)) decisiones de implementación que reduzcan complejidad y problemas en Cost-Mapper. No es una reseña del producto — es un análisis técnico de su código.
>
> **Fecha de análisis:** 2026-05-06 · OCE v2.7.0 · Stack: Python 3.12 / FastAPI / React 18 / SQLite dev / PostgreSQL prod

---

## Lo que se analizó

| Archivo / módulo | Qué se buscó |
|---|---|
| `backend/app/modules/bim_hub/models.py` | Schema de BIMElement, BOQElementLink, BIMModelDiff |
| `backend/app/modules/bim_hub/service.py` | Lógica de diff, bulk import, cleanup de links huérfanos |
| `backend/app/modules/boq/models.py` | Schema de Position, BOQMarkup, ActivityLog, Snapshot |
| `backend/app/modules/costs/models.py` | Schema de CostItem (su equivalente a catalog_items) |
| `backend/app/modules/reporting/service.py` | Motor de reportes: templates, snapshots, generación |
| `backend/app/core/module_loader.py` | Sistema de auto-descubrimiento y carga de módulos |
| `backend/alembic/versions/` | Estrategia de migraciones de schema |
| `backend/app/modules/` (lista completa) | Mapa de los 60+ módulos disponibles |

---

## 1. Decisión crítica: importes monetarios como STRING

**Qué hace OCE:** tanto `Position.quantity`, `Position.unit_rate`, `Position.total` como `CostItem.rate` se almacenan en la DB como `String(50)`, no como `DECIMAL` ni `FLOAT`. El comentario en el código es explícito:

```python
# Money/quantity stored as String by design — SQLite's native Numeric
# degrades to REAL with precision loss, and JS JSON consumers lose
# digits on large currency values via Number. Service layer coerces to
# Decimal via ``_to_decimal`` for all arithmetic.
quantity: Mapped[str] = mapped_column(String(50), nullable=False, default="0")
unit_rate: Mapped[str] = mapped_column(String(50), nullable=False, default="0")
total: Mapped[str] = mapped_column(String(50), nullable=False, default="0")
```

**Relevancia para Cost-Mapper:** nosotros usamos `DECIMAL(14,2)` en PostgreSQL, lo cual es correcto para producción (PostgreSQL no tiene el problema de SQLite con REAL). Sin embargo, hay que tener en cuenta el lado JavaScript: cuando FastAPI serializa un `DECIMAL` de Python a JSON, puede llegar como número al frontend y perder precisión en valores grandes de Guaraníes. **Acción concreta:** verificar que los endpoints que devuelven precios los serialicen como string en JSON, y que el frontend los convierta a Decimal antes de operar.

---

## 2. Schema de BIMElement: qué guardar y qué no

**Qué hace OCE — `oe_bim_element`:**

```python
stable_id: str          # = GlobalId de IFC (identificador persistente)
element_type: str       # IfcWall, IfcSlab, etc.
name: str               # nombre del elemento
storey: str             # nivel/planta
discipline: str         # estructura, arquitectura, MEP
properties: dict (JSON) # todos los parámetros cualitativos
quantities: dict (JSON) # {"area_m2": 12.5, "volume_m3": 3.1, "length_m": null}
geometry_hash: str      # hash SHA del estado geométrico para detectar cambios
bounding_box: dict (JSON)
mesh_ref: str           # referencia al archivo de malla 3D (almacenado aparte)
```

**Diferencia clave con nuestro diseño:** OCE **persiste las cantidades** en la DB como JSON. Nosotros decidimos **no persistirlas** y recalcularlas con `ifcopenshell` en cada sesión (ADR-004). Ambas decisiones son válidas; la nuestra evita desincronización entre DB y el IFC real, pero requiere tener el archivo IFC accesible en el servidor. La de OCE permite queries analíticas rápidas sobre cantidades sin reabrir el archivo.

**Lección adoptable:** el campo `geometry_hash` de OCE es más ligero que nuestro `qualitative_snapshot` (JSON completo). Un hash MD5/SHA256 de los parámetros cualitativos relevantes cumple el mismo propósito de detección de cambios con menos espacio. Considerar reemplazar o complementar el JSON snapshot con un hash calculado.

**Nuestro `qualitative_snapshot` equivale a su `properties` + `geometry_hash` combinados.** Podemos mantener el JSON en `properties`/`qualitative_snapshot` para mostrar los detalles al usuario, y agregar un `geometry_hash` derivado para la comparación rápida.

---

## 3. BOQElementLink: el vínculo elemento ↔ partida

**Qué hace OCE — `oe_bim_boq_link`:**

```python
boq_position_id: UUID   # FK a la posición del BOQ
bim_element_id: UUID    # FK al elemento BIM (CASCADE DELETE)
link_type: str          # "manual" | "auto" | "rule"
confidence: str         # nivel de confianza del vínculo automático
rule_id: str            # qué regla lo generó (para trazabilidad)
```

**Mapeo directo a Cost-Mapper:**

| OCE | Cost-Mapper |
|---|---|
| `link_type = "auto"` | `classification_source = "ifc_classification"` |
| `link_type = "manual"` | `classification_source = "user"` |
| `confidence` | no tenemos este campo |
| `rule_id` | no tenemos este campo |

**Lección adoptable:** agregar `confidence` (opcional, null para asignaciones manuales) a `project_assignments`. Útil para que el panel de mapeo pueda ordenar las asignaciones automáticas por nivel de confianza y mostrar primero las de baja confianza para revisión del usuario.

---

## 4. BIMModelDiff: tabla de diff cacheado

**Qué hace OCE:**

```python
class BIMModelDiff(Base):
    old_model_id: UUID   # FK a modelo anterior
    new_model_id: UUID   # FK a modelo nuevo
    diff_summary: dict   # {"added": 12, "removed": 3, "changed": 7}
    diff_details: dict   # lista detallada de cambios por stable_id
    
    __table_args__ = (
        UniqueConstraint("old_model_id", "new_model_id", name="uq_bim_model_diff_pair"),
    )
```

El servicio computa el diff una vez y lo cachea. Si el par (old, new) ya existe, devuelve el resultado cacheado sin recomputar.

**Lección adoptable:** cuando el usuario reimporta un IFC, el diff entre la versión anterior y la nueva es costoso de calcular. Una tabla de diff cacheado (o simplemente almacenar el resultado en `metadata_` de `ifc_elements`) evita recomputar si el usuario reimporta el mismo archivo dos veces. Para MVP esto no es crítico, pero vale tenerlo en cuenta para el diseño de `ifc_importer`.

---

## 5. BOQMarkup: tabla de sobrecostos — nos falta esto

**Qué hace OCE — `oe_boq_markup`:**

```python
name: str               # "Gastos Generales", "IVA", "Utilidad"
markup_type: str        # "percentage" | "fixed" | "per_unit"
category: str           # overhead | profit | tax | contingency
percentage: str         # "8.0" (stored as string)
fixed_amount: str       # para tipo "fixed"
apply_to: str           # "direct_cost" | "cumulative"
sort_order: int         # orden de aplicación (el IVA va después del GG)
is_active: bool
```

**Gap en Cost-Mapper:** nuestro schema no tiene nada equivalente. Los porcentajes de gastos generales, utilidad e IVA son estándar en todo presupuesto de construcción paraguayo. Sin esta tabla, el presupuesto exportado muestra solo el costo directo y el usuario tiene que calcular los adicionales manualmente.

**Acción concreta:** agregar tabla `project_markups` a `MODELO-DE-DATOS.md`:

```sql
CREATE TABLE project_markups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,                    -- "Gastos Generales"
    markup_type TEXT NOT NULL DEFAULT 'percentage', -- percentage | fixed
    category    TEXT NOT NULL DEFAULT 'overhead', -- overhead | profit | tax | contingency
    percentage  DECIMAL(6,3),                     -- 8.000
    fixed_amount DECIMAL(14,2),
    apply_to    TEXT NOT NULL DEFAULT 'direct_cost', -- direct_cost | cumulative
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Optimistic concurrency en Position

**Qué hace OCE:**

```python
# BUG-CONCURRENCY01: optimistic concurrency token
version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
```

Cada `PATCH` del cliente envía el `version` que leyó. Si el servidor tiene una versión mayor, devuelve `409 Conflict` en lugar de permitir un "lost write" silencioso.

**Relevancia para Cost-Mapper:** en MVP con usuario único no es crítico. Se vuelve importante cuando haya múltiples usuarios editando simultáneamente. Tenerlo en cuenta al diseñar los endpoints de edición de `project_assignments` y `catalog_items`. No es necesario implementarlo en MVP, pero el campo se puede agregar desde el inicio con costo cero (solo `DEFAULT 0`).

---

## 7. CostItem: estructura del catálogo

**Qué hace OCE — `oe_costs_item`:**

```python
code: str               # código único por región
descriptions: dict (JSON) # {"en": "...", "de": "...", "es": "..."}  ← i18n inline
rate: str               # precio (stored as string)
classification: dict (JSON) # {"standard": "DIN276", "code": "300"}  ← flexible
components: list (JSON) # APU inline como lista  ← NO tabla separada
tags: list (JSON)       # etiquetas de búsqueda
region: str             # para qué mercado es este precio
source: str             # "cwicr" | "custom"
```

**Diferencia clave:** OCE almacena los componentes APU como un **JSON array** dentro de `CostItem.components`, no en una tabla separada. Nosotros usamos una tabla `apu_components` con FK a `catalog_items`.

**Por qué nuestra decisión es mejor para Cost-Mapper:** la tabla `apu_components` permite:
- Editar un insumo individual sin reescribir el JSON completo
- FK real a `catalog_items` (el componente tiene su propio registro con precio)
- Queries SQL para "¿qué ítems usan cemento portland?"
- El panel APU editable que necesitamos (con celdas editables por fila)

El JSON de OCE funciona para un catálogo de solo lectura. El nuestro funciona para un catálogo editable. **Mantener nuestra decisión.**

**Lección adoptable del campo `classification` como JSON:** OCE almacena la clasificación como JSON libre `{"standard": "DIN276", "code": "300"}`. Nosotros tenemos `nbr_code` y `facet` como columnas separadas, lo cual es correcto para indexar y filtrar. Pero podría ser útil tener un campo `metadata_` JSON adicional para datos extra sin romper el schema.

---

## 8. Sistema de módulos: manifest + auto-descubrimiento

**Qué hace OCE:** cada módulo tiene un archivo `manifest.py`:

```python
manifest = ModuleManifest(
    name="oe_boq",
    version="1.0.0",
    display_name="Bill of Quantities",
    category="core",           # core | integration | regional | community
    depends=["oe_projects"],   # dependencias duras
    optional_depends=["oe_schedule"],
)
```

El `ModuleLoader` hace auto-descubrimiento, ordena por dependencias (topological sort) y monta cada router en `/api/v1/{module_name}/`. Los módulos no-core se pueden habilitar/deshabilitar en runtime.

**Relevancia para Cost-Mapper:** para nuestros 6 módulos del MVP no necesitamos un sistema tan sofisticado. Pero la **convención de estructura** sí es adoptable:

```
backend/
  catalog/
    router.py     ← endpoints
    service.py    ← lógica de negocio
    models.py     ← ORM
    repository.py ← queries SQL
    schemas.py    ← Pydantic
```

Esta separación en 5 archivos por módulo (en lugar de un solo archivo grande) es exactamente lo que necesitamos para mantener el código legible para estudiantes. **Adoptar esta estructura.**

---

## 9. Alembic: estrategia de migraciones

**Qué hace OCE:** la primera migración es solo un marcador de baseline:

```python
def upgrade() -> None:
    # Tables are created by SQLAlchemy at app startup.
    # This migration serves as the Alembic baseline.
    pass
```

Las tablas se crean con `Base.metadata.create_all()` al inicio. Alembic solo trackea los cambios posteriores al baseline.

**Lección:** para Cost-Mapper, inicializar Alembic desde el primer commit con esta misma estrategia:
1. El script `01_init_db.py` crea las tablas con `create_all()`
2. La primera migración de Alembic es el baseline (no-op)
3. Cada cambio de schema posterior va en una migración numerada

Esto evita el problema de V0: schema creado manualmente sin historial de cambios.

---

## 10. Limpieza de links huérfanos en JSON arrays

**Problema que OCE resolvió:**

Cuando un `BIMElement` se elimina, hay tres lugares donde su UUID puede estar guardado en columnas JSON array (no como FK):
- `Task.bim_element_ids`
- `Activity.bim_element_ids`
- `Requirement.metadata_["bim_element_ids"]`

Las FKs con `CASCADE DELETE` limpian las tablas relacionales automáticamente, pero **no pueden limpiar IDs dentro de JSON arrays**. OCE tiene una función `_strip_orphaned_bim_links()` que corre dentro de la misma transacción al eliminar un elemento.

**Relevancia para Cost-Mapper:** si almacenamos arrays de IDs en JSON (como `cad_element_ids` en una posición futura), debemos tener la misma precaución. En nuestro schema actual no tenemos este patrón — usamos FKs reales — así que no es un problema inmediato. **Pero: evitar almacenar UUIDs de referencias en columnas JSON.** Usar tablas de join con FK siempre que sea posible.

---

## 11. Eventos y bus de eventos para desacoplamiento

**Qué hace OCE:** tiene un `event_bus` que publica eventos como `"bim_element.deleted"`, `"reporting.report.generated"`. Los módulos se suscriben a eventos de otros módulos sin importar directamente su código.

```python
await event_bus.publish_detached("bim.element.imported", {
    "model_id": str(model_id),
    "element_count": len(elements),
})
```

**Relevancia para Cost-Mapper:** en MVP con 6 módulos la comunicación directa es suficiente. Pero hay un caso concreto donde un bus de eventos simple ayudaría: cuando el módulo `catalog` actualiza un precio, el módulo `budget` debería ser notificado para recalcular. En lugar de que `catalog` importe `budget` (rompiendo la separación de módulos), puede publicar `"catalog.price.updated"` y `budget` suscribirse.

**Acción concreta para MVP:** implementar un bus de eventos mínimo (puede ser tan simple como un dict de callbacks en memoria) para los dos casos críticos:
1. `catalog.price.updated` → `budget` invalida su cache
2. `ifc.import.completed` → `mapper` inicia la auto-asignación

---

## Resumen: cambios concretos al schema de Cost-Mapper

| Cambio | Prioridad | Archivo a actualizar |
|---|---|---|
| Agregar `project_markups` (tabla de sobrecostos) | **Alta** — necesaria para exportar presupuesto completo | `MODELO-DE-DATOS.md` |
| Agregar `geometry_hash TEXT` a `ifc_elements` | Media — complementa `qualitative_snapshot` | `MODELO-DE-DATOS.md` |
| Agregar `confidence DECIMAL(5,2)` a `project_assignments` | Media — mejora UX del panel de mapeo | `MODELO-DE-DATOS.md` |
| Adoptar estructura 5-archivos por módulo (router/service/models/repository/schemas) | **Alta** — define cómo organizar el código | `ARQUITECTURA.md` |
| Inicializar Alembic desde el primer commit con baseline no-op | **Alta** — sin esto las migraciones son un caos | `CLAUDE.md` + nuevo `CONTRIBUTING.md` |
| Verificar serialización de DECIMAL a string en endpoints JSON | Media — previene bugs de precisión en frontend | Documentar en `ARQUITECTURA.md` |

---

## Lo que OCE hace que explícitamente NO adoptamos

| Decisión de OCE | Por qué Cost-Mapper no la adopta |
|---|---|
| Cantidades persistidas en DB (`quantities` JSON) | Nuestro ADR-004: recalcular desde geometría evita desincronización. Requiere ifcopenshell en servidor, pero da datos siempre frescos. |
| APU como JSON array en `CostItem.components` | Nuestra tabla `apu_components` es mejor para edición inline, queries y FKs. Solo vale JSON si el catálogo es de solo lectura. |
| SQLite como DB de desarrollo | PostgreSQL desde el primer día. El overhead de levantar PostgreSQL local es mínimo con Docker y evita bugs de compatibilidad. |
| 60+ módulos con runtime enable/disable | Overkill para MVP. Los 6 módulos de Cost-Mapper son fijos. |
| Vector search (LanceDB) para búsqueda semántica | Post-MVP. Para MVP: búsqueda de texto libre en `description_es` es suficiente con índice GIN. |

---

## Referencias

- Repositorio analizado: [github.com/datadrivenconstruction/openconstructionerp](https://github.com/datadrivenconstruction/openconstructionerp)
- Archivos clave: `bim_hub/models.py`, `bim_hub/service.py`, `boq/models.py`, `boq/service.py`, `costs/models.py`, `reporting/service.py`, `core/module_loader.py`
- Versión: 2.7.0 (2026-05-03)
