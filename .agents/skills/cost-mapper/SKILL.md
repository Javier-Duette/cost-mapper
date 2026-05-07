---
name: cost-mapper
description: >
  Skill para trabajar en el proyecto Cost-Mapper V2 — aplicación web open source
  de gestión de costos BIM 5D para Paraguay (IFC → NBR 15965 → TCPO V15 → presupuesto).
  Activar siempre que el usuario trabaje en Cost-Mapper o mencione cualquiera de sus
  módulos (catalog, ifc_importer, mapper, budget, library, exporter), quiera tomar
  o documentar decisiones de arquitectura (ADRs), planificar el trabajo del día,
  cerrar una sesión de trabajo, mantener la documentación coherente con el código,
  o trabaje con IFC, NBR 15965, TCPO V15, presupuestos BIM, ifcopenshell, o la base
  de datos PostgreSQL del proyecto. También activar ante frases como "empecemos",
  "qué sigue", "cerremos la sesión", "documentá esta decisión", "qué falta",
  "cómo arranco hoy" o cualquier variación similar en el contexto de este proyecto.
---

# Cost-Mapper — Skill de sesión de trabajo

## Qué hace este skill

Orienta al agente en el estado actual del proyecto Cost-Mapper V2, guía el flujo
de trabajo documentación-primero, y asegura que cada sesión cierre con la documentación
actualizada y el trabajo guardado en GitHub.

---

## Al inicio de cada sesión

Antes de hacer cualquier otra cosa, leer estos dos archivos:

1. **`DEVLOG.md`** (raíz del repo) — la última entrada dice exactamente dónde quedó
   el proyecto. Esto reemplaza tener que releer toda la conversación anterior.
2. **`CLAUDE.md`** (raíz del repo) — reglas del proyecto, convenciones de código,
   módulos y protocolo de git.

Si el usuario menciona un módulo o decisión específica, leer también el ADR
correspondiente en `docs/adrs/`.

**Ruta del repo:** `D:\DRIVE-JAVIER\dev_workspace\cost-mapper\`

```
cost-mapper/
├── CLAUDE.md          ← reglas, convenciones, protocolo de git
├── DEVLOG.md          ← log cronológico — leer siempre primero
├── docs/              ← documentación técnica
│   ├── adrs/          ← ADRs (un .md por decisión de arquitectura)
│   ├── ARQUITECTURA.md
│   ├── MODELO-DE-DATOS.md
│   ├── STACK-TECNOLOGICO.md
│   └── INTERFAZ.md
├── backend/           ← Python · FastAPI · módulos
├── frontend/          ← TypeScript · React · @thatopen/components
└── scripts/           ← pipeline ETL (offline)
```

---

## Flujo de trabajo durante la sesión

El orden siempre es: **decisión → documentación → código → commit+push**.

Nunca escribir código que contradiga un ADR existente sin revisarlo antes.
Si una tarea implica un cambio arquitectónico, documentarlo **antes** de codificarlo.

### Para implementar algo nuevo:
1. Verificar que no contradiga ningún ADR en `docs/adrs/`
2. Si la decisión no está documentada → crear ADR (ver más abajo)
3. Implementar con la convención de 4 archivos por módulo (ADR-009)
4. Cerrar la sesión correctamente

### Para modificar algo existente:
1. Leer el ADR correspondiente si existe
2. Si el cambio contradice una decisión aceptada → crear un nuevo ADR que la reemplaza
   y marcar el anterior como `Superado`
3. Actualizar la documentación afectada antes del commit

---

## Crear o actualizar un ADR

Cuando se toma una decisión de arquitectura, crear un nuevo archivo `docs/adrs/ADR-0XX.md`
con esta estructura. El último ADR existente es el **ADR-009**; el siguiente es ADR-010.

```markdown
## ADR-00X — [Título de la decisión]

**Estado:** Propuesto | Aceptado | Superado
**Pregunta original:** ¿[La duda que generó la decisión]?

### Contexto
[Por qué surgió esta decisión. Qué alternativas se consideraron y descartaron.]

### Decisión
[Qué se decidió. Ser específico — no solo el qué sino el por qué.]

### Consecuencias
[Qué implica esta decisión. Qué queda pendiente o cambia en el resto del sistema.]
```

Agregar también la fila en la tabla "Registro de decisiones" en `docs/adrs/README.md`.

---

## Convención de archivos por módulo y reglas de módulo

Ver `CLAUDE.md` secciones "Convenciones de código" y "Reglas de módulo" para las reglas completas y actualizadas.

Resumen: cada módulo en `backend/<modulo>/` sigue una estructura fija de archivos. Ningún módulo escribe en la tabla de otro.

---

## Cierre de sesión

Ver `CLAUDE.md` sección "Cierre de sesión — protocolo obligatorio" para los 3 pasos completos:
1. Actualizar DEVLOG.md
2. Verificar coherencia de documentación
3. Commit + push

**Nunca terminar una sesión sin pushear.** Si el trabajo está incompleto, commitear igualmente.

---

## Referencia rápida de módulos

| Módulo | Responsabilidad | Tablas que toca |
|---|---|---|
| `catalog` | CRUD de ítems, APUs, búsqueda NBR | `catalog_items`, `apu_components` |
| `ifc_importer` | Ingesta IFC, extrae elementos y geometría | `ifc_elements` |
| `mapper` | Asigna GlobalId → ítem del catálogo | `project_assignments`, `ifc_elements` |
| `budget` | Calcula presupuesto (cantidades × precios) | solo lectura |
| `library` | Biblioteca del proyecto + keynote file | `project_library` |
| `exporter` | Genera PDF/Excel del presupuesto | solo lectura |

Ver `docs/ARQUITECTURA.md` para el detalle de entradas/salidas de cada módulo.
