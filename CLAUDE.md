# CLAUDE.md — Punto de entrada para agentes de IA

> **Este archivo va en la raíz del repositorio de código.** Todo agente de IA (Claude Code, Copilot, Cursor) debe leerlo antes de proponer cualquier cambio. Es el briefing operativo del proyecto.

---

## ¿Qué es Cost-Mapper?

Cost-Mapper es una aplicación web open source de gestión de costos BIM para el mercado paraguayo. Vincula modelos IFC 3D con presupuestos de construcción usando el estándar de clasificación NBR 15965 como puente entre el modelo y el catálogo de ítems. El catálogo base proviene de la TCPO V15 (Tabela de Composições de Preços) adaptada al mercado local con precios de Mandu'a en Guaraníes.

El sistema permite: importar un modelo IFC de Revit → mapear elementos 3D a ítems del catálogo → calcular el presupuesto automáticamente con sus APUs → exportar el informe. Toda la cadena usa estándares Open BIM (IFC, NBR 15965, bSDD) sin dependencia de software propietario.

---

## Leer antes de tocar código

Los ADRs son la razón de por qué el sistema es como es. Un cambio que contradiga un ADR sin revisarlo primero es un error. Leer en este orden:

| ADR | Tema | Por qué importa |
|-----|------|-----------------|
| ADR-001 | UUIDs y sistema de identificación | Explica por qué `catalog_items.id` es un UUID NBR, no un autoincremental |
| ADR-002 | Estrategia de datos TCPO V14 → V15 | Explica el pipeline ETL y por qué la clasificación es semántica con IA |
| ADR-003 | Extracción del PDF TCPO V15 | Explica el estado real de los datos disponibles — crítico antes de tocar scripts ETL |
| ADR-004 | Flujo de trabajo IFC | Explica todo el ciclo importación → mapeo → presupuesto y los dos módulos críticos |
| ADR-005 | Formatos de exportación | Explica qué formatos hay en MVP y cuáles son post-MVP |
| ADR-006 | Extensibilidad y documentación | Explica este archivo, el DEVLOG y las reglas de módulo |

Todos en: `docs/DUDAS.md`

---

## Estructura del repositorio

```
cost-mapper/
├── CLAUDE.md              ← estás aquí
├── CONTRIBUTING.md        ← cómo configurar el entorno y hacer PRs
├── DEVLOG.md              ← log cronológico de sesiones — leer para saber qué pasó último
├── README.md
│
├── docs/                  ← documentación del proyecto (no tocar sin leer el ADR correspondiente)
│   ├── DUDAS.md           ← ADRs — decisiones de arquitectura
│   ├── MODELO-DE-DATOS.md ← schema PostgreSQL completo
│   ├── ARQUITECTURA.md    ← módulos del sistema y sus contratos
│   ├── STACK-TECNOLOGICO.md
│   ├── INTERFAZ.md        ← decisiones UX/UI
│   ├── TCPO-V15-DATABASE.md ← estado real de los datos y estrategias de clasificación
│   └── ...
│
├── backend/               ← Python 3.11+ · FastAPI
│   ├── main.py            ← entrypoint FastAPI
│   ├── catalog/           ← módulo catálogo (catalog_items, apu_components)
│   ├── ifc_importer/      ← módulo ingesta IFC (ifcopenshell)
│   ├── mapper/            ← módulo asignación GlobalId → ítem
│   ├── budget/            ← módulo cálculo de presupuesto
│   ├── library/           ← módulo biblioteca + keynote file
│   ├── exporter/          ← módulo exportación PDF/Excel
│   ├── db/                ← conexión PostgreSQL, modelos SQLAlchemy
│   └── tests/             ← pytest
│
├── frontend/              ← TypeScript · React · Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── catalog_panel/
│   │   │   ├── ifc_viewer/    ← @thatopen/components
│   │   │   ├── mapping_panel/
│   │   │   ├── budget_panel/
│   │   │   ├── library_panel/
│   │   │   ├── reports_panel/
│   │   │   └── shared/        ← componentes reutilizables (tabla, panel detalle, etc.)
│   │   ├── hooks/
│   │   ├── api/               ← cliente HTTP hacia el backend
│   │   └── types/             ← tipos TypeScript que reflejan el modelo de datos
│   └── tests/                 ← Playwright E2E
│
├── scripts/               ← pipeline ETL (corren offline, no son parte del servidor)
│   ├── 01_init_db.py      ← crea el schema PostgreSQL
│   ├── 02_cargar_mandua.py
│   ← 03_cargar_tcpo.py
│   ├── 04_traducir.py     ← Gemini API, cachéa por MD5
│   └── 05_clasificar.py   ← clasificación NBR con IA
│
└── ai-skills/             ← prompts para agentes de IA (se agregan junto con el código)
    └── add-export-format.md  ← primer skill (cuando se implemente el exportador)
```

---

## Reglas de módulo — no romper

Estas reglas están en `docs/ARQUITECTURA.md` sección "Reglas de módulo". Resumen:

1. **Ningún módulo escribe en la tabla de otro.** `budget/` no escribe en `project_assignments`. `ifc_importer/` no escribe en `catalog_items`. Las fronteras son estrictas.
2. **Las cantidades geométricas no se persisten en la DB.** Se calculan en runtime con `ifcopenshell` y se pasan en memoria.
3. **El módulo `catalog/` es el único que escribe en `catalog_items`.** Cualquier UPDATE de precio, fuente o descripción pasa por este módulo.
4. **Los módulos de frontend no tienen lógica de negocio.** Formatean datos y llaman endpoints. El cálculo ocurre en el backend.

---

## Protocolo de control de versiones — no omitir

Este protocolo existe porque en V0 se perdió una semana de trabajo por una operación de "backup" que no llegó a GitHub (ADR-008). Las reglas son obligatorias al mismo nivel que las reglas de módulo.

**Regla central: push = guardado real.** Un commit que solo existe en el disco local no cuenta. El único estado que importa es el que aparece en `github.com`.

**Regla de lenguaje:** la palabra "backup" en este proyecto siempre significa `commit + push a GitHub`. Nunca significa copia de carpeta local.

**Fin de cada sesión de trabajo:**
```bash
git add -A
git commit -m "tipo: descripción de lo que se hizo"
git push
```
No existe terminar una sesión sin pushear. Si el trabajo está incompleto, se commitea igual con un mensaje que lo indique.

**Antes de cualquier operación riesgosa** (renombrar el proyecto, reestructurar carpetas, borrar archivos en masa, cambiar configuración de git):

1. Hacer commit y push de todo lo que existe.
2. Reportar al usuario el mensaje exacto del último commit visible en GitHub: `"Hice push. El último commit en github.com/[usuario]/[repo] dice: '[mensaje]'. Podés verificarlo antes de continuar."`
3. Esperar confirmación explícita del usuario.
4. Recién entonces ejecutar la operación.

**Verificación que el usuario puede hacer sin saber git:** entrar a `github.com/[usuario]/cost-mapper` en el navegador. Si el último commit en la lista refleja la sesión actual, el trabajo está seguro. Si el último commit es de hace días, el push no llegó.

---

## Convenciones de código

**Estructura de módulos backend (5 archivos fijos):**

Cada módulo en `backend/<modulo>/` tiene exactamente estos 5 archivos:

```
router.py       ← rutas FastAPI. No llama repository directamente.
service.py      ← lógica de negocio. Llama a repository.
models.py       ← tablas SQLAlchemy que este módulo posee.
repository.py   ← queries DB. Sin lógica de negocio.
schemas.py      ← Pydantic request/response. No importa models.py.
```

Ver `docs/ARQUITECTURA.md` sección 2.7 para detalle y ejemplo.

**Python (backend + scripts):**
- Estilo: PEP 8, formateado con `black`
- Docstrings: Google style
- Tipos: tipado con `mypy`, sin `Any` salvo justificación explícita
- Nombres: `snake_case` para funciones y variables, `PascalCase` para clases

**TypeScript (frontend):**
- Documentación: JSDoc en todas las funciones exportadas
- Nombres: `camelCase` para funciones y variables, `PascalCase` para componentes y tipos
- Componentes: funcionales con hooks, sin clases
- Sin `any`: usar tipos explícitos o `unknown`

**Commits:**
```
tipo: descripción corta en imperativo

Explicación del por qué si no es obvio.
Referencia al ADR si aplica.
```
Tipos: `feat` · `fix` · `refactor` · `docs` · `test` · `chore`

---

## Archivos que NO tocar sin leer el ADR correspondiente

| Archivo / carpeta | ADR a leer primero | Razón |
|-------------------|--------------------|-------|
| `backend/db/` · schema PostgreSQL | ADR-001, MODELO-DE-DATOS.md | Los UUIDs y FKs tienen decisiones no obvias |
| `scripts/03_cargar_tcpo.py` | ADR-002, ADR-003 | El formato VOLARE V14 tiene particularidades documentadas |
| `scripts/04_traducir.py` · `05_clasificar.py` | ADR-002 | La estrategia de clasificación semántica está documentada — no cambiar el enfoque sin revisarla |
| `backend/ifc_importer/` | ADR-004 | El flujo de ingesta IFC tiene reglas de sincronización en reimportaciones |
| `backend/mapper/` | ADR-004 | La lógica de `classification_source` determina el comportamiento en reimportaciones |
| `docs/DUDAS.md` | — | Solo agregar ADRs nuevos o actualizar el estado. No editar decisiones ya aceptadas sin consenso. |
| `.git/` · operaciones de historial | ADR-008 | Nunca reescribir historial (`rebase -i`, `push --force`, `reset --hard` con commits pusheados). Ver protocolo de git arriba. |

---

## Cómo correr el proyecto

```bash
# 1. Base de datos (primera vez: crea schema completo)
python scripts/01_init_db.py

# 1b. Migraciones incrementales (instancias ya desplegadas)
alembic upgrade head
# La primera migración es un no-op (baseline). Las siguientes aplican cambios de schema.
# Ver docs/ARQUITECTURA.md sección 2.8 para el patrón completo.

# 2. Pipeline ETL (primera vez)
python scripts/02_cargar_mandua.py
python scripts/03_cargar_tcpo.py
python scripts/04_traducir.py
python scripts/05_clasificar.py

# 3. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs

# 4. Frontend
cd frontend
npm install
npm run dev
# App en http://localhost:5173

# 5. Tests
cd backend && pytest
cd frontend && npx playwright test
```

---

## Antes de hacer un PR

1. Leer el `DEVLOG.md` para saber el estado actual del proyecto.
2. Correr los tests: `pytest` en backend, `playwright test` en frontend.
3. Verificar que no se rompen las reglas de módulo.
4. Si se cambia una decisión de diseño: actualizar el ADR correspondiente en `docs/DUDAS.md`.
5. Agregar una entrada al `DEVLOG.md` con qué cambió y por qué.
