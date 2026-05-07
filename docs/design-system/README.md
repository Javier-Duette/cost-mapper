# Cost-Mapper Design System

Sistema de diseño completo para **Cost-Mapper V2** — aplicación web open source de gestión de costos BIM 5D para Paraguay. Conecta modelos 3D (IFC) con bases de datos de costos de construcción (TCPO + NBR 15965).

> Tema oscuro puro, denso, técnico y profesional. Estética coherente con Autodesk Revit, VS Code y Microsoft Excel — no con apps de consumo.

## Sources

- **Codebase (mounted):** `cost-mapper/` — explorado con `local_ls/local_read`. La especificación canónica vive en `cost-mapper/docs/claude-design/00..06-*.md` (7 archivos numerados).
- **GitHub:** `Javier-Duette/cost-mapper`
- **Documentación complementaria:** `docs/MODELO-DE-DATOS.md`, `docs/STACK-TECNOLOGICO.md`, ADRs en `docs/adrs/`.

## Index

| Archivo | Contenido |
|---|---|
| `theme.css` | Todos los tokens: colores, tipografía, espaciado, radios, sombras, motion, dimensiones. Único punto de verdad. |
| `assets/icons/` | 37 íconos SVG monoline 1.5px, viewBox 24×24, `stroke="currentColor"`. |
| `preview/` | Cards aisladas para el design system (colores, tipografía, espaciado, componentes). |
| `ui_kits/cost-mapper-app/` | Recreación interactiva del producto: header + sidebar + tabla de presupuesto + visor 3D + panel APU + modal. |
| `SKILL.md` | Skill cross-compatible (Claude Code) — arranque rápido para usar este sistema. |

---

## Content fundamentals

**Idioma:** español rioplatense paraguayo. Voseo informal pero técnico ("Importá un modelo IFC", "Subí el archivo"). El usuario es arquitecto/ingeniero, no consumidor general.

**Tono:** directo, neutro, sin marketing. Mensajes cortos, factuales. La interfaz es una herramienta — no entretiene, no celebra acciones rutinarias.

**Casing:** Sentence case en todos lados (títulos, botones, labels). UPPER CASE solo en encabezados de columnas de tablas (`CÓDIGO NBR`, `P. UNIT (₲)`). Códigos NBR en mayúscula con puntos: `3E.04.07.001`.

**Persona:** "tú" implícito, sin marcar. "Tu presupuesto contiene 12 ítems sin precio." — no "Su presupuesto", no "El presupuesto del usuario".

**Emoji:** **prohibidos** en producto. Ni en empty states, ni en confirmaciones, ni en banners. Para estados se usan íconos del set propio. Excepción tolerada en docs internas (no en UI).

**Palabras clave del dominio:** Faceta NBR · APU (Análisis de Precio Unitario) · IFC · Keynote · TCPO · Insumo · Mapeo · Asignación · Ítem.

**Ejemplos reales:**
- Empty state: "No hay modelo IFC cargado. Importá uno desde la sección Mapeo IFC."
- Banner: "Tu presupuesto contiene **12 ítems sin precio**. Algunos cálculos están incompletos." → `[Completar precios]`
- Modal global: "Estás modificando el precio de **Albañil oficial (2N.01.02.005)**. Este cambio se aplicará a **todos los ítems** que usen este insumo."
- CTA primarios: "Subir modelo IFC", "Confirmar modificación", "Completar precios". Verbos de acción concretos, nunca "Continuar" o "OK".

---

## Visual foundations

**Paleta:** dark puro derivada de VS Code. Tres niveles de superficie (`#1E1E1E` → `#252526` → `#2D2D30`) con diferencias de valor mínimas; el contraste lo da el borde 1px. Acento único `#0078D4` (mismo azul que VS Code) — no se introduce un segundo color de marca. Estados semánticos en verde/amarillo/rojo Material-style con variantes `*-subtle` para fondos de banner/badge. **5 colores de faceta NBR** (3E azul, 4U verde, 2C naranja, 2N amarillo, 2Q violeta) usados solo en chips y agrupaciones — no en superficies grandes.

**Tipografía:** Inter (sans) para UI · JetBrains Mono para códigos, IDs y números precisos. Escala compacta — `13px body`, `12px sm`, `16px heading-l`. **Mínimo absoluto 12px**: la app vive en tablas densas. Pesos 400/500/600. Sin display fonts, sin serifs.

**Espaciado:** múltiplos de 4px (4-8-12-16-20-24). Filas de tabla **36px**, headers de tabla **32px**. Header app **48px**, sidebar **56px**. Densidad alta — más datos visibles, menos scroll.

**Backgrounds:** planos. Cero gradientes (excepto el del visor 3D, sutil 135deg para dar profundidad al canvas). Cero patrones, cero texturas, cero ilustraciones decorativas. El "fondo" más complejo es la grilla técnica del visor (`linear-gradient` 24×24 con opacidad 0.025).

**Animaciones:** mínimas y funcionales. `transition: 100ms ease` en hover de filas/botones, `120ms` en switches. Tooltips con `300ms` de delay antes de aparecer. **Sin bounces, sin springs, sin parallax, sin entradas dramáticas.** El visor 3D tiene rotación lenta solo como placeholder de design system; el real es controlado por el usuario.

**Hover:** el fondo cambia de `bg-surface` o transparente → `bg-surface-hover` (`#3E3E42`). El texto secundario sube a primario. Sin opacidades, sin scales.

**Press / active:** sin shrinks. Sólo cambio de color (botón primario: `accent` → `accent-hover`, levemente más oscuro). Filas seleccionadas usan fondo `accent-subtle` (`#1C3A5E`) con texto blanco — sin borde lateral coloreado.

**Borders:** todo es `1px solid` en `--border-default` (`#3E3E42`) o `--border-subtle` (`#2D2D30`). Inputs en focus cambian a `--border-focus` (`#0078D4`). **Las zonas del layout (header / sidebar / main / viewer) están separadas únicamente por bordes 1px** — no hay sombras entre zonas.

**Shadows:** dos niveles, sólo para elementos elevados:
- `shadow-elevated`: `0 4px 12px rgba(0,0,0,0.5)` — tooltips, dropdowns, popovers, toolbar flotante del visor.
- `shadow-modal`: `0 8px 32px rgba(0,0,0,0.6)` — modales sobre scrim.
Los paneles principales son **flush** (sin sombra, sin radius).

**Transparencia y blur:** sólo en la toolbar flotante del visor 3D (`rgba(37,37,38,0.9)` + `backdrop-filter: blur(6px)`) para mantener legibilidad sobre el canvas. En el resto, ninguna superficie es translúcida — es software técnico, no glassmorphism.

**Layout fijo:** header siempre visible (48px), sidebar siempre 56px, panel de detalle anclado al fondo. El visor 3D es la única zona redimensionable + colapsable. La app es **desktop-first sin responsive** — diseñar para 1440px, soportar mínimo 1280px.

**Border-radius:** 4px botones/inputs/chips/tooltips · 6px modales · **0px paneles principales**. Las zonas del layout son flush; nada flota dentro del chrome de la app.

**Cards:** prácticamente no existen como concepto. Todo es zona/panel con borde 1px. Los únicos "cards" son las tarjetas de exportación en la sección Informes (rectángulos `bg-surface` con borde 1px, padding 24px, radius 0).

**Imagery:** la app no usa fotografía ni ilustración. La única imagen es el modelo 3D del usuario, renderizado por @thatopen/components sobre el canvas. Color vibe del visor: frío, monocromo, líneas finas en `accent` para selección.

---

## Iconography

**Set propio.** No FontAwesome, no Material Icons, no emoji. Está en `assets/icons/` (37 SVGs).

**Estilo:** monoline, `stroke-width: 1.5px`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Sin rellenos sólidos excepto puntos centrales en `icon_warning`, `icon_info`, etc. Geometría limpia, técnica, sin detalles decorativos.

**Colores aplicados via CSS:** `#9D9D9D` inactivo · `#CCCCCC` hover · `#0078D4` activo. Nunca se hardcodea color en el SVG.

**Tamaños:** 24px sidebar · 20px header · 16px botones primarios · 14px botones secundarios e inline.

**Uso:** importar via CSS `mask-image` o inline. Para componentes JSX se usa `<Icon name="..." size={...} />` (`ui_kits/cost-mapper-app/Icon.jsx`).

**Inventario MVP (22 íconos del spec + 15 de soporte):** sidebar (catalog/budget/mapping/library/reports/settings) · acciones (search/filter/sort/chevrons/close/check/check_double/warning/info/import/export/edit/save/add/delete/pin) · visor 3D (orbit/zoom_extents/reset/wireframe) · estructurales (folder/file_ifc/logo/menu/user/resize_horiz).

**Sin emoji, sin unicode glyphs como íconos.** Si una situación necesita un símbolo nuevo, se agrega un SVG al set siguiendo el spec.

---

## Caveats / substitutions

- **Fuentes:** Inter y JetBrains Mono se cargan vía Google Fonts CDN (sin licencia, gratuitas). No se descargaron `.ttf` locales — si se necesita offline, descargar de [Google Fonts](https://fonts.google.com/specimen/Inter) y dejar en `fonts/`.
- **Visor 3D:** la implementación real usa `@thatopen/components`. El UI kit muestra un cubo CSS animado como placeholder visual.
- **Modelo de datos:** los precios y descripciones de los APU son de muestra; ver `cost-mapper/docs/MODELO-DE-DATOS.md` y `cost-mapper/docs/TCPO-V15-DATABASE.md` para esquemas reales.

---

## Quick start

```html
<link rel="stylesheet" href="theme.css">
<!-- Tipografía vía Google Fonts ya importada en theme.css -->

<!-- Para íconos en HTML estático: -->
<img src="assets/icons/icon_budget.svg" width="20" height="20" style="filter: invert(78%);" alt="">

<!-- Para React/JSX, ver ui_kits/cost-mapper-app/Icon.jsx -->
```
