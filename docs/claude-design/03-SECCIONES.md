# Secciones del Área Principal

> Este documento detalla el diseño de contenido para las 6 vistas principales que se muestran en el Área Principal central. Las herramientas de IA deben basar sus wireframes y mockups en estas descripciones.

---

## 1. Catálogo (El explorador global)

Es la pantalla por defecto. Muestra la base de datos completa de ítems (TCPO + NBR). No está atada a un proyecto en particular.

**Estructura Visual:**
1. **Header de Sección:**
   - Título grande "Catálogo de Ítems"
   - Barra de búsqueda de texto completo con ícono de lupa (ancho ~300px)
   - Contenedor de filtros con chips seleccionables para Facetas NBR (3E, 4U, 2C, 2N, 2Q, 1S)
   - Toggle/Switch: "Solo relevantes PY"
   - Indicador de estado: "X ítems sin precio" con botón o badge clickeable.

2. **Tabla de Datos (DataGrid):**
   - **Columnas:** Faceta (con chip visual), Código NBR, Descripción (texto largo), Unidad (m², hr, etc.), Precio Unitario (alineado a la derecha), Moneda, Fuente (badge), Relevancia PY (check/ícono).
   - **Estilo de Tabla:** Diseño denso (compacto), filas con bordes tenues `1px solid #3E3E42`, hover sutil `#2A2D2E`.
   - **Comportamiento:** Doble clic en Precio Unitario, Moneda o Fuente activa edición inline (input directo en la celda).

3. **Panel de Desglose APU (Bottom Sheet):**
   - Panel fijo en la parte inferior de la tabla. Al hacer clic en un ítem de la tabla, muestra la composición APU detallada.

---

## 2. Presupuesto (La calculadora del proyecto)

Muestra los costos calculados para el proyecto activo. En esta vista, el **Visor 3D y el Panel de APU no existen**. La pantalla es 100% dedicada a una vista amplia tipo "Dashboard" financiero.

**Estructura Visual:**
1. **Dashboard Superior (Métricas):**
   - Tarjetas de resumen: "Total Costo Directo", "Porcentaje Asignado al BIM", etc.
   - Toggle switch visual: Ver por Ítem / Ver por Elemento IFC
   - Filtros rápidos por faceta.
   - Banner superior amarillo (estado de alerta) si existen ítems asignados sin precio, con botón de "Completar precios".

2. **Tabla Jerárquica Expansiva:**
   - La tabla ocupa todo el ancho y alto restante.
   - **Agrupamiento:** Las filas se agrupan por Faceta NBR (ej. un header de fila colapsable "3E - Resultados" con subtotal acumulado).
   - **Columnas:** Código NBR, Descripción, Unidad, Cantidad (calculada del 3D), Precio Unitario, Subtotal.
   - **Footer:** Fila fija en la parte inferior de la tabla con el "Total Costo Directo".

---

## 3. Mapeo IFC (Importación y vinculación)

Es el centro de operaciones BIM, donde la geometría se une a los costos.

**Estructura Visual (Estado sin importar):**
- Layout tipo "Empty State" centrado.
- Ícono ilustrativo grande (ej. un cubo 3D o documento).
- Texto: "Importa un archivo IFC para comenzar la asignación de costos".
- Botón prominente primario: "Subir modelo IFC".

**Estructura Visual (Post-importación — Pantalla Dividida en 3):**
1. **Header y Navegación Interna:**
   - Tabs de segmentación: 
     - ✅ Auto-asignados (con contador)
     - ⚠️ Sin asignar (con contador resaltado)
     - 🔴 Conflictos (solo si es > 0)
2. **Tabla de Mapeo (Izquierda):**
   - **Columnas:** Tipo IFC (ej. IfcWall), Nombre del elemento, Nivel/Planta, Sugerencias.
3. **Visor 3D (Derecha):**
   - Ocupa la mitad derecha de la pantalla. Resalta los elementos seleccionados en la tabla.
4. **Panel Inspector (Inferior):**
   - Muestra las propiedades BIM del elemento seleccionado y opciones para buscar o aceptar ítems sugeridos.

---

## 4. Biblioteca (Keynotes y selección previa)

Donde el usuario selecciona ítems candidatos antes de ir a Revit.

**Estructura Visual (Dos Columnas Verticales):**
1. **Columna Izquierda (Biblioteca del Proyecto):**
   - Ocupa ~40% del ancho.
   - Lista compacta de ítems ya agregados al proyecto.
   - **Generador de Keynotes (Bottom Card):** Un panel fijo en la parte inferior de esta columna con checkboxes (3E, 4U, 2C) y un botón de descarga "Generar Keynote (.txt)".
   
2. **Columna Derecha (Explorador Rápido):**
   - Ocupa ~60% del ancho.
   - Versión simplificada de la tabla del "Catálogo".
   - Al final de cada fila, un botón primario pequeño `+` para añadir a la columna izquierda.

---

## 5. Informes (Exportación)

Panel simple y directo para generar los entregables.

**Estructura Visual:**
1. **Tarjetas de Exportación (Grid):**
   - Tarjeta "PDF Formal": Ícono de PDF, descripción, opciones (incluir detalle APU o solo resumen).
   - Tarjeta "Excel (XLSX)": Ícono de Excel, descripción, opciones (exportación cruda).
2. **Prototipo de PDF (Previsualización):**
   - El sistema de diseño debe incluir un layout/mockup de cómo se vería el documento PDF exportado (tamaño A4, header formal, tabla densa en blanco y negro, pie de página).
3. **Área de Advertencias:**
   - Si faltan precios, un bloque de advertencia grande con botones de acción ("Exportar de todas formas" o "Ir al presupuesto").

---

## 6. Ajustes (Configuración)

Formulario tradicional.

**Estructura Visual:**
- Layout de tarjeta central o lista de preferencias alineada.
- **Campos:** Nombre del proyecto, descripción, ubicación, tipo de obra (dropdown), moneda base (dropdown PYG/USD).
- Botones de "Guardar" y "Cancelar" en la parte inferior.
