# Iconografía

> La iconografía no debe depender de librerías genéricas (como FontAwesome) ni emojis del SO. El diseñador (o modelo generativo) debe crear un set de íconos SVG cohesivo que forme parte de la identidad de la aplicación.

---

## 1. Estilo General Requerido

- **Tipo de Trazo:** Fino y uniforme (Monoline). Grosor de línea: `1.5px`.
- **Geometría:** Limpia, técnica y profesional. Sin rellenos sólidos (solid fills) excepto para enfatizar estados activos muy específicos.
- **Formato:** SVG, con `viewBox="0 0 24 24"`.
- **Esquinas:** Redondeadas sutilmente (border-radius / stroke-linejoin: round) con un radio de `2px` para suavizar el aspecto técnico.
- **Color base:** Los SVGs deben diseñarse con `stroke="currentColor"`. El color lo aplicará CSS.
  - **Inactivo / Defecto:** `#9D9D9D` (gris medio).
  - **Hover:** `#CCCCCC` (gris claro).
  - **Activo / Seleccionado:** `#0078D4` (Azul primario).

---

## 2. Inventario de Íconos Requeridos (MVP)

Claude Design deberá generar los siguientes íconos individuales:

### Sidebar Principal (Navegación)
1. `icon_catalog` - Lista estructurada o jerárquica (Catálogo).
2. `icon_budget` - Tabla con un símbolo matemático o de suma (Presupuesto).
3. `icon_mapping` - Cubo 3D con un nodo o conector (Mapeo IFC).
4. `icon_library` - Colección de libros o una carpeta con una estrella (Biblioteca).
5. `icon_reports` - Documento con un gráfico de barras pequeño (Informes).
6. `icon_settings` - Engranaje clásico y limpio (Ajustes).

### Acciones Globales de UI
7. `icon_search` - Lupa clásica.
8. `icon_filter` - Embudos (funnel).
9. `icon_sort` - Flechas arriba/abajo.
10. `icon_expand` / `icon_collapse` - Flechas direccionales finas (Chevron arriba/abajo/izquierda/derecha).
11. `icon_close` - Una 'X' limpia.
12. `icon_check` - Tilde de confirmación.
13. `icon_warning` - Triángulo de advertencia (alerta).
14. `icon_import` / `icon_export` - Bandejas o flechas entrando/saliendo de una caja.
15. `icon_edit` - Lápiz.
16. `icon_save` - Disquete minimalista o tilde.
17. `icon_add` - Signo '+' limpio.
18. `icon_delete` - Tacho de basura simple.

### Controladores del Visor 3D
19. `icon_3d_orbit` - Esfera de rotación.
20. `icon_3d_zoom_extents` - Cuatro flechas apuntando a las esquinas.
21. `icon_3d_reset` - Casa (Home) o recargar (refresh loop).
22. `icon_3d_wireframe` - Cubo en modo alambre (transparente).

---

## 3. Comportamiento en la UI

- En el Sidebar, el ícono activo (ej. cuando estoy en la vista Catálogo) debe cambiar de color al `#0078D4`.
- Los íconos en los botones deben tener un tamaño de `16x16px` o `20x20px` dependiendo de la jerarquía del botón.
- Los íconos en el sidebar deben visualizarse a `24x24px`.
