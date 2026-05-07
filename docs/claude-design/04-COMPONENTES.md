# Componentes Reutilizables y Paneles Dinámicos

> Este documento especifica los componentes modulares y áreas dinámicas que aparecen a través de múltiples secciones de la aplicación.

---

## 1. Panel de Detalle Inferior (Bottom Sheet)

Un componente crítico presente en casi todas las secciones. Actúa como un inspector contextual.

**Comportamientos de estado:**
- **Colapsado (32px de alto):** 
  - Barra delgada anclada al fondo.
  - Ícono `↕` a la izquierda.
  - Texto centrado en color secundario `#9D9D9D` (ej. "Ítem seleccionado: Muro de mampostería").
  - Al hacer clic en cualquier parte de la barra, transiciona al estado expandido.
- **Expandido (280px de alto, redimensionable):**
  - Borde superior actúa como manejador de arrastre (drag handle).
  - Barra de herramientas en la parte superior derecha del panel:
    - Botón Pin (📌): Fija el panel para que no se colapse al cambiar de vista.
    - Botón Colapsar (↓): Devuelve el panel al estado colapsado.
  - El contenido interno cambia dependiendo de lo que el usuario haya seleccionado (ver puntos 2 y 3).

---

## 2. Componente: Tabla de Composición APU (Análisis de Precio Unitario)

Aparece dentro del Panel de Detalle Expandido cuando se selecciona un ítem en "Catálogo" o "Presupuesto".

**Estructura Visual:**
- **Header del Panel:** Código NBR y Descripción del Ítem Padre en fuente grande (16px, peso 600).
- **Sub-tabla (DataGrid):**
  - **Columnas:** Faceta (con chip), Código, Descripción Insumo, Unidad, Coeficiente (cantidad), Fuente del Coeficiente, Precio Unitario, Fuente de Precio.
  - **Jerarquía:** Agrupado por faceta del insumo (ej. Materiales `2C`, Mano de Obra `2N`, Equipos `2Q`).
- **Edición Inline:**
  - El "Precio Unitario" y la "Fuente de Precio" deben tener un estilo visual que indique que son editables (ej. subrayado punteado sutil o un color de celda ligeramente distinto en hover).
  - **Advertencia Global:** Si el usuario edita el precio, aparece un Modal/Dialog centrado: "Estás modificando el precio de [Insumo]. Este cambio afectará a todos los ítems que lo utilicen." con botones de Confirmar/Cancelar.

---

## 3. Componente: Inspector de Elemento IFC

Aparece dentro del Panel de Detalle Expandido cuando se selecciona un elemento en "Mapeo IFC".

**Estructura Visual:**
- Layout de dos columnas divididas internamente en el panel.
- **Lado Izquierdo (Propiedades BIM):**
  - Lista de clave-valor (Key-Value pairs) mostrando los atributos cualitativos del snapshot IFC.
  - Ejemplos: `Tipo: IfcWall`, `Material: Ladrillo Cerámico`, `Espesor: 15cm`.
- **Lado Derecho (Asignaciones):**
  - Lista de ítems del presupuesto actualmente asignados a este elemento.
  - Botón o input de búsqueda: "Asignar otro ítem...".

---

## 4. Componente: Chips de Facetas NBR

Indicadores visuales pequeños que se usan en tablas, paneles y filtros para identificar rápidamente la naturaleza de un ítem.

**Estructura Visual:**
- Rectángulo de bordes redondeados (radio 4px).
- Altura ~22px, padding interno pequeño.
- Texto abreviado (ej. "3E", "2N").
- **Colores específicos (Backgrounds sutiles con texto de contraste):**
  - `3E` (Resultados): Azul tenue
  - `4U` (Espacios): Verde tenue
  - `2C` (Componentes/Materiales): Naranja tenue
  - `2N` (Mano de obra): Púrpura tenue
  - `2Q` (Equipos): Amarillo/Dorado tenue

---

## 5. Componente: Dropdown Selector de Proyecto

Se encuentra en el Header superior. Es el control de contexto global.

**Estructura Visual:**
- Botón rectangular con padding, centrado en el header.
- Diseño interno del botón: Ícono de carpeta + Texto principal (Nombre del proyecto) + Texto secundario pequeño debajo (Ubicación) + Chevron ▼.
- **Menú Desplegable (Popover):**
  - Lista de proyectos recientes con el mismo layout de dos líneas (Nombre + Ubicación).
  - Fila inferior fija y separada por una línea: "➕ Nuevo proyecto".
