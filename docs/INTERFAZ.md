# Interfaz — Decisiones de UX/UI

> **Propósito de este documento:** Registrar el layout, la navegación y las decisiones de comportamiento de la interfaz. Es la referencia principal para Claude Design y para cualquier desarrollador frontend. Cada decisión tiene una razón documentada.
>
> **Documentos previos requeridos:** `ARQUITECTURA.md`, `USUARIOS.md`

---

## 1. Layout general

La interfaz es una **aplicación web de escritorio** (desktop-first). No hay versión móvil en MVP.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [≡] Cost-Mapper    [▼ Proyecto Activo ▼]           [usuario]  [⚙] │  ← HEADER
├────┬─────────────────────────────────────────────────────────────────┤
│    │                                                                 │
│    │                                                                 │
│  S │                                                                 │
│  I │                                                                 │
│  D │                      ÁREA PRINCIPAL                             │
│  E │                                                                 │
│  B │                                                                 │
│  A │                                                                 │
│  R └─────────────────────────────────────────────────────────────────┘
└────┴──────────────────────────────────────────────────────────────────┘
```

**Dimensiones de cada zona:**
- Sidebar: 56px de ancho (solo iconos). Sin etiquetas de texto para maximizar el área de trabajo.
- Área principal: ocupa todo el centro, tomando el 100% del espacio restante. El Visor 3D y el Panel Inferior ya no son globales, sino que viven dentro de secciones específicas (ej. Mapeo IFC) para evitar saturación visual.

**Tema visual:** Oscuro, inspirado en Revit. Fondo base `#1E1E1E`, superficie de paneles `#252526`, bordes `#3E3E42`, texto primario `#CCCCCC`, acento principal azul `#0078D4` (azul Revit/VS Code).

---

## 2. Header

Barra superior fija, altura 48px.

| Zona | Contenido |
|------|-----------|
| Izquierda | Logo Cost-Mapper + nombre de la app |
| Centro | Selector de proyecto activo (dropdown). Muestra: nombre del proyecto + ubicación. Al hacer clic lista los proyectos del usuario y ofrece "Nuevo proyecto". |
| Derecha | Avatar/nombre del usuario · Botón de ajustes globales |

**Comportamiento del selector de proyecto:** siempre visible. Cambiar de proyecto recarga el área principal con los datos del proyecto seleccionado. El visor 3D y el panel de detalle se limpian al cambiar de proyecto.

---

## 3. Sidebar de navegación

Barra vertical izquierda de 56px con iconos. Al pasar el cursor muestra tooltip con el nombre de la sección. La sección activa tiene el icono resaltado con el color de acento.

| Sección | Concepto del icono | Descripción |
|---------|--------------------|-------------|
| **Catálogo** | Lista con clasificación jerárquica | Explorador del catálogo de ítems TCPO + Mandu'a |
| **Presupuesto** | Tabla con totales / calculadora | Vista del presupuesto del proyecto activo |
| **Mapeo IFC** | Cubo 3D con vínculo / conector | Importación del IFC y asignación de ítems |
| **Biblioteca** | Colección de ítems / carpeta organizada | Biblioteca de ítems del proyecto + generador de keynotes |
| **Informes** | Documento con gráfico / exportar | Exportación del presupuesto (PDF, Excel) |
| **Ajustes** | Engranaje / tuerca | Importación del catálogo TCPO V15 + catálogos transitorios de usuarios/fuentes para auditoría. |

**Nota para diseño:** los iconos del sidebar deben ser diseñados como parte del sistema de iconografía del proyecto. Ver sección 13.

Al cambiar de sección, el contenido del área principal cambia completamente. Si una sección requiere Visor 3D o Panel de Detalles, los instanciará internamente.

---

## 4. Sección: Catálogo

El explorador del catálogo completo (`catalog_items`). Es la sección de referencia — no está atada a un proyecto específico.

**Área principal — tabla del catálogo:**

Columnas: FAC · Verificación · Código NBR · Descripción · Unidad · P. Unit (₲) · Fuente · [+]

La última columna tiene un botón `+` invisible en reposo que se hace visible al hover sobre la fila. Clic en `+` agrega el ítem al `project_library` del proyecto activo. Si el ítem ya está en la biblioteca, el backend devuelve 409 y se muestra un toast de advertencia en lugar de duplicar.

Controles encima de la tabla:
- Barra de búsqueda de texto libre (busca en descripción ES y PT)
- Filtro por faceta (chips seleccionables: 3E · 3R · 4U · 2C · 2N · 2Q)
- Toggle: Solo relevantes PY

**Estado vacío:** sin faceta ni búsqueda activa, la tabla muestra un empty state — no carga los 10k ítems del catálogo automáticamente.

**Selección de ítem:** clic en una fila selecciona el ítem y el `DetailPanel` (área-panel derecho) muestra su composición APU con datos reales del backend.

**Feedback de acciones:** las operaciones sobre la biblioteca muestran toasts en la esquina inferior derecha (auto-dismiss 3s):
- Verde: "X agregado al proyecto"
- Amarillo: "El ítem ya está en el proyecto"
- Rojo: error de red

**Edición inline de precios y APU (implementado):** clic/doble clic sobre precio, fuente, descripción o coeficiente activa edición directa. Dispara el diálogo de auditoría con usuario y fuente desde `settings_users` / `settings_sources`. Si el ítem estaba verificado, cualquier cambio lo vuelve no verificado hasta nueva revisión.

**Verificación humana:** el panel APU muestra el estado `is_verified`. El botón de verificación abre un modal que exige usuario de verificación y confirma que insumos, coeficientes, fuentes y precios fueron revisados.

---

## 5. Sección: Presupuesto

Vista del presupuesto del proyecto activo. En MVP calcula desde `project_library JOIN catalog_items` usando `manual_quantity`. Post-IFC usará `project_assignments`. Ver ADR-010.

**Área principal — tabla de presupuesto:**

Columnas: FAC · Código NBR · Descripción · UND · CANT. · P. UNIT (₲) · SUBTOTAL (₲)

Agrupado por faceta NBR con subtotales por grupo. Fila de total general fija al pie de la tabla.

**KPI strip (implementado):**
- Costo Directo: suma de subtotales
- Ítems Totales: cantidad de filas
- Sin Precio: ítems con `unit_price = NULL`
- Sin Cantidad: ítems con `manual_quantity = NULL`

**Banner de alerta (implementado):** si hay ítems sin precio o sin cantidad, aparece un banner amarillo con el conteo. Bloquea semánticamente al usuario: el total no es confiable hasta completar los datos faltantes.

**Edición de cantidad (pendiente — próximo paso):** clic en la celda CANT. activa un input inline. Al confirmar hace `PATCH /api/projects/{id}/library/{entry_id}` con el nuevo `manual_quantity`. La fila se actualiza con el subtotal recalculado.

**Selección:** clic en fila selecciona el ítem; no hay visor 3D en esta sección (solo en Mapeo IFC).

---

## 6. Sección: Mapeo IFC

Flujo de importación del modelo 3D y asignación de ítems a elementos IFC.

**Estado inicial (sin IFC cargado):**
Pantalla de bienvenida con botón "Importar IFC" y descripción del flujo. Al importar, el archivo se sube al backend y el módulo `ifc_importer` procesa los elementos.

**Estado post-importación:**
La tabla muestra **grupos** de elementos IFC (agrupados por tipo) divididos en tres grupos mediante tabs:

| Tab | Contenido |
|-----|-----------|
| ✅ Auto-asignados | Elementos que traían `IfcClassificationReference` — asignados automáticamente. El usuario revisa y confirma. |
| ⚠️ Sin asignar | Elementos sin clasificación NBR en el IFC. Requieren mapeo manual. |
| 🔴 Conflictos | Elementos cuyo `qualitative_snapshot` cambió en una reimportación y tenían asignación manual previa. |

**Mapeo manual (tab "Sin asignar"):**
La tabla agrupa por **IfcType + “familia y tipo”** (cuando esté disponible desde el IFC). Al seleccionar un grupo, el panel de detalle permite asignar un ítem del catálogo a **todos los elementos** de ese grupo de una sola vez.

**Nota (MVP):** en esta versión se prioriza un flujo simple: **1 ítem por elemento**. La asignación de múltiples ítems por un mismo elemento queda **post-MVP** (cuando se definan reglas claras de cómo se calcula el presupuesto por capas/terminaciones).

**Integración con visor 3D:** al seleccionar una fila en cualquier tab, el visor resalta el elemento correspondiente en el modelo 3D.

---

## 7. Sección: Biblioteca

Gestión de la biblioteca de ítems del proyecto (`project_library`) y generación del keynote file para Revit.

**Área principal — dos columnas:**

Columna izquierda: lista de ítems en la biblioteca del proyecto actual. Columnas: Código NBR · Descripción · Faceta · BIM Taggable.

Columna derecha: explorador rápido del catálogo para agregar ítems a la biblioteca (búsqueda + filtro por faceta). Botón "+" en cada ítem del catálogo para agregarlo a la biblioteca.

**Generador de keynote file:**
Panel inferior o modal con:
- Checkboxes de facetas a incluir: `3E` (siempre), `4U` (siempre), `2C` (opcional, con sub-filtro por categoría)
- Contador: "X ítems se incluirán en el archivo"
- Botón "Descargar keynote .txt"
- Bloqueo si hay ítems no verificados, salvo override explícito de keynotes con advertencia y auditoría.

**Copiar biblioteca de otro proyecto:** botón "Copiar desde proyecto..." que abre un selector de proyecto y copia toda su `project_library` al proyecto activo.

---

## 8. Sección: Informes

Exportación del presupuesto en distintos formatos.

**MVP:**

| Formato | Descripción | Estado |
|---------|-------------|--------|
| PDF — CostMapper Standard | Presupuesto formal con encabezado del proyecto, tabla de ítems, resumen por faceta, totales en PYG y USD | MVP |
| Excel (XLSX) | Exportación completa sin formato especial. Útil como fuente de datos para otros sistemas. | MVP |

**Post-MVP:**

| Formato | Descripción |
|---------|-------------|
| Formato MOPC/DNCP | Estructura exigida para licitaciones públicas en Paraguay |
| Plantilla personalizada por IA | El usuario describe el formato requerido en lenguaje natural |

**Flujo de exportación:**
1. El usuario elige formato.
2. Si hay ítems no verificados (`is_verified=false`): bloqueo — "X ítems no tienen verificación humana." PDF/Excel no tienen override en MVP.
3. Si todos están verificados pero hay ítems sin precio: advertencia bloqueante para presupuesto económico; el usuario debe completar precios antes de exportar PDF/Excel.
4. Descarga directa del archivo generado.

---

## 9. Sección: Ajustes

En MVP esta sección aloja el panel de importación ETL del catálogo TCPO y la gestión de catálogos transitorios para auditoría. La autenticación real, roles y permisos siguen planificados para post-MVP.

**Panel ETL (implementado):**

Cards de estadísticas en fila horizontal:
- Ítems en catálogo (total con `is_work_item=true`)
- Páginas OK / Parciales / Errores (desde `tcpo_progress.json`)

Controles:
- Input de texto libre "PÁGINAS" — acepta `37`, `37-50` o `37,40,45`
- Checkbox Dry-run (por defecto: activado) — ejecuta sin modificar la DB
- Checkbox Forzar — reprocesa páginas ya extraídas
- Botón "▶ Ejecutar"

Log de output:
- Textarea de solo lectura con el stdout completo del proceso ETL
- Borde verde si OK, rojo si error, gris mientras corre

**Usuarios y fuentes (implementado):**
- `settings_users`: nombres disponibles para modales de auditoría y verificación.
- `settings_sources`: fuentes oficiales o internas para precios y factores (`price`, `factor`, `both`).
- Altas, edición inline y baja/desactivación desde la vista de Configuración.

**Post-MVP:** esta sección tendrá nombre del proyecto, ubicación, tipo de obra, moneda base, autenticación, usuarios reales y roles.

---

## 10. Panel de detalle y Visor 3D (Componentes confinados)

Originalmente globales, el Panel de Detalle y el Visor 3D ahora son **componentes internos** de ciertas secciones.

**Visor 3D:**
Solo vive en **Mapeo IFC**. Ocupa la mitad derecha de la pantalla en esa vista. Presenta los estados de "Sin modelo IFC" y "Con modelo cargado" tal como se diseñaron, pero sin persistir a través de la app.

**Panel de Detalle APU:**
Vive en la parte inferior de **Catálogo** y **Mapeo IFC**. Mantiene sus estados colapsado (32px) y expandido (280px), mostrando la tabla de APU o los atributos BIM del elemento seleccionado.

---

## 12. Decisiones de UX documentadas

### 12.1 Advertencia de edición global desde panel APU

Cuando el usuario edita `unit_price` o `fuente_precios` de un componente desde el panel de detalle APU, el sistema muestra un diálogo de confirmación antes de guardar:

> **"Estás modificando el precio de [descripción del insumo]."**
> Este cambio se aplicará a todos los ítems que usen este insumo como componente, no solo a este APU.
> — [Cancelar] [Confirmar]

**No aparece** al editar `quantity` o `notes` en `apu_components` — esos campos son locales al APU.

### 12.2 Bloqueo de exportación por verificación humana

Si el presupuesto, informe o keynote contiene ítems con `is_verified=false`, la exportación queda bloqueada por defecto. PDF, Excel e informes IFC no tienen override en MVP.

Keynotes tiene una excepción controlada: puede ofrecer una liberación manual porque exporta código, descripción y jerarquía, no precios ni coeficientes. La UI debe advertirlo explícitamente y registrar quién liberó, cuándo y por qué; si esa auditoría aún no existe, el override queda pendiente.

Si todos los ítems están verificados pero alguno tiene `unit_price = NULL`, PDF/Excel también quedan bloqueados porque el total económico no es confiable.

### 12.3 Cambio de proyecto limpia el estado visual

Al cambiar el proyecto activo desde el selector del header, el visor 3D se limpia (descarga el modelo anterior) y el panel de detalle se colapsa. La sección activa en el sidebar permanece igual.

### 12.4 El sidebar no tiene etiquetas de texto

Solo iconos con tooltips al hacer hover. Maximiza el espacio horizontal del área de trabajo, que es el recurso escaso en tablas de muchas columnas.

---

## 13. Iconografía del proyecto

**La iconografía es un entregable de diseño, no una decisión de desarrollo.** No se usan emojis del sistema operativo ni librerías genéricas de iconos (Material Icons, FontAwesome, etc.) como solución definitiva. El set de iconos de Cost-Mapper debe ser diseñado como parte de la identidad visual del producto.

### Estilo esperado

- **Trazo fino (monoline):** grosor de línea uniforme, sin rellenos sólidos. Coherente con la estética de software de ingeniería (Revit, AutoCAD, VS Code).
- **Geometría limpia:** formas simples, sin decoración innecesaria. Legibles a 20px y a 16px.
- **Coherencia interna:** todos los iconos del mismo set, con el mismo peso visual y el mismo radio de esquinas.
- **Sin color por defecto:** los iconos se muestran en el color del texto (`#CCCCCC`) y cambian al color de acento (`#0078D4`) en estado activo o hover. El color lo pone el CSS, no el SVG.

### Iconos requeridos para MVP

**Sidebar de navegación (6 iconos):**
Catálogo · Presupuesto · Mapeo IFC · Biblioteca · Informes · Ajustes

**Acciones generales (iconos de UI):**
Buscar · Filtrar · Ordenar · Expandir/Colapsar panel · Cerrar · Confirmar · Advertencia · Importar archivo · Exportar/Descargar · Editar · Guardar · Agregar (+) · Eliminar

**Estados del modelo IFC:**
Elemento asignado · Elemento sin asignar · Elemento en conflicto · Elemento seleccionado

**Facetas NBR (iconos opcionales para los chips de filtro):**
Elementos (3E) · Resultados del Trabajo (3R) · Unidades de Construcción (4U) · Componentes (2C) · Funciones / Mano de obra (2N) · Equipos (2Q)

### Instrucción para Claude Design

> Crear el set de iconos SVG de Cost-Mapper en estilo monoline, trazo de 1.5px, esquinas redondeadas con radio 2px, viewBox 24×24. Los iconos deben funcionar sobre fondo oscuro (#1E1E1E) en color #CCCCCC (estado inactivo) y #0078D4 (estado activo). Entregar cada icono como componente SVG independiente nombrado en snake_case (ej. `icon_catalog.svg`).
