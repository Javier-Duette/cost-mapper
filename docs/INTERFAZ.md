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
| **Ajustes** | Engranaje / tuerca | Configuración del proyecto y del sistema |

**Nota para diseño:** los iconos del sidebar deben ser diseñados como parte del sistema de iconografía del proyecto. Ver sección 13.

Al cambiar de sección, el contenido del área principal cambia completamente. Si una sección requiere Visor 3D o Panel de Detalles, los instanciará internamente.

---

## 4. Sección: Catálogo

El explorador del catálogo completo (`catalog_items`). Es la sección de referencia — no está atada a un proyecto específico.

**Área principal — tabla del catálogo:**

Columnas: FAC · Código NBR · Descripción · Unidad · P. Unit (₲) · Fuente · [+]

La última columna tiene un botón `+` invisible en reposo que se hace visible al hover sobre la fila. Clic en `+` agrega el ítem al `project_library` del proyecto activo. Si el ítem ya está en la biblioteca, el backend devuelve 409 y se muestra un toast de advertencia en lugar de duplicar.

Controles encima de la tabla:
- Barra de búsqueda de texto libre (busca en descripción ES y PT)
- Filtro por faceta (chips seleccionables: 3E · 4U · 2C · 2N · 2Q)
- Toggle: Solo relevantes PY

**Estado vacío:** sin faceta ni búsqueda activa, la tabla muestra un empty state — no carga los 10k ítems del catálogo automáticamente.

**Selección de ítem:** clic en una fila selecciona el ítem y el `DetailPanel` (área-panel derecho) muestra su composición APU con datos reales del backend.

**Feedback de acciones:** las operaciones sobre la biblioteca muestran toasts en la esquina inferior derecha (auto-dismiss 3s):
- Verde: "X agregado al proyecto"
- Amarillo: "El ítem ya está en el proyecto"
- Rojo: error de red

**Edición inline de precios (pendiente):** doble clic en `unit_price` o `fuente_precios` activará la edición directa. Dispara el diálogo de advertencia de cambio global. Ver sección 10.

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
La tabla muestra todos los elementos IFC del modelo divididos en tres grupos mediante tabs:

| Tab | Contenido |
|-----|-----------|
| ✅ Auto-asignados | Elementos que traían `IfcClassificationReference` — asignados automáticamente. El usuario revisa y confirma. |
| ⚠️ Sin asignar | Elementos sin clasificación NBR en el IFC. Requieren mapeo manual. |
| 🔴 Conflictos | Elementos cuyo `qualitative_snapshot` cambió en una reimportación y tenían asignación manual previa. |

**Mapeo manual (tab "Sin asignar"):**
Columnas: Tipo IFC · Nombre · Nivel · Sugerencias (ítems sugeridos por `ifc_type`).
Al seleccionar un elemento, el panel de detalle muestra las sugerencias de ítem. El usuario acepta la sugerencia o busca manualmente. Un elemento puede recibir múltiples ítems (ej. muro: resultado estructural + revoque + pintura).

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
2. Si hay ítems sin precio: advertencia bloqueante — "X ítems no tienen precio. ¿Exportar de todas formas con valores vacíos, o completar precios primero?"
3. Descarga directa del archivo generado.

---

## 9. Sección: Ajustes

Configuración del proyecto activo y del sistema.

**Ajustes del proyecto:** nombre, descripción, ubicación, tipo de obra, moneda base, datos del cliente.

**Ajustes del sistema (post-MVP):** gestión de usuarios, roles, preferencias de idioma.

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

### 12.2 Bloqueo de exportación por precios faltantes

Si el presupuesto contiene ítems con `unit_price = NULL`, la exportación no se bloquea completamente — muestra una advertencia que permite al usuario elegir: exportar con celdas vacías o completar los precios primero. La decisión es del usuario.

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
Resultado (3E) · Espacio (4U) · Componente/Material (2C) · Mano de obra (2N) · Equipo (2Q)

### Instrucción para Claude Design

> Crear el set de iconos SVG de Cost-Mapper en estilo monoline, trazo de 1.5px, esquinas redondeadas con radio 2px, viewBox 24×24. Los iconos deben funcionar sobre fondo oscuro (#1E1E1E) en color #CCCCCC (estado inactivo) y #0078D4 (estado activo). Entregar cada icono como componente SVG independiente nombrado en snake_case (ej. `icon_catalog.svg`).
