# Estados e Interacciones

> Este documento aborda la lógica interactiva de la aplicación. Describe cómo responde la interfaz a las acciones del usuario, los cambios de contexto y los casos borde (edge cases).

---

## 1. Selección Bidireccional (Tabla ↔ Visor 3D)

El núcleo de la experiencia BIM 5D de Cost-Mapper es la conexión visual inmediata entre un costo (tabla) y una geometría (3D).

- **De Tabla a 3D:** 
  - Al seleccionar una fila en la tabla de "Mapeo IFC", el elemento queda resaltado con un fondo de selección (`#2A2D2E` con borde azul tenue).
  - Automáticamente, en el Visor 3D (que está a la derecha en esa misma vista), el elemento físico vinculado se resalta en el color de acento (`#0078D4` o un overlay con transparencia). 
  - El resto del modelo 3D cambia a un estado "translúcido" (ghost mode) con un `20%` de opacidad para dar contexto sin estorbar.
- **De 3D a Tabla:**
  - Al hacer clic en un objeto directamente dentro del Visor 3D, el objeto se resalta.
  - La tabla del Área Principal se desplaza automáticamente (scroll into view) hacia la fila correspondiente y la selecciona visualmente.
  - El Panel de Detalle inferior se expande mostrando los datos precisos de ese objeto o ítem.

---

## 2. Estado: Sin Modelo IFC (Empty State del Visor)

- **Condición:** Se crea un nuevo proyecto o se entra a uno donde el usuario aún no importó ningún archivo `.ifc`.
- **Comportamiento Visual:** 
  - El Panel del Visor 3D puede colapsarse automáticamente.
  - Si el panel está abierto, en lugar del canvas 3D, se muestra un fondo plano `#1E1E1E`.
  - En el centro, un ícono o ilustración (dibujo de líneas finas de un cubo con un símbolo de exclamación o de "subir archivo").
  - Texto descriptivo: "No hay modelo IFC cargado. Importá uno desde la sección Mapeo IFC." (Centrado, color secundario `#9D9D9D`).
- **Layout del Área Principal:** Como el Visor no es útil, el Área Principal toma todo el ancho disponible para mostrar las tablas con más holgura.

---

## 3. Estado: Edición Inline y Cambio Global de Precios

La facilidad de modificar precios directamente en la tabla del APU requiere advertencias claras, dado que cambiar el precio de un clavo cambia el presupuesto entero.

- **Interacción:** El usuario hace doble clic en la celda de "Precio" del "Carpintero" dentro del Panel APU. La celda se convierte en un campo numérico. El usuario escribe un nuevo precio y presiona Enter.
- **Flujo de Estado:**
  1. La celda pierde el foco y queda "cargando" brevemente.
  2. Aparece un **Modal superpuesto** bloqueando la interfaz (Scrim/Overlay oscuro `rgba(0,0,0,0.5)`).
  3. **Contenido del Modal:**
     - Título: "Modificación Global de Precio"
     - Mensaje: "Estás modificando el precio de **[Carpintero]**. Este cambio se aplicará a todos los ítems que usen este insumo como componente, alterando múltiples APUs."
     - Botones: "Cancelar" (Ghost button) y "Confirmar Modificación" (Primary button destructivo o de alerta).
  4. Si confirma, la celda se actualiza y la fila emite un sutil flash visual indicando el guardado.

---

## 4. Estado: Bloqueo Parcial por Precios Faltantes (Exportación)

Un presupuesto con ítems sin precio (valor `NULL`) no está listo.

- **Detección:** En la vista "Presupuesto", si hay ítems donde `unit_price` está vacío.
- **Indicador:** Un Banner de alerta amarillo fijo en la parte superior del Área Principal (Debajo del Header, antes de la tabla).
- **Acción del usuario:** El usuario ignora la alerta y va a la pestaña "Informes" para exportar a PDF.
- **Bloqueo Inteligente:**
  - Al hacer clic en "Descargar PDF", el PDF no baja inmediatamente.
  - Se despliega un diálogo o un panel lateral de confirmación.
  - Mensaje: "⚠️ Tu presupuesto contiene 12 ítems sin precio. ¿Deseas exportar el documento con estos valores en blanco, o prefieres completar los precios antes de exportar?"
  - Botones: "Exportar Incompleto" y "Ir a Completar Precios".

---

## 5. Cambios Globales de Contexto (Cambio de Proyecto)

El usuario puede saltar de un proyecto a otro desde cualquier pantalla usando el Dropdown del Header.

- **Alerta de cambios no guardados:** Si el usuario estaba editando un campo y no lo guardó, preguntar si desea descartar los cambios.
- **Limpieza de UI:**
  - El Visor 3D "descarga" el modelo actual e instancia el nuevo (o pasa a Empty State si el nuevo proyecto no tiene modelo).
  - El Panel de Detalle se contrae a su estado colapsado (32px).
  - El Área Principal mantiene la misma Sección (ej. si estaba en "Catálogo", sigue en "Catálogo", pero se refresca si había datos del proyecto en caché, aunque Catálogo sea global). Si estaba en "Presupuesto", la tabla se recarga con los datos del nuevo proyecto seleccionado.
