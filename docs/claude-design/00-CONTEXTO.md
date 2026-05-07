# Cost-Mapper — Contexto del producto para diseño

> **Para quién es este archivo:** Claude Design y cualquier diseñador que trabaje en la interfaz de Cost-Mapper. Lee este archivo antes de tocar cualquier pantalla.

---

## Qué es Cost-Mapper

Cost-Mapper es una **aplicación web de escritorio** para gestión de costos en proyectos de construcción usando metodología BIM (Building Information Modeling). Está pensada para el mercado paraguayo y es open source.

El problema que resuelve: en un proyecto de construcción, el arquitecto o ingeniero tiene un modelo 3D del edificio (generado en Revit) y necesita calcular cuánto va a costar construirlo. Hoy ese proceso es manual, lento y propenso a errores. Cost-Mapper conecta automáticamente el modelo 3D con un catálogo de precios y genera el presupuesto.

---

## Flujo de trabajo del usuario (la historia completa)

```
1. El usuario crea un proyecto en Cost-Mapper
2. Arma una biblioteca de ítems candidatos (del catálogo de precios)
3. Descarga un archivo de keynotes y lo carga en Revit
4. En Revit, etiqueta los elementos del modelo con los keynotes
5. Exporta el modelo como IFC y lo sube a Cost-Mapper
6. Cost-Mapper lee el IFC y asigna automáticamente los ítems a los elementos 3D
7. El usuario completa las asignaciones que quedaron sin clasificar
8. Cost-Mapper calcula el presupuesto automáticamente
9. El usuario exporta el presupuesto en PDF o Excel
```

El usuario no necesita saber programación ni BIM avanzado. Sí necesita saber usar Revit y entender de costos de construcción.

---

## Usuarios objetivo

**Perfil principal:** Arquitecto o ingeniero civil que trabaja en una oficina técnica o empresa constructora en Paraguay. Conoce Revit, maneja Excel, entiende de presupuestos de construcción. No es desarrollador.

**Perfil secundario:** Estudiante de arquitectura o ingeniería civil que aprende metodología BIM. Necesita que la interfaz sea didáctica y no asuma experiencia previa con software de presupuesto.

**Lo que el usuario valora:**
- Velocidad: que calcular el presupuesto lleve horas, no días
- Precisión: que los precios estén actualizados y el catálogo sea confiable
- Control: que pueda revisar y corregir cualquier asignación automática
- Exportación: que el presupuesto generado se vea profesional para presentar a clientes

---

## Referentes visuales del contexto

El usuario pasa el día trabajando en estas aplicaciones. Cost-Mapper debe sentirse coherente con ese entorno:

- **Autodesk Revit** — aplicación de modelado BIM. Interfaz oscura, densa, orientada a productividad. El usuario ya conoce esta estética.
- **Microsoft Excel** — para presupuestos. El usuario espera tablas editables, filtros rápidos, exportación directa.
- **VS Code** — para contexto: mismo tema de colores oscuro, misma paleta azul de acento (`#0078D4`).

**No referentes:** apps de consumo (Instagram, Spotify), dashboards de marketing, interfaces coloridas o lúdicas. Este es software de ingeniería.

---

## Qué tipo de datos maneja la interfaz

**Catálogo de ítems:** ~40.000 ítems de construcción (materiales, mano de obra, equipos) clasificados por código NBR 15965. Cada ítem tiene código, descripción, unidad de medida, precio unitario en guaraníes, y una composición de insumos (APU — Análisis de Precio Unitario).

**Modelo IFC:** archivo 3D del edificio con cientos o miles de elementos (muros, losas, columnas, vigas, puertas, ventanas). Cada elemento tiene un tipo IFC, nombre, nivel, y parámetros geométricos y cualitativos.

**Presupuesto:** la tabla resultante de cruzar los elementos IFC con el catálogo. Muestra cantidades × precios = subtotales, agrupados por faceta NBR.

**Proyectos:** un usuario puede tener múltiples proyectos activos. Cambiar de proyecto recarga todos los datos.

---

## Restricciones de diseño no negociables

1. **Desktop-first, sin versión móvil en MVP.** Pantalla mínima soportada: 1280×768px. Diseñar para 1440px.
2. **Tablas son el componente central.** La mayor parte de la interacción ocurre en tablas densas de muchas columnas. El diseño debe optimizar la legibilidad de tablas, no sacrificarla por estética.
3. **El sidebar no tiene etiquetas de texto.** Solo iconos con tooltips. Maximiza el espacio horizontal para las tablas.
4. **El visor 3D es complementario, no protagonista.** El usuario trabaja principalmente con las tablas; el visor 3D ayuda a identificar visualmente los elementos. No ocupar más espacio del necesario.
5. **Tema oscuro. No hay modo claro en MVP.**
