# Sistema Visual — Cost-Mapper

> Paleta de colores, tipografía, espaciado y tokens de diseño. Todo el sistema visual se deriva de estas decisiones base.

---

## Paleta de colores

### Fondos y superficies

| Token               | Hex       | Uso                                                          |
|---------------------|-----------|--------------------------------------------------------------|
| `bg-base`           | `#1E1E1E` | Fondo principal de la aplicación (body, visor 3D)           |
| `bg-surface`        | `#252526` | Superficie de paneles, sidebar, header, panel de detalle    |
| `bg-surface-raised` | `#2D2D30` | Dropdowns, tooltips, elementos elevados sobre la superficie |
| `bg-surface-hover`  | `#3E3E42` | Estado hover de filas de tabla, botones secundarios         |
| `bg-input`          | `#3C3C3C` | Campos de texto, selects, inputs de búsqueda                |

### Bordes y separadores

| Token              | Hex       | Uso                                                    |
|--------------------|-----------|--------------------------------------------------------|
| `border-default`   | `#3E3E42` | Bordes de paneles, separadores entre zonas             |
| `border-subtle`    | `#2D2D30` | Separadores internos de tablas (filas), líneas finas   |
| `border-focus`     | `#0078D4` | Borde de inputs con foco, celda de tabla en edición    |

### Texto

| Token              | Hex       | Uso                                                    |
|--------------------|-----------|--------------------------------------------------------|
| `text-primary`     | `#CCCCCC` | Texto principal, valores de tabla                      |
| `text-secondary`   | `#9D9D9D` | Labels, placeholders, metadata, texto de baja jerarquía|
| `text-disabled`    | `#6B6B6B` | Texto deshabilitado                                    |
| `text-on-accent`   | `#FFFFFF` | Texto sobre fondos de acento (botones primarios)       |

### Acento y estados

| Token              | Hex       | Uso                                                         |
|--------------------|-----------|-------------------------------------------------------------|
| `accent`           | `#0078D4` | Botones primarios, icono activo en sidebar, borde de foco  |
| `accent-hover`     | `#106EBE` | Hover de elementos con acento                              |
| `accent-subtle`    | `#1C3A5E` | Fondo de fila seleccionada en tabla, resaltado de selección|
| `success`          | `#4CAF50` | Estado "asignado", confirmaciones                          |
| `warning`          | `#FF9800` | Banner de ítems sin precio, estado "sin asignar"           |
| `error`            | `#F44336` | Estado "conflicto", errores de validación                  |
| `warning-subtle`   | `#3D2B00` | Fondo de banner de advertencia                             |
| `error-subtle`     | `#3D0000` | Fondo de badge de conflicto                                |

### Colores de faceta NBR (para chips y badges)

Las facetas NBR 15965 son categorías de clasificación de ítems. Cada una tiene un color de identificación para los chips del filtro:

| Faceta | Nombre                    | Color chip | Hex       |
|--------|---------------------------|------------|-----------|
| `3E`   | Resultados de construcción| Azul       | `#1565C0` |
| `4U`   | Espacios                  | Verde      | `#2E7D32` |
| `2C`   | Componentes / Materiales  | Naranja    | `#E65100` |
| `2N`   | Mano de obra              | Amarillo   | `#F9A825` |
| `2Q`   | Equipos                   | Violeta    | `#6A1B9A` |

---

## Tipografía

**Fuente principal:** `Inter` (Google Fonts, sin costo, excelente legibilidad en pantallas de alta resolución y en densidades altas de información).

**Escala tipográfica:**

| Nombre      | Tamaño | Peso    | Uso principal                                    |
|-------------|--------|---------|--------------------------------------------------|
| `heading-l` | 16px   | 600     | Títulos de sección (header de panel de detalle)  |
| `heading-m` | 14px   | 600     | Subtítulos, encabezados de columna de tabla      |
| `body`      | 13px   | 400     | Texto de celdas de tabla, contenido principal    |
| `body-sm`   | 12px   | 400     | Metadata, labels secundarios, tooltips           |
| `mono`      | 12px   | 400     | Códigos NBR, valores de precio, IDs de elementos |

**Nota crítica:** la mayor parte del texto de la app son datos en tablas densas. Tamaños menores a 12px quedan prohibidos. La fuente `mono` (`font-family: 'JetBrains Mono', monospace`) se usa exclusivamente para códigos y valores numéricos de precisión.

---

## Espaciado

Sistema de espaciado basado en múltiplos de 4px.

| Token     | Valor | Uso                                                           |
|-----------|-------|---------------------------------------------------------------|
| `space-1` | 4px   | Padding interno de badges, separación mínima entre elementos  |
| `space-2` | 8px   | Padding de celdas de tabla, gap entre icono y label           |
| `space-3` | 12px  | Padding de inputs, padding horizontal de filas                |
| `space-4` | 16px  | Padding de paneles, margen entre secciones                    |
| `space-5` | 20px  | —                                                             |
| `space-6` | 24px  | Padding de modales, separación entre grupos de elementos      |

**Altura de fila de tabla:** 36px (compacta, para mostrar máximos ítems sin scroll excesivo).

**Altura de encabezado de tabla:** 32px.

---

## Bordes y esquinas

| Elemento                           | Border-radius |
|------------------------------------|---------------|
| Botones primarios y secundarios    | 4px           |
| Inputs, selects, campos de texto   | 4px           |
| Badges, chips de faceta            | 4px           |
| Modales / diálogos de confirmación | 6px           |
| Tooltips                           | 4px           |
| Paneles principales                | 0px (flush)   |

**Sombras:** mínimas. Solo para elementos elevados como tooltips y dropdowns: `box-shadow: 0 4px 12px rgba(0,0,0,0.5)`.

---

## Componentes de estado visual

### Fila de tabla seleccionada
- Fondo: `#1C3A5E` (`accent-subtle`)
- Texto: `#FFFFFF`
- Sin borde lateral coloreado (el fondo es suficiente)

### Fila de tabla con hover
- Fondo: `#3E3E42` (`bg-surface-hover`)
- Transición: 100ms ease

### Badge de estado (para mapeo IFC)

| Estado         | Ícono | Fondo           | Texto     |
|----------------|-------|-----------------|-----------|
| Auto-asignado  | ✓     | `#1B3A1B`       | `#4CAF50` |
| Sin asignar    | ○     | `#3D2B00`       | `#FF9800` |
| Conflicto      | !     | `#3D0000`       | `#F44336` |
| Confirmado     | ✓✓    | `#1B3A1B`       | `#66BB6A` |

### Input de búsqueda
- Fondo: `#3C3C3C`
- Borde: `1px solid #3E3E42`
- Foco: borde cambia a `#0078D4`
- Ícono de lupa en `#9D9D9D` al inicio del campo
- Placeholder en `#6B6B6B`

---

## Tokens de dimensiones de layout

| Zona              | Dimensión             |
|-------------------|-----------------------|
| Header            | altura 48px           |
| Sidebar           | ancho 56px            |
| Visor 3D (default)| ancho 380px           |
| Panel de detalle  | altura 32px colapsado / 280px expandido |
| Área principal    | resto del espacio disponible |
