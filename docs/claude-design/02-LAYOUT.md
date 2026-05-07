# Layout — Estructura general de la aplicación

> Describe las 4 zonas fijas de la interfaz, sus dimensiones, comportamiento y reglas de coexistencia.

---

## Vista general del layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  [≡] Cost-Mapper    [▼ Nombre del proyecto ▼]        [usuario]  [⚙] │  ← HEADER (48px)
├────┬─────────────────────────────────────────────────────────────────┤
│    │                                                                 │
│    │                                                                 │
│  S │                                                                 │
│  I │                                                                 │
│  D │                     ÁREA PRINCIPAL                              │
│  E │               (Ocupa todo el resto de la pantalla)              │
│  B │                                                                 │
│  A │                                                                 │
│  R │                                                                 │
│    │                                                                 │
│    │                                                                 │
└────┴─────────────────────────────────────────────────────────────────┘
56px
```

---

## Zona 1: Header

**Altura:** 48px fija. Siempre visible, nunca se oculta.

**Color de fondo:** `#252526` (bg-surface), con borde inferior `1px solid #3E3E42`.

**Estructura interna (de izquierda a derecha):**

```
[≡ Logo] [Cost-Mapper]        [▼ Nombre del proyecto activo ▼]        [Avatar usuario] [⚙]
  ←── izquierda ──────────────── centro ─────────────────────────── derecha →
```

**Zona izquierda:**
- Ícono de logo (el ícono oficial de Cost-Mapper, 24×24px) + wordmark "Cost-Mapper" en `text-primary`, peso 600, 14px.
- Padding izquierdo: 16px desde el borde del sidebar.

**Zona central:**
- Selector de proyecto activo. Componente tipo dropdown con:
  - Ícono de carpeta a la izquierda
  - Nombre del proyecto en `text-primary` (14px, peso 500)
  - Ubicación del proyecto en `text-secondary` (12px)
  - Chevron ▼ a la derecha
  - Al hacer clic, despliega lista de proyectos del usuario + opción "Nuevo proyecto +" al final
- El selector está centrado horizontalmente en el header (no alineado a ningún extremo).

**Zona derecha:**
- Avatar del usuario (círculo 28px con iniciales si no hay foto) + nombre en `text-secondary` (12px)
- Botón de ajustes ⚙ (ícono 20px, sin label)
- Padding derecho: 16px

**Comportamiento del selector de proyecto:**
- Cambiar de proyecto limpia el visor 3D y colapsa el panel de detalle
- La sección activa en el sidebar no cambia al cambiar de proyecto
- Si no hay proyectos, el selector muestra "Sin proyecto — Crear uno" y al hacer clic abre el formulario de nuevo proyecto

---

## Zona 2: Sidebar de navegación

**Ancho:** 56px. Fijo, no redimensionable, no colapsable.

**Color de fondo:** `#252526` (bg-surface), con borde derecho `1px solid #3E3E42`.

**Contenido:** 6 íconos de navegación apilados verticalmente, alineados al centro horizontal.

**Espaciado entre íconos:** 8px entre cada uno.

**Padding superior:** 16px desde el header.

**Comportamiento de cada ícono:**
- **Estado inactivo:** ícono en `#9D9D9D`, sin fondo
- **Estado hover:** ícono en `#CCCCCC`, fondo circular de 40×40px en `#3E3E42`
- **Estado activo (sección seleccionada):** ícono en `#0078D4`, fondo de "pastilla" 4×40px en `#0078D4` adosado al borde derecho (igual que VS Code), ícono en blanco

**Tooltip al hacer hover:** aparece a la derecha del sidebar, en `#2D2D30` con texto en `#CCCCCC`, border-radius 4px, aparece con 300ms de delay.

**Orden de íconos (de arriba a abajo):**
1. Catálogo
2. Presupuesto
3. Mapeo IFC
4. Biblioteca
5. Informes
6. (spacer flexible)
7. Ajustes (anclado al fondo)

---

## Zona 3: Área principal

**Ancho:** 100% del espacio restante. Ocupa todo el espacio a la derecha del sidebar.

**Color de fondo:** `#1E1E1E` (bg-base).

**Contenido:** cambia completamente al cambiar la sección del sidebar. 

## Zonas dinámicas (Visor 3D y Panel de Detalle)

Originalmente planteados como zonas globales, el feedback de diseño y UX determinó que **el Visor 3D y el Panel de Detalle deben ser componentes estrictamente confinados a las secciones que los necesitan** para evitar sobrecarga visual y el síndrome de "paneles escondidos".

**Ubicación Estricta:**
- El **Visor 3D** SOLO existe dentro de la sección "Mapeo IFC".
- El **Panel de Detalle APU** SOLO existe en la sección "Catálogo" y "Mapeo IFC".
- Para más detalles sobre cómo se estructuran estas vistas divididas internamente, referirse a `03-SECCIONES.md`.

**Estructura interna de cada sección:**
```
[Título de sección + controles (filtros, búsqueda, acciones)]  ← barra de controles (~48px)
[─────────────────────────────────────────────────────────────]
[                                                             ]
[           Contenido principal (tabla / pantalla)           ]
[                                                             ]
```

---



## Comportamiento responsive del layout

La app es **desktop-first y no tiene versión móvil en MVP**. Esto libera al diseño de compromisos de responsive. Sin embargo:

- A 1280px de ancho: el visor 3D puede reducirse a 280px o colapsar automáticamente si el usuario no lo ha usado
- A 1440px: layout completo como se describe arriba
- A 1920px: el área principal gana más ancho; el visor 3D puede crecer opcionalmente
- No hay cambios de layout por debajo de 1280px — simplemente aparece scroll horizontal

---

## Separaciones y jerarquía visual entre zonas

Las zonas están delimitadas **únicamente por bordes de 1px** en `#3E3E42`. No hay sombras entre zonas — el sistema es flat, con diferencia de valor de fondo mínima para crear jerarquía visual sin ruido.

```
bg-base (#1E1E1E)    → área principal, visor 3D
bg-surface (#252526) → sidebar, header, panel de detalle
```
El contraste entre `#1E1E1E` y `#252526` es suficiente para separar las zonas sin borde.
