# Stack Tecnológico — Cost-Mapper V2

> **Propósito de este documento:** Justificar cada tecnología del stack. No es una lista de herramientas — es el registro de por qué cada pieza fue elegida sobre las alternativas, de modo que cualquier desarrollador entienda las restricciones y pueda tomar decisiones coherentes al extender el sistema.
>
> **Documentos previos requeridos:** `ARQUITECTURA.md`, `docs/adrs/` (ADR-004, ADR-006), `LECCIONES-V0.md`

---

## Principios que guían la elección del stack

Antes de la lista, los filtros que se aplicaron a cada decisión:

1. **Open source y sin lock-in.** El producto es open source; el stack también debe serlo. Sin dependencias de servicios propietarios en el flujo principal.
2. **Comunidad activa en construcción/BIM.** Las librerías BIM tienen ciclos de cambio propios. Una librería abandonada en este dominio es un riesgo real.
3. **Coherencia con V0.** Si V0 demostró que algo funciona (Python para el pipeline, Gemini para traducciones), no se cambia sin razón técnica.
4. **Apto para estudiantes.** ADR-006 establece que el código debe ser modificable por estudiantes de ingeniería civil y arquitectura. El stack no puede requerir experiencia avanzada en DevOps para levantarlo localmente.

---

## Backend

### Python 3.11+

**Rol:** lenguaje del servidor (API) y de todos los scripts ETL del pipeline.

**Por qué Python:**
- `ifcopenshell` — la librería de referencia para procesamiento IFC — es Python nativa. No hay alternativa equivalente en otro lenguaje con el mismo nivel de madurez y soporte de la comunidad IFC.
- V0 ya tiene código Python de producción rescatable: scripts ETL, cliente Gemini, lógica de matching (`LECCIONES-V0.md` sección 7).
- Es el lenguaje más accesible para el perfil de estudiantes de ingeniería que quieran extender el proyecto.

**Alternativas descartadas:**
- Node.js/TypeScript para el backend: no tiene soporte nativo de `ifcopenshell`. Requeriría un microservicio Python de todos modos solo para el módulo IFC, añadiendo complejidad sin beneficio.

---

### FastAPI

**Rol:** framework del servidor REST API.

**Por qué FastAPI:**
- Tipado con Pydantic — los contratos entre módulos quedan expresados como tipos, no como diccionarios sin forma. Esto es clave para el requisito de ADR-006 de módulos con interfaces definidas.
- Documentación automática (Swagger UI) generada desde los tipos — un estudiante puede explorar todos los endpoints sin leer el código.
- Async nativo — necesario para manejar la subida y procesamiento de archivos IFC sin bloquear la API.
- Rendimiento suficiente para el caso de uso (no es un sistema de alta concurrencia en MVP).

**Alternativas descartadas:**
- Django: demasiado opinionated para una API pura, ORM propio agrega una capa extra sobre PostgreSQL.
- Flask: sin tipado nativo, la documentación hay que escribirla a mano.

---

### ifcopenshell

**Rol:** parsing de archivos IFC, extracción de elementos, cálculo de cantidades geométricas.

**Por qué ifcopenshell:**
- Es la implementación de referencia del estándar IFC en Python, mantenida activamente por la comunidad buildingSMART.
- Licencia LGPL — compatible con un producto open source.
- Soporta extracción de `BaseQuantities` y cálculo geométrico desde la malla — cubre el caso de modelos con y sin cantidades pre-calculadas en Revit.
- Software-agnóstico: acepta IFC generado por Revit, ArchiCAD, Allplan, FreeCAD sin configuración específica por software.

**No tiene alternativa real.** Es la herramienta estándar del ecosistema Open BIM para este propósito.

---

### PostgreSQL

**Rol:** base de datos principal del sistema.

**Por qué PostgreSQL:**
- Multi-usuario real: escrituras concurrentes con aislamiento ACID. SQLite (usado en V0) no soporta esto — fue la razón técnica del abandono del prototipo para producción (`LECCIONES-V0.md` sección 6).
- Soporte nativo de UUID como tipo, JSONB para `qualitative_snapshot`, índices parciales para filtros frecuentes (`WHERE bim_taggable = true`, `WHERE status = 'active'`).
- El schema de V0 (SQLite) es directamente portable a PostgreSQL con cambios mínimos de sintaxis.
- Open source, sin costo de licencia, ampliamente disponible en cualquier hosting.

**Alternativas descartadas:**
- MySQL/MariaDB: menor soporte de tipos avanzados (UUID nativo, JSONB).
- MongoDB: el modelo de datos es relacional por naturaleza (FKs entre catálogo, proyectos, asignaciones). Un document store no añade valor y complica las consultas de presupuesto.

---

### Gemini API (Google)

**Rol:** extracción de tablas del PDF TCPO V15 rasterizado (Gemini Vision), traducción PT→ES en el mismo llamado de extracción. Corre únicamente en el pipeline ETL, no en el servidor web.

**Modelo actual:** `gemini-2.5-flash` — los modelos `gemini-2.0-flash` y `gemini-2.0-flash-lite` fueron deprecados para nuevos usuarios.

**Por qué Gemini:**
- `gemini-2.5-flash` soporta entradas multimodales (imagen + texto) con capacidad de OCR y comprensión estructural, necesarios para extraer tablas de un PDF rasterizado de baja calidad.
- V0 demostró que produce traducciones de calidad técnica a escala (~40.000 partidas) con un costo de API razonable (`LECCIONES-V0.md` sección 5).
- No es una dependencia de runtime: si la API no está disponible, el sistema sigue funcionando con los datos ya extraídos.

**Restricción:** Gemini es el único componente no open source del stack. Se acepta porque su uso está estrictamente acotado al pipeline ETL offline, no al servidor en producción. Si en el futuro se necesita una alternativa local, el cliente Gemini puede reemplazarse por un cliente de Ollama u otro LLM local sin tocar el resto del sistema.

---

### pymupdf + OpenCV + Pillow

**Rol:** pre-procesamiento del PDF para el pipeline ETL. No forman parte del servidor web.

| Librería | Rol específico |
|----------|----------------|
| `pymupdf` | Renderiza páginas del PDF TCPO V15 a imagen raster (alta resolución) |
| `opencv-python` | Detecta contornos externos de tablas en la imagen rasterizada |
| `Pillow` | Recorta las regiones de tabla detectadas y prepara los bytes JPEG para Gemini |

**Alternativas descartadas:** extracción directa de texto PDF (pdfplumber, pdfminer) — el TCPO V15 es un PDF escaneado sin capa de texto. El único camino viable es rasterizar y usar visión por computadora.

---

## Frontend

### TypeScript + React

**Rol:** framework de la interfaz web.

**Por qué TypeScript:**
- ADR-006 exige docstrings JSDoc en todo el código TypeScript — el tipado estático hace que esa documentación sea verificable por el compilador, no solo por convención.
- Los contratos entre módulos de frontend (qué props recibe cada componente, qué devuelve cada llamada a la API) quedan expresados en tipos, coherente con el enfoque del backend (Pydantic).

**Por qué React:**
- Es el framework con la mayor comunidad y documentación disponible — reduce la barrera de entrada para estudiantes que quieran contribuir.
- El ecosistema de componentes para tablas editables, virtualized lists (necesarias para catálogos de 40.000 ítems) y paneles es maduro.
- `@thatopen/components` tiene soporte documentado para integración con React.

**Alternativas descartadas:**
- Streamlit: descartado en V0 por limitaciones estructurales para BIM 3D y multi-usuario (`LECCIONES-V0.md` sección 6). No se reconsidera.
- Vue/Svelte: comunidades más chicas en el ecosistema BIM específicamente. Menos probabilidad de encontrar ejemplos de integración con `@thatopen/components`.

---

### @thatopen/components (ex IFC.js)

**Rol:** visor 3D del modelo IFC en el navegador, selección bidireccional presupuesto ↔ modelo.

**Por qué @thatopen/components:**
- Es la evolución directa de IFC.js — el ecosistema open source de referencia para visores BIM en la web (`IFCjs.md`).
- Motor basado en WebAssembly (`web-ifc`): procesa modelos de cientos de MB directamente en el navegador sin subir datos a servidores externos. Garantiza privacidad y reduce costos de infraestructura.
- Arquitectura de componentes modulares: se puede integrar solo el visor 3D sin arrastrar todo el ecosistema.
- Licencia open source, mantenida activamente por That Open Company.
- Software-agnóstico: lee IFC de cualquier software BIM.

**Por qué no soluciones comerciales (Autodesk Forge, etc.):**
- Requieren subir modelos a servidores de terceros — incompatible con el requisito de privacidad y el espíritu open source del proyecto.
- Costo de licencia incompatible con un producto gratuito.

---

## Testing

### Playwright

**Rol:** testing end-to-end de la interfaz web.

**Por qué Playwright:**
- Controla el navegador a nivel de DOM y árbol de accesibilidad — mucho más confiable que testing basado en coordenadas de pantalla (`Playwright.md`).
- Integración documentada con Claude Code vía MCP: permite que el agente de IA detecte, analice y corrija errores de interfaz de forma autónoma durante el desarrollo.
- Desarrollado por Microsoft, open source, con soporte para Chromium, Firefox y WebKit.
- Los tests de Playwright son los candidatos naturales para la carpeta `ai-skills/` (ADR-006): una secuencia de test bien escrita se convierte en un skill reutilizable.

### pytest

**Rol:** testing unitario e de integración del backend Python.

Standard de la comunidad Python. Sin justificación especial necesaria.

---

## Open BIM — Estándares integrados

Estas no son librerías sino estándares que el sistema implementa. Se listan aquí porque condicionan decisiones de implementación.

| Estándar              | Rol en Cost-Mapper                                                                                       | Documento de referencia |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| **IFC (ISO 16739)**   | Formato de intercambio del modelo 3D. Mecanismo de clasificación vía `IfcClassificationReference`.       | `OPEN-BIM.md`, ADR-004  |
| **NBR 15965**         | Sistema de clasificación de los ítems del catálogo. Fuente de los `nbr_code` y UUIDs.                   | `NBR-15965.md`          |
| **bSDD**              | Registro centralizado de UUIDs NBR. Permite verificar UUIDs y consultar propiedades técnicas por ítem.   | `bSDD.md`               |
| **ISO 12006-2**       | Marco conceptual que define qué facetas son "etiquetables" en BIM (`bim_taggable`).                      | `ISO-12006.md`          |

---

## Decisiones tomadas desde la redacción inicial

| Componente              | Decisión            | Referencia                                                                                               |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| ORM / query builder     | **SQLModel** (SQLAlchemy + Pydantic combinados) | ADR-009 — elimina la duplicación `models.py` + `schemas.py`. 4 archivos por módulo en lugar de 5. |
| Base de datos (dev/test)| **SQLite** en desarrollo, PostgreSQL en producción | SQLModel crea las tablas automáticamente en el lifespan de FastAPI. Migrar a PG solo requiere cambiar la URL de conexión. |
| Gestor de paquetes JS   | **npm** (estándar)  | Elegido al inicializar el proyecto frontend con Vite.                                                    |
| Build tool frontend     | **Vite 5**          | Hot reload instantáneo, soporte TypeScript nativo, proxy `/api` → `localhost:8002` para desarrollo.      |

## Scripts de arranque

### `iniciar.bat` (raíz del proyecto)

Script de arranque para Windows. Abre dos ventanas de terminal separadas (backend en puerto 8002, frontend en 5173) y lanza el navegador en `http://localhost:5173`. Alternativa a tener que recordar los comandos de Uvicorn y npm.

```bat
iniciar.bat   ← doble clic desde el Explorador de archivos
```

El backend detecta automáticamente si existe un virtualenv en `backend\.venv\` y lo activa antes de levantar Uvicorn.

---

## Lo que NO está decidido todavía

| Componente              | Estado              | Nota                                                                                                     |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| Hosting / infraestructura | No decidido       | MVP corre localmente. El deploy en producción (VPS, Railway, Render) se decide post-MVP.                |
| Autenticación           | Básica en MVP       | `role` en tabla `users`. Sistema de auth completo (JWT, OAuth) es post-MVP.                             |
| Migraciones de schema   | No decidido         | Alembic está planificado (ver ARQUITECTURA.md sección 2.8) pero no inicializado. Actualmente se usa `SQLModel.metadata.create_all()` en el lifespan. |

---

## Resumen del stack

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND                                                │
│  TypeScript + React 18  →  framework de interfaz         │
│  Vite 5                 →  build tool + dev proxy        │
│  @thatopen/components   →  visor IFC 3D (WebAssembly)    │
│  Playwright             →  testing E2E                   │
├──────────────────────────────────────────────────────────┤
│  BACKEND                                                 │
│  Python 3.11+ + FastAPI  →  API REST                     │
│  SQLModel                →  ORM (SQLAlchemy + Pydantic)  │
│  ifcopenshell            →  parsing IFC                  │
│  pytest                  →  testing unitario             │
├──────────────────────────────────────────────────────────┤
│  DATOS                                                   │
│  SQLite (dev) / PostgreSQL (prod)  →  base de datos      │
├──────────────────────────────────────────────────────────┤
│  PIPELINE ETL (offline)                                  │
│  Python scripts (etl_tcpo/) →  extracción TCPO V15 PDF   │
│  pymupdf + OpenCV + Pillow  →  detección de tablas       │
│  Gemini API (gemini-2.5-flash) → extracción + traducción │
├──────────────────────────────────────────────────────────┤
│  ESTÁNDARES OPEN BIM                                     │
│  IFC · NBR 15965 · bSDD · ISO 12006-2                    │
└──────────────────────────────────────────────────────────┘
```
