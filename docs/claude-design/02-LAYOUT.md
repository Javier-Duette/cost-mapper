# Layout — Estructura general de la aplicación

> Describe las 4 zonas fijas de la interfaz, sus dimensiones, comportamiento y reglas de coexistencia.

---

## Vista general del layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  [≡] Cost-Mapper    [▼ Nombre del proyecto ▼]        [usuario]  [⚙] │  ← HEADER (48px)
├────┬────────────────────────────────────────┬─────────────────────── ┤
│    │                                        │                        │
│    │                                        │                        │
│  S │                                        │   VISOR 3D IFC         │
│  I │         ÁREA PRINCIPAL                 │   (@thatopen)          │
│  D │                                        │                        │
│  E │   (Catálogo / Presupuesto / Mapeo /    │   ~380px por defecto   │
│  B │    Biblioteca / Informes / Ajustes)    │   Redimensionable      │
│  A │                                        │   Colapsable           │
│  R ├────────────────────────────────────────┴────────────────────────┤
│    │  ↕  PANEL DE DETALLE                                            │
│    │     (colapsado: 32px · expandido: 280px · redimensionable)      │
└────┴────────────────────────────────────────────────────────────────-┘
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

**Ancho:** flexible. Ocupa todo el espacio entre el sidebar y el visor 3D.

**Color de fondo:** `#1E1E1E` (bg-base).

**Contenido:** cambia completamente al cambiar la sección del sidebar. Ver `03-SECCIONES.md` para el detalle de cada una.

**Cuando el visor 3D está oculto:** el área principal se expande hasta el borde derecho de la ventana.

**Estructura interna de cada sección:**
```
[Título de sección + controles (filtros, búsqueda, acciones)]  ← barra de controles (~48px)
[─────────────────────────────────────────────────────────────]
[                                                             ]
[           Contenido principal (tabla / pantalla)           ]
[                                                             ]
```

---

## Zona 4: Visor 3D IFC

**Ancho por defecto:** 380px.

**Redimensionable:** el usuario puede arrastrar el borde izquierdo del panel para cambiar el ancho. Mínimo 240px, máximo 50% del ancho disponible.

**Colapsable:** botón `◀` en el borde izquierdo del panel. Al hacer clic, el panel se oculta completamente y el área principal toma todo el ancho. El botón se convierte en `▶` adosado al borde derecho de la ventana. 
**Regla por Sección:** En la vista "Mapeo IFC", el visor inicia abierto por defecto. En "Presupuesto", "Catálogo" y las demás, **inicia colapsado por defecto** para evitar sobrecarga visual, abriéndose solo si el usuario hace clic en un ítem para inspeccionarlo en el modelo.

**Color de fondo:** `#1E1E1E` (mismo que el área principal — el visor llena el espacio).

**Estado sin modelo IFC:**
```
┌────────────────────────────────────┐
│                                    │
│         [ícono IFC vacío]          │
│                                    │
│    No hay modelo IFC cargado.      │
│                                    │
│    Importá uno desde la sección    │
│    "Mapeo IFC".                    │
│                                    │
└────────────────────────────────────┘
```
El ícono y el texto están centrados vertical y horizontalmente. Fondo: `#1E1E1E`.

**Controles del visor (cuando hay modelo cargado):**
- Toolbar flotante en la esquina inferior derecha del panel: 4 íconos — Orbitar · Zoom a extents · Reset vista · Toggle wireframe
- Los controles son compactos (24×24px) sobre un fondo semitransparente `rgba(37,37,38,0.8)`

---

## Zona 5: Panel de detalle

**Posición:** barra horizontal en la parte inferior, abarcando todo el ancho (sidebar + área principal + visor 3D).

**Estado colapsado:**
- Altura: 32px
- Muestra: ícono ↕ a la izquierda + nombre del ítem seleccionado en `text-secondary` + botón "expandir" a la derecha
- Al hacer clic en cualquier parte de la barra, se expande

**Estado expandido:**
- Altura por defecto: 280px
- Redimensionable verticalmente con drag en el borde superior
- Mínimo: 160px. Máximo: 50% del alto disponible
- Botón de pin (📌) en la barra: mantiene el panel expandido aunque se cambie de sección
- Botón de colapso (↓) en la barra: vuelve al estado de 32px

**Color de fondo del panel:** `#252526`, borde superior `1px solid #3E3E42`.

**Contenido:** varía según la sección activa. Ver `04-COMPONENTES.md` para el detalle del panel APU y el panel de elemento IFC.
**Regla por Sección:** Inicia colapsado en casi todas las secciones. Solo se expande automáticamente si el usuario hace un clic específico sobre un ítem en el Catálogo, Presupuesto o Mapeo IFC.

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
