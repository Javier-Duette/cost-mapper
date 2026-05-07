# Cost-Mapper UI Kit — App de escritorio

Recreación interactiva del producto principal Cost-Mapper V2.

## Componentes

- `Icon.jsx` — wrapper SVG monoline + diccionario de íconos (compartido con `assets/icons/`).
- `Header.jsx` — header 48px con logo, selector de proyecto (popover) y avatar/ajustes.
- `Sidebar.jsx` — nav lateral 56px con pastilla activa estilo VS Code y tooltips.
- `SectionHeader.jsx` — barra de controles (búsqueda + chips de faceta + toggle "relevantes PY").
- `BudgetTable.jsx` — tabla agrupada por faceta NBR con subtotales y total fijo.
- `Viewer3D.jsx` — visor 3D placeholder con toolbar flotante y empty state.
- `DetailPanel.jsx` — bottom sheet colapsado/expandido con sub-tabla APU editable.
- `ConfirmModal.jsx` — modal global de confirmación (cambio de precio).
- `App.jsx` — wires todo, incluye estado de selección, sección, viewer, panel.

## Cómo correrlo

Abrir `index.html`. Carga React 18 + Babel standalone. Sin build.

## Estado interactivo

- Click en filas del presupuesto → resalta y actualiza el panel APU inferior.
- Click en el ↕ del panel → colapsa/expande el bottom sheet.
- Click en ▶ del visor → colapsa el panel 3D (la tabla se expande).
- Selector de proyecto (header) → popover con 3 proyectos mock.
- Click en "Confirmar modificación" en una celda editable → modal de advertencia global.
