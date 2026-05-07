# DEVLOG — Cost-Mapper V2

> **Propósito de este archivo:** Log cronológico de sesiones de trabajo. Al final de cada sesión se agrega una entrada con la fecha, qué se implementó o decidió, qué problemas aparecieron y cuál es el siguiente paso concreto. No es un documento formal — es el puente entre sesiones para que cualquier agente (o colaborador) sepa exactamente dónde quedó el proyecto sin tener que releer todo.
>
> **Formato de entrada:** fecha y hora (ej: `## 2026-05-06 14:30 — Titulo`) · implementado · problemas · decisiones cambiadas · próximo paso.

---

## 2026-05-06 23:56 — Creación de Skill de Auditoría (Inspector)

**Implementado:**
- Creación de una nueva skill de IA especializada en auditoría de código y documentación (`.agents/skills/cost-mapper-inspector/SKILL.md`).
- Esta skill actúa como un "Fiscal / QA Senior" enfocado exclusivamente en encontrar incongruencias arquitectónicas, enlaces rotos y deuda técnica sin modificar código.
- Actualización de `CLAUDE.md` estableciendo explícitamente el concepto de "Roles de Agente IA". El agente por defecto es "Constructor", pero el usuario puede invocar al "Inspector" a demanda.

**Problemas resueltos:**
- Reducción del uso innecesario de la ventana de contexto. Al separar la responsabilidad de auditoría en una skill opcional invocada manualmente, el agente constructor no malgasta tokens analizando todo el workspace continuamente.

**Próximo paso:** Arrancar el desarrollo del Frontend y la integración con Claude Design, o ejecutar el Inspector si se requiere una auditoría profunda.

---

## 2026-05-06 23:45 — Refactorización de Layout UI e Integración de Sistema de Diseño

**Implementado:**
- Eliminación de la arquitectura de "Paneles Globales Colapsables" (herencia de un prototipo antiguo) en favor de una arquitectura de "Vistas Dedicadas" (`docs/claude-design/02-LAYOUT.md`, `03-SECCIONES.md`, `INTERFAZ.md`).
- Asignación estricta de componentes pesados: El Visor 3D y el Panel Inspector APU ahora solo existen en las vistas que realmente lo requieren (Catálogo y Mapeo IFC). La vista Presupuesto se liberó de paneles extra para actuar como un Dashboard expansivo limpio al 100%.
- Agregada la columna "Fuente del Coeficiente" a la especificación de la tabla APU en `04-COMPONENTES.md`.
- Inclusión del requerimiento de un mockup PDF del presupuesto en la sección de Informes.
- Descompresión e integración del primer archivo entregable generado por Claude Design (`Cost-Mapper Design System.zip`) dentro de `docs/design-system/`.
- Actualización de `CLAUDE.md` estableciendo el "Flujo de Trabajo: Sistema de Diseño", marcando el directorio como de Solo Lectura para los agentes, y exigiendo documentar el *Feedback Loop* de implementación.

**Problemas resueltos:**
- Prevención del "síndrome de paneles escondidos" que saturaba visualmente la aplicación.

**Decisiones cambiadas:**
- Cambio del layout general de la aplicación.
- El repositorio ahora alberga una carpeta `docs/design-system/` estática que funciona como referencia visual/arquitectónica estricta, pero separada del código de producción React en `frontend/`.

**Próximo paso:** Entregar a Claude Design el último set de requerimientos actualizados (paneles estrictos, tabla APU, mockup PDF). Una vez que Claude Design genere el nuevo `.zip`, procederemos a la construcción del `frontend/` en React/Vite consumiendo esos mockups como referencia, y conectando con el backend de Catálogo que ya está vivo.

---

## 2026-05-06 21:45 — Implementación del módulo catalog y carga de datos NBR

**Implementado:**
- Módulo `catalog/` desarrollado bajo el patrón SQLModel (ADR-009). Creados `models.py`, `repository.py`, `service.py`, y `router.py`.
- Base de datos configurada por defecto en SQLite para facilitar el desarrollo inmediato, con soporte para PostgreSQL en producción (`.env.example`).
- Tests unitarios de catálogo (11/11 pasando) que cubren búsqueda, paginación, edición de precios y detalle de APU.
- Creación de dos scripts de carga de datos (`seed.py` y `seed_nbr.py`):
  - Carga manual de 4 APUs y 15 componentes extraídos de una página de la TCPO (Canteiro de obras).
  - Carga automática de más de 10,000 ítems en portugués a partir de los 5 archivos Excel de la ABNT NBR 15965.
- Actualización de las reglas del `DEVLOG.md` y `CLAUDE.md` para incluir de forma obligatoria la hora exacta en los cierres de sesión para evitar pérdida de orden cronológico.

**Problemas resueltos:**
- Prevención de lock de archivo de SQLite en Windows utilizando `SQLModel.metadata.drop_all()` en vez de borrar el archivo.
- Falta de orden cronológico preciso en el DEVLOG corregido (se agregó formato de hora).

**Decisiones cambiadas:**
- Se mantiene el idioma portugués puro en la base de datos por ahora para facilitar las pruebas funcionales. La traducción se abordará posteriormente.

**Próximo paso:** Cerrar sesión (commit + push). Para la próxima sesión, conectar el Frontend con los endpoints de este módulo `catalog/` para que el usuario pueda explorar la base de 10,000 ítems desde la interfaz gráfica.

---

## 2026-05-06 19:45 — Reorganización de ADRs y refactoring del flujo de agentes IA

**Implementado:**
- Migración de ADRs: `docs/DUDAS.md` (47KB, 611 líneas) → `docs/adrs/` (9 archivos individuales + README índice). Cada ADR ahora es un `.md` separado, más eficiente para que los agentes lean solo lo que necesitan.
- ADR-009 (SQLModel) movido de la raíz del repo a `docs/adrs/ADR-009.md` y registrado en el índice.
- Análisis completo del flujo de trabajo de agentes de IA: identificados 6 problemas de coherencia entre `CLAUDE.md` y `SKILL.md`.
- Refactoring de `CLAUDE.md`: agregadas secciones "Al inicio de cada sesión" y "Cierre de sesión — protocolo obligatorio" con tabla de coherencia de documentación. Ahora cualquier agente (no solo Antigravity) tiene las instrucciones completas.
- Refactoring de `SKILL.md`: eliminada duplicación de contenido (197 → 134 líneas). Las secciones duplicadas ahora referencian a `CLAUDE.md` como fuente de verdad.
- Actualización de 14 referencias a `DUDAS.md` en 8 archivos del repositorio.
- Eliminados archivos huérfanos: `ADR-009-SQLModel.md` (raíz), `CIERRE-SESION-2026-05-06.md`.

**Problemas resueltos:**
- El protocolo de cierre de sesión solo existía en `SKILL.md` (invisible para Claude Code, Copilot, Cursor). Movido a `CLAUDE.md`.
- `CLAUDE.md` no indicaba leer `DEVLOG.md` al inicio de sesión. Corregido con nueva sección.

**Decisiones cambiadas:**
- ADRs migrados de archivo monolítico a carpeta con archivos individuales (`docs/adrs/`).
- `CLAUDE.md` es ahora la fuente de verdad universal; `SKILL.md` es el amplificador.

**Próximo paso:** Revisar y aprobar ADR-009 (migración a SQLModel), luego implementar módulo `catalog/` como piloto.

---

## 2026-05-06 18:30 — Decisión de repositorio y protocolo de git

**Implementado:**
- `docs/adrs/ADR-008.md` — estrategia de repositorio y protocolo de control de versiones. Documenta la causa raíz de la pérdida de trabajo en V0 y las reglas obligatorias para evitar que se repita.
- `CLAUDE.md` — sección "Protocolo de control de versiones" agregada. Define la regla central (push = guardado real), el protocolo para operaciones riesgosas y cómo el usuario puede verificar el estado del repositorio sin saber git.
- `CLAUDE.md` — tabla "Archivos que NO tocar" actualizada con fila para `.git/` referenciando ADR-008.

**Decisión: repositorio nuevo para V2**

Se crea un repositorio nuevo en GitHub para V2. No se reutiliza el repositorio de V0. Razones: historial limpio, libertad de nombre, sin contaminación de código viejo, más simple de gestionar.

El repositorio de V0 no se borra: se archiva con la función "Archive repository" de GitHub (Settings → General → Danger Zone → Archive this repository). Esto lo convierte en solo lectura con un badge "Archived" visible. Todo el historial queda disponible como referencia permanente. La operación de archivo es reversible y no requiere saber git — es una acción en la interfaz web de GitHub.

**Problema documentado (causa V0):**
La frase "crear un backup" fue interpretada por el agente como copia de carpeta local, no como commit+push. El repositorio remoto no recibió nada. Cuando la operación falló, el "backup" disponible era el último push real, con una semana de antigüedad.

**Próximo paso:** crear el repositorio nuevo en GitHub, hacer el primer commit con la estructura de carpetas vacía (como describe CLAUDE.md), y archivar el repositorio de V0.

---

## 2026-05-06 — Sesión de análisis OCE y actualización de documentos

**Implementado:**
- `LECCIONES-OCE.md` — análisis completo del repositorio OpenConstructionERP (OCE v2.7.0, AGPL-3.0). 11 secciones cubriendo: esquema BIMElement, detección de cambios con geometry_hash, BOQMarkup (markup de presupuesto), precisión decimal, concurrencia optimista, APU como JSON vs relacional, estructura de 5 archivos por módulo, patrón Alembic baseline, limpieza de huérfanos y event bus.
- `MODELO-DE-DATOS.md` — 6 cambios concretos aplicados:
  1. Mapa de entidades actualizado con nodo `project_markups`
  2. `ifc_elements`: agregado campo `geometry_hash TEXT` para detección rápida de cambios cualitativos
  3. `project_assignments`: agregados `confidence DECIMAL(5,2)` y `qualitative_snapshot_at_assignment JSONB`
  4. Nueva sección 7: tabla `project_markups` completa (GG, utilidad, IVA con `apply_to = cumulative`)
  5. Secciones renumeradas (8–12), query de detección de conflicto corregida
  6. Índice `idx_markups_project` agregado en sección de índices
- `ARQUITECTURA.md` — agregadas secciones 2.7 (convención 5-archivos por módulo) y 2.8 (estrategia Alembic baseline)
- `CLAUDE.md` — convención de 5 archivos documentada en sección de convenciones; Alembic agregado en "Cómo correr el proyecto"

**Problemas resueltos:**
- `qualitative_snapshot_at_assignment` estaba referenciado en la query SQL de detección de conflictos pero **nunca definido** en el schema de `project_assignments`. Bug encontrado al revisar el MODELO-DE-DATOS.md antes de editar. Resuelto: campo agregado.
- Presupuesto sin mecanismo para GG/IVA/utilidad. Resuelto: tabla `project_markups` con `apply_to = "direct_cost" | "cumulative"` permite modelar el esquema paraguayo típico (GG 12%, utilidad 10%, IVA 10% sobre el total con GG+utilidad).

**Decisiones tomadas:**
- **Se adopta la convención de 5 archivos de OCE** (router/service/models/repository/schemas) como convención obligatoria del proyecto. Justificación: permite a cualquier agente o desarrollador encontrar el código relevante sin explorar el árbol completo.
- **Se adopta el patrón Alembic baseline**: primera migración es no-op, `01_init_db.py` crea el schema inicial. Los dos coexisten sin conflicto.
- **Se adopta `geometry_hash`** de OCE para detección rápida de cambios en reimportación: comparar un MD5 de string es más eficiente que comparar dos JSONB completos.
- **No se adopta** la serialización de dinero como String (OCE usa esto para evitar problemas con SQLite). PostgreSQL `DECIMAL(14,2)` es preciso en servidor; la frontera a vigilar es la serialización JSON hacia el frontend (usar string en la API, no float).
- **No se adopta** concurrencia optimista (campo `version`) en MVP — asumimos usuario único o equipo muy pequeño. Se agrega en post-MVP si aparecen conflictos de escritura.

**Próximo paso:** diseño de interfaz con Claude Design (leer `INTERFAZ.md` + `STACK-TECNOLOGICO.md` antes de iniciar). Luego: inicialización del repositorio de código y primer commit con la estructura de carpetas del `CLAUDE.md`.

---

## 2026-05-06 — Sesión de documentación inicial

**Implementado:**
- `MODELO-DE-DATOS.md` — schema PostgreSQL completo: tablas `catalog_items`, `apu_components`, `projects`, `project_library`, `ifc_elements`, `project_assignments`, `project_phases`, `users`. Índices, queries de referencia y sección explícita de "qué no está en el modelo".
- `ARQUITECTURA.md` — módulos del backend (catalog, ifc_importer, mapper, budget, library, exporter), módulos del frontend, flujos principales A–D, reglas de módulo.
- `STACK-TECNOLOGICO.md` — justificación de cada tecnología: Python/FastAPI/ifcopenshell/PostgreSQL/Gemini (ETL) + TypeScript/React/@thatopen/Playwright. Sección "lo que no está decidido todavía" (ORM, hosting, auth, gestor JS).
- `INTERFAZ.md` — layout de 4 zonas (sidebar iconos · área principal · visor 3D derecho · panel de detalle inferior), header, navegación sidebar (6 secciones sin etiquetas de texto), las 6 secciones completas (Catálogo, Presupuesto, Mapeo IFC, Biblioteca, Informes, Ajustes), panel de detalle, visor 3D, 4 decisiones UX documentadas, sección 13 de iconografía (set SVG monoline para Claude Design).
- `CLAUDE.md` — archivo de entrada para agentes de IA: descripción del proyecto, tabla de ADRs, estructura del repositorio, reglas de módulo, convenciones de código, archivos protegidos, comandos para correr el proyecto.
- `docs/adrs/ADR-005.md` (actualización) — ADR-005 cerrado como Aceptado. Registro de documentos completados.

**Problemas resueltos:**
- `unit_price` referenciado en la query APU pero ausente del schema `catalog_items`. Resuelto: se agregó `unit_price DECIMAL(14,2)` y `currency TEXT` directamente en `catalog_items`. Los insumos (mano de obra, materiales, equipos) tienen precio propio en el catálogo — es el mismo ítem, no una tabla separada.
- Sistema de archivado/derivación de ítems: la FK UUID de `apu_components.component_id` apuntaría a ítems archivados. Resuelto descartando el archivado completamente.

**Decisiones cambiadas:**
- **Se descartó el historial de versiones y el archivado de ítems.** Los ítems son editables en place. El UUID nunca cambia; las FKs de APU se mantienen válidas automáticamente. El campo `modificado_por` es el único rastro de edición. Si en el futuro se necesita historial, se agrega un nuevo ADR.
- **Panel de desglose APU va en la zona inferior** (no en el sidebar izquierdo como en V0). Soluciona el problema de compresión de columnas que tenía la V0.

**Próximo paso:** Diseño de interfaz con Claude Design (leer `INTERFAZ.md` + `STACK-TECNOLOGICO.md` antes de iniciar). Luego: inicialización del repositorio de código y primer commit con la estructura de carpetas del `CLAUDE.md`.
