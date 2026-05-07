# Lecciones del Prototipo V0: TCPO Explorer PY

> **Propósito de este documento:** Registrar lo que se construyó, lo que funcionó, lo que no, y todo lo que puede rescatarse del prototipo anterior (`tcpo-mandua-mapper`) para informar el desarrollo de **Cost-Mapper V2** desde una base de conocimiento real, no desde cero.

---

## 1. Qué era el prototipo V0

**TCPO Explorer PY** fue una aplicación web local construida con **Python + Streamlit + SQLite**. Su objetivo era explorar el catálogo TCPO v15 adaptado para Paraguay, cruzando esas partidas con precios de referencia de **Mandu'a** (edición marzo 2026, la guía de precios paraguaya de referencia).

### Páginas que tenía:

- **Dashboard:** métricas de cobertura de traducción, distribución por relevancia, proyectos activos.
- **Explorador:** búsqueda y filtrado por capítulo, subcapítulo y relevancia PY, con panel de detalle.
- **Proyectos:** crear proyectos, agregar partidas favoritas, asignar precios Mandu'a, editar cantidades.
- **Exportar:** presupuesto en Excel o CSV.
- **Configuración:** gestión del glosario PT→ES, lanzar traducciones adicionales.
- **Ítems propios:** crear y gestionar ítems personalizados con prefijo `PY.*`.

---

## 2. Lo que se logró (datos reales, no promesas)

Esta es la cobertura real que había en la base de datos a fecha de los exports (abril 2026):

| Métrica                                    | Valor         |
| ------------------------------------------ | ------------- |
| Partidas totales TCPO V14 cargadas         | ~40.000       |
| Traducidas PT→ES                           | ~29.500 (73%) |
| Clasificadas como relevancia alta para PY  | ~19.800       |
| Clasificadas como relevancia media para PY | ~5.300        |
| Ítems Mandu'a materiales                   | ~14.000       |
| Ítems Mandu'a mano de obra                 | ~11.000       |

**Conclusión crítica:** Los datos ya existen y están procesados. Cost-Mapper V2 no empieza de cero en términos de datos. La base de datos `precios.db` (SQLite) y los exports en Excel son un activo real.

---

## 3. Las fuentes de datos — la confusión que hundió V0

Esta es la aclaración más importante del documento y la razón principal por la que V0 fue abandonado.

El archivo `tcpo-versao-15.xlsx` con la hoja `VOLARE-15_NOV2018` **no contiene datos de la TCPO V15**. "VOLARE" es el nombre del software de Editora PINI, no la versión de la TCPO. Lo que se cargó en V0 eran ~40.000 partidas de la **TCPO V14**, que usa la codificación alfanumérica propia y jerárquica del sistema anterior (ej. `22.109.000060.SER`).

La **TCPO V15** real es la edición que restructuró el catálogo adoptando el sistema de clasificación **OmniClass / ABNT NBR 15965**, con UUIDs por ítem y compatibilidad con IFC. Esa versión **no estaba disponible en V0**.

Este malentendido es la causa raíz del abandono del prototipo: todo el trabajo de matching y presupuesto se construyó sobre datos V14 que no tienen los UUIDs necesarios para vincularse con modelos IFC. Cuando se intentó dar el paso hacia BIM 5D, la base de datos no lo soportaba estructuralmente.

**Las fuentes reales disponibles en V0:**

- `tcpo-versao-15.xlsx` (VOLARE): Contenido TCPO **V14**, codificación alfanumérica propia. Parseable como Excel, ~40.000 partidas.
- `datos-mandua-marzo-26.xlsx`: Catálogo **Mandu'a** edición marzo 2026 — guía de precios paraguaya, ~25.000 ítems en Guaraníes. No es TCPO, es el catálogo local de referencia de Paraguay.

**Lo que falta y sigue faltando para V2:**

- La TCPO V15 real, con codificación NBR 15965 y UUIDs. Obtener o generar ese mapeo es la tarea de datos más crítica del proyecto.

---

## 4. El pipeline de datos: probado y funcional

Se construyó un pipeline de scripts numerados que funcionó en producción:

| Script                        | Función                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `01_init_db.py`               | Crea el schema SQLite completo con índices                     |
| `02_cargar_mandua.py`         | Carga ~25.000 ítems de Mandu'a al SQLite                       |
| `03_cargar_tcpo.py`           | Carga ~40.000 partidas del Excel TCPO V14 (formato VOLARE)     |
| `04_traducir_prototipo.py`    | Prototipo inicial de traducción                                |
| `05_mapear_prototipo.py`      | Prototipo de matching TCPO↔Mandu'a                             |
| `A1_extender_schema.py`       | Migración del schema a v2 (proyectos, favoritos)               |
| `A2_traducir_y_clasificar.py` | Pipeline Gemini: traducción + relevancia PY en un solo llamado |
| `B1_traducir_capitulos.py`    | Traducción por capítulos bajo demanda                          |

**Lo que puede rescatarse directamente:** Scripts `01`, `02`, `03` y el cliente Gemini (`src/gemini_client.py`) son código de producción, probado, con manejo de errores y retry logic. No hay que reescribirlos.

---

## 5. Decisiones técnicas que funcionaron

### D-003: Estrategia de matching estratificado

Para mapear partidas TCPO → ítems Mandu'a, se implementaron tres niveles en cascada:

1. **Match exacto normalizado** (confianza = 100): coincidencia perfecta después de quitar acentos, puntuación y normalizar a minúsculas.
2. **Match fuzzy via `rapidfuzz`** (umbral ≥ 75): usando `token_set_ratio` para tolerar diferencias de orden de palabras.
3. **Match por embeddings** (umbral ≥ 0.70): similitud coseno con embeddings Gemini cuando el fuzzy no alcanza.

Además, había lógica para decidir a qué tabla de Mandu'a apuntar según la clase TCPO (`MAT.` → materiales, `M.O.` → mano de obra, `SER.CG` → costeo o materiales según contexto).

**Para V2:** Esta estrategia es reutilizable. El matching TCPO↔Mandu'a ya está resuelto conceptualmente y en código.

### D-006/D-007: Traducción + clasificación en un solo llamado Gemini

En vez de dos llamadas a la API (una para traducir, otra para clasificar relevancia PY), ambas operaciones se hacían en el mismo prompt. Resultado: menor costo de API, menor latencia, y la clasificación de relevancia se realizó para ~25.100 partidas.

**Para V2:** Mantener esta estrategia. La clasificación de relevancia para Paraguay es una feature fundamental del producto.

### D-008: Deduplicación por MD5

Para evitar traducir la misma descripción portuguesa dos veces (hay muchas partidas con descripciones idénticas), el sistema cacheaba traducciones usando el hash MD5 del texto original. Una traducción correcta se propagaba a todos los ítems que compartían esa descripción.

**Para V2:** Mantener este enfoque en el módulo de traducción.

### Namespace de ítems personalizados: `PY.*`

Los ítems creados por el usuario recibían el prefijo `PY.{cap}.{NNNNNN}.{sufijo}` (ejemplo: `PY.22.000005.MAT`). Esto los diferenciaba visualmente de los ítems TCPO originales y evitaba colisiones de códigos. El sistema soportaba tanto ítems "hoja" (precio directo) como "servicios compuestos" (con composición de componentes y recálculo en cascada).

**Para V2:** Esta es la respuesta a la pregunta abierta en los ADRs (`docs/adrs/`) sobre ítems personalizados. El prefijo `PY.*` es la solución probada.

---

## 6. Lo que no funcionó / limitaciones del prototipo

### El frontend era Streamlit → no es escalable a la visión de V2

Streamlit es excelente para prototipar, pero tiene limitaciones estructurales para lo que necesita Cost-Mapper V2:

- No puede integrar un **visor IFC 3D** de forma nativa.
- No permite colaboración multi-usuario real.
- El modelo de "reruns en cada interacción" genera UX lenta para catálogos de 40.000 ítems.
- La customización visual tiene un techo bajo (aunque el `DESIGN.md` logró una estética muy cuidada dentro de esas limitaciones).

**Lección:** Streamlit fue la elección correcta para validar el concepto rápido. Para V2, hay que moverse a un stack web real (frontend separado del backend).

### SQLite como base de datos → sirve para el prototipo, no para producción multi-usuario

SQLite con WAL mode funcionó bien para uso local, pero es un archivo en disco. Para la visión de Cost-Mapper con **múltiples usuarios editando simultáneamente**, se necesita un motor de base de datos real (PostgreSQL o similar).

**Lección:** El *schema* de SQLite es rescatable y adaptable a PostgreSQL. Los datos ya cargados también son migrables.

### 73% de cobertura de traducción → el 27% restante importa

La traducción cubrió los capítulos de alta y media prioridad para Paraguay, pero quedó un 27% sin traducir (capítulos excluidos o de baja relevancia: 18, 31, 32 principalmente). Para un producto completo, eso debe cerrarse.

### No había integración IFC ninguna

El prototipo era puramente un catálogo de precios con interfaz de búsqueda. La integración con modelos BIM (el corazón de la visión de Cost-Mapper) nunca se implementó. Esa es la brecha más grande que hay que cubrir en V2.

---

## 7. Lo que se puede rescatar directamente para V2

| Activo                                         | Tipo               | Cómo usarlo en V2                                                                                                                                                  |
| ---------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data/precios.db`                              | Base de datos      | Migrar schema a PostgreSQL; los datos (~40.000 partidas traducidas + Mandu'a) son el punto de partida                                                              |
| `src/gemini_client.py`                         | Código             | Reutilizar el cliente de traducción tal cual, con retry logic y caché                                                                                              |
| `src/matching.py`                              | Código             | Reutilizar la estrategia estratificada (exacto → fuzzy → embedding)                                                                                                |
| `scripts/01_init_db.py`                        | Esquema            | El DDL define las entidades del modelo de datos; adaptarlo a PostgreSQL                                                                                            |
| `scripts/02_cargar_mandua.py`                  | Pipeline           | Reutilizar para cargar actualizaciones de Mandu'a                                                                                                                  |
| `scripts/03_cargar_tcpo.py`                    | Pipeline           | Reutilizar; la lógica de parsing del Excel TCPO v15 está depurada                                                                                                  |
| `data/tcpo-versao-15.xlsx`                     | Dato (V14)         | Contiene datos TCPO V14 en formato VOLARE. Parseable y probado, pero **sin UUIDs NBR 15965**. Útil como catálogo de partidas y composiciones, no como base BIM 5D. |
| `data/datos-mandua-marzo-26.xlsx`              | Dato               | Actualizar con edición más reciente de Mandu'a cuando esté disponible                                                                                              |
| `data/capitulos_relevantes_py.json`            | Configuración      | El mapa de relevancia PY por capítulo, validado manualmente                                                                                                        |
| `data/glosarios/glosario_construccion_py.json` | Dato               | El glosario PT→ES construido; ampliar en V2                                                                                                                        |
| `exports/csv/tcpo_items.csv`                   | Dato (9.5MB)       | Backup legible de toda la TCPO traducida                                                                                                                           |
| Namespace `PY.*`                               | Decisión de diseño | Adoptarlo en V2 como estándar para ítems personalizados                                                                                                            |
| Clasificación de relevancia PY                 | Feature            | Mantenerla como feature de primer nivel en V2                                                                                                                      |
| `DESIGN.md`                                    | Especificación     | Referencia de paleta, tipografía e interacciones; adaptar al nuevo stack                                                                                           |

---

## 8. Preguntas de los ADRs: qué responde V0 y qué sigue abierto

| Pregunta en ADRs (`docs/adrs/`)                     | Estado                               | Respuesta                                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Cómo manejar ítems sin UUID o personalizados?      | ✅ Resuelta                           | Namespace `PY.{cap}.{NNNNNN}.{sufijo}`. Probado en V0, adoptar en V2.                                                                                                                                    |
| ¿Cómo vincular TCPO V14 con V15?                    | ⚠️ Sigue abierta y es la más crítica | V0 trabajó solo con V14. La V15 real (con UUIDs NBR 15965) no estaba disponible y fue la razón del abandono. En V2 hay que decidir: ¿obtener la V15 oficial, o construir un mapeo V14→UUIDs manualmente? |
| ¿Cómo traducir al español los ítems?                | ✅ Resuelta en la práctica            | Gemini 2.5 Flash + glosario PT→ES. 73% de cobertura lograda. El restante 27% requiere más pasadas del mismo pipeline.                                                                                    |
| ¿Se puede usar bSDD como herramienta de traducción? | 🔵 No explorada                      | No se intentó en V0. Sigue siendo una pregunta abierta; la traducción con Gemini es la solución inmediata disponible.                                                                                    |

---

## 9. Resumen ejecutivo para Cost-Mapper V2

**Lo que V0 validó:**

- La traducción PT→ES con Gemini es viable y produce resultados de calidad a escala (~40.000 partidas).
- La clasificación de relevancia para Paraguay es técnicamente factible y valiosa como feature.
- El modelo de ítems personalizados con namespace `PY.*` resuelve el problema de extensibilidad.
- Mandu'a es el puente correcto entre el catálogo brasileño y los precios paraguayos.
- La experiencia de usuario en Streamlit confirmó qué features son valiosas (explorador, proyectos, exportar).

**El problema central no resuelto que V2 debe atacar primero:**
La TCPO V14 (disponible) no tiene UUIDs ni clasificación NBR 15965. La TCPO V15 real (con esa clasificación) no estaba disponible. Sin ese dato, la integración IFC es imposible. **Esta es la decisión de datos más urgente de V2:** ¿cómo obtener o construir el puente entre las partidas de V14 y los UUIDs de V15/NBR 15965?

**Lo que V2 construye sobre la base de V0:**

- Resolución del problema V14→V15 (obtener datos oficiales o construir mapeo con IA).
- Stack web real (no Streamlit) con soporte para visor IFC 3D.
- Base de datos multi-usuario (PostgreSQL en lugar de SQLite).
- Integración con modelos BIM vía estándar IFC y librería `IFC.js`.
- Conformidad con UUIDs/bSDD para interoperabilidad Open BIM.
