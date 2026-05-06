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
├────┬─────────────────────────────────────┬────────────────────────── ┤
│    │                                     │                           │
│    │                                     │                           │
│  S │         ÁREA PRINCIPAL              │      VISOR 3D IFC         │
│  I │                                     │      (@thatopen)          │
│  D │   (contenido de la sección activa)  │                           │
│  E │                                     │   Colapsable — se oculta  │
│  B │                                     │   si no hay IFC cargado   │
│  A ├─────────────────────────────────────┴───────────────────────────┤
│  R │  ↕  PANEL DE DETALLE  (expandible desde abajo)                  │
│    │     APU del ítem / detalle del elemento IFC seleccionado        │
└────┴──────────────────────────────────────────────────────────────────┘
```

**Dimensiones de cada zona:**
- Sidebar: 56px de ancho (solo iconos). Sin etiquetas de texto para maximizar el área de trabajo.
- Área principal: ocupa todo el centro, ancho flexible.
- Visor 3D: panel derecho, ~380px por defecto, redimensionable con drag. Se oculta completamente cuando no hay modelo IFC cargado — el área principal toma todo el ancho.
- Panel de detalle: colapsado por defecto (~32px — solo la barra con el título del ítem). Al hacer clic en un ítem se expande a ~280px de altura. El usuario puede redimensionarlo con drag.

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

Al cambiar de sección solo cambia el contenido del área principal. El visor 3D y el panel de detalle permanecen en su lugar.

---

## 4. Sección: Catálogo

El explorador del catálogo completo (`catalog_items`). Es la sección de referencia — no está atada a un proyecto específico.

**Área principal — tabla del catálogo:**

Columnas visibles por defecto: Faceta · Código NBR · Descripción · Unidad · Precio · Moneda · Fuente · Relevancia PY.

Controles encima de la tabla:
- Barra de búsqueda de texto libre (busca en descripción ES y PT)
- Filtro por faceta (chips seleccionables: 3E · 4U · 2C · 2N · 2Q · 1S)
- Filtro por relevancia PY (toggle: Solo relevantes PY)
- Filtro por fuente de precios
- Indicador: "X ítems sin precio" — con botón para filtrar solo esos

**Selección de ítem:** al hacer clic en una fila se selecciona el ítem y el panel de detalle inferior se expande mostrando su composición APU. Si el ítem tiene `bim_taggable = true` y hay un modelo IFC cargado, el visor 3D resalta los elementos asignados a ese ítem.

**Edición inline:** doble clic en las celdas `unit_price`, `currency` o `fuente_precios` activa la edición directa. Ver sección 10 para el comportamiento de guardado.

---

## 5. Sección: Presupuesto

Vista del presupuesto del proyecto activo, calculado desde `project_assignments`.

**Área principal — tabla de presupuesto:**

Columnas: Código NBR · Descripción · Unidad · Cantidad · Precio Unitario · Subtotal · Fase (post-MVP).

Agrupado por faceta NBR por defecto (colapsable). Muestra totales por grupo y total general en la parte inferior.

Controles:
- Toggle: ver por ítem / ver por elemento IFC
- Filtro por faceta
- Indicador de ítems sin precio con botón "Completar precios" que lleva al catálogo filtrado

**Selección bidireccional con visor 3D:** al hacer clic en una fila del presupuesto, el visor 3D resalta los elementos IFC asignados a ese ítem (el resto aparece translúcido). Al hacer clic en un elemento en el visor 3D, la tabla se desplaza y resalta la fila correspondiente.

**Alerta de presupuesto incompleto:** si hay ítems con `unit_price = NULL`, un banner amarillo en la parte superior indica cuántos ítems no tienen precio y bloquea la exportación hasta que se completen.

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

## 10. Panel de detalle (zona inferior)

Panel expandible en la parte inferior del layout. Está presente en todas las secciones.

**Contenido según el contexto:**

| Sección activa | Contenido del panel |
|----------------|---------------------|
| Catálogo | Composición APU del ítem seleccionado (tabla editable) |
| Presupuesto | Composición APU del ítem seleccionado + elementos IFC asignados |
| Mapeo IFC | Detalle del elemento IFC: tipo, nombre, nivel, parámetros cualitativos, asignaciones |
| Biblioteca | Detalle del ítem: descripción completa, APU, fuentes |

**Comportamiento:**
- Colapsado por defecto (solo muestra título del ítem seleccionado en la barra).
- Se expande automáticamente al seleccionar un ítem por primera vez en la sesión.
- El usuario puede redimensionar con drag vertical.
- Botón de pin para mantenerlo expandido aunque se cambie de sección.

---

## 11. Visor 3D IFC (zona derecha)

Panel derecho fijo con el visor 3D del modelo IFC del proyecto activo.

**Estado sin modelo IFC:** el panel muestra un placeholder con el mensaje "No hay modelo IFC cargado. Importá uno desde la sección Mapeo." El área principal toma todo el ancho disponible.

**Estado con modelo cargado:** vista isométrica por defecto. Controles mínimos visibles: orbitar · zoom · resetear vista · toggle wireframe. Sin barras de herramientas complejas — la interacción principal es la selección.

**Selección bidireccional:**
- Clic en elemento 3D → resalta la fila del ítem en el área principal. El resto del modelo aparece translúcido.
- Selección de ítem en tabla → resalta los elementos 3D asignados a ese ítem.

**Colapso:** botón `◀` en el borde izquierdo del panel para ocultarlo y dar más espacio al área principal. Estado recordado por sesión.

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
