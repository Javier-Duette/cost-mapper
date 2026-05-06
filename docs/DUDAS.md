# Decisiones de Arquitectura — Cost-Mapper V2

> **Propósito de este documento:** Las preguntas abiertas del proyecto se resuelven aquí como **Architecture Decision Records (ADRs)**. Cada ADR documenta una decisión de diseño: el contexto que generó la pregunta, la alternativa elegida, las razones y las consecuencias. Una vez aceptado, un ADR no se borra: si la decisión cambia, se crea uno nuevo que lo reemplaza y se marca el anterior como `Superado`.

---

## ADR-001 — Identificación y trazabilidad de ítems

**Estado:** Aceptado  
**Pregunta original:** ¿Cómo haremos con los ítems y subítems que no tienen UUID? ¿Cómo creamos ítems que no existen de forma que cumplan todos los requisitos del programa?

### Contexto

El catálogo TCPO V14 (40.446 partidas) no tiene UUIDs ni clasificación NBR 15965. Además, los usuarios necesitarán crear ítems propios para partidas locales paraguayas que no existen en ningún catálogo: materiales regionales, mano de obra específica, gastos generales, ítems del MOPC sin equivalente TCPO.

El sistema de clasificación de referencia es **ISO 12006-2**, implementado en la región como **ABNT NBR 15965**. Esa norma define una taxonomía de facetas (componentes, procesos, resultados, funciones, equipos, espacios) donde cualquier concepto de la construcción puede ubicarse. Ese es el marco que Cost-Mapper adopta para todos sus ítems, sin excepción.

### Decisión

Todos los ítems del sistema — sean de catálogo oficial, derivados de TCPO V14 o creados por el usuario — se clasifican dentro de la taxonomía NBR 15965 y reciben un UUID. Lo que varía entre ítems no es el sistema de codificación, sino el **origen y la confiabilidad** de esa clasificación y su UUID. Esa diferencia vive exclusivamente en los metadatos, no en el código del ítem.

Se definen tres capas según la disponibilidad de datos:

**Capa 1 — UUID oficial NBR 15965:** Ítems TCPO V14 clasificados dentro de NBR 15965 mediante Estrategia A (clasificación semántica con IA) o Estrategia B (extracción del PDF V15). El UUID proviene directamente de la norma. Son los únicos que generan vínculos IFC estándar e interoperables.

**Capa 2 — Código NBR sin UUID oficial:** Ítems con código de faceta NBR asignado, pero cuya parte de la norma no cuenta aún con UUIDs publicados en formato machine-readable (servicios SER.* → Partes 3 y 5; espacios → Parte 6). Se clasifican en la faceta correspondiente y se les genera un UUID local provisional (`uuid_status: "provisional"`). Pueden usarse en presupuesto, pero el vínculo IFC no es interoperable hasta que ABNT publique los UUIDs oficiales de esas partes.

**Capa 3 — Ítems creados por el usuario:** Partidas que no existen en ningún catálogo oficial. El usuario los clasifica dentro de la faceta NBR 15965 que corresponde a su naturaleza (`2C` si es un material, `2N` si es mano de obra, `1S` si es un proceso, etc.) y el sistema genera un UUID local válido (`uuid_status: "local"`). No hay prefijo especial en el código: el ítem es simplemente un concepto nuevo dentro de la taxonomía existente, distinguible de los oficiales únicamente por sus metadatos.

### Esquema de metadatos por ítem

Cada ítem almacena los siguientes campos de trazabilidad. Son la fuente de verdad para auditorías y exportaciones:

| Campo                   | Descripción                                                                                                                                                                                                                 | Editable |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `uuid`                  | UUID del ítem. Oficial (NBR), provisional (local para Capa 2) o local (Capa 3)                                                                                                                                              | No       |
| `uuid_status`           | `official` · `provisional` · `local`                                                                                                                                                                                        | No       |
| `nbr_code`              | Código de faceta NBR 15965 (`2C 82 10 00`, `1S 30 00`, etc.)                                                                                                                                                                | No       |
| `classification_source` | Origen de la clasificación: `v15_official` · `gemini_auto` · `user`                                                                                                                                                         | No       |
| `confidence`            | Confianza de clasificación automática (0–100). `null` si es manual u oficial                                                                                                                                                | No       |
| `creado_por`            | Origen del ítem: `catalog_tcpo` · `catalog_mandua` · `user:{id}` · `import:{fuente}`                                                                                                                                        | No       |
| `oficial`               | `true` si proviene de un catálogo oficial sin modificación del usuario                                                                                                                                                      | No       |
| `bim_taggable`          | `true` si el ítem puede etiquetarse en un elemento geométrico de un modelo BIM. Determinado por la faceta: `3E`, `4U` → `true`; `2N`, `2Q`, `1S` → `false`. Controla qué ítems aparecen en el archivo de keynotes generado. | No       |
| `fuente_factores`       | Origen de los rendimientos y consumos de la APU: `tcpo` · `mopc` · `user` · `unit` · etc.                                                                                                                                   | Sí       |
| `fuente_precios`        | Origen del valor monetario de los insumos: `mandua_2026_03` · `relevamiento_propio` · etc.                                                                                                                                  | Sí       |

**`fuente_factores` y `fuente_precios` son independientes** porque la composición técnica de una APU (cuántos kg de cemento, cuántas horas de albañil) y el precio de cada insumo son datos de naturaleza distinta que pueden provenir de fuentes distintas. Un ítem puede usar rendimientos TCPO con precios de relevamiento propio, y eso debe quedar explícito para cualquier auditor.

**`fuente_precios` es editable** porque los precios cambian con el tiempo y con el mercado. El usuario debe poder actualizar la fuente de precios de un proyecto sin alterar la composición técnica ni la clasificación NBR del ítem.

### Consecuencias

- El sistema de codificación es uniforme para todos los ítems: siempre NBR 15965. No hay códigos paralelos ni prefijos especiales.
- La distinción entre ítems oficiales y ítems de usuario es únicamente de metadatos (`uuid_status`, `oficial`, `creado_por`).
- El esquema de base de datos separa la **composición técnica** (factores, rendimientos, consumos) del **precio unitario** de los insumos. Actualizar precios no requiere modificar la APU.
- Los ítems de usuario son ítems de pleno derecho dentro de la taxonomía NBR; el usuario solo debe elegir la faceta correcta al crearlos.
- El visor y las exportaciones deben indicar visualmente el `uuid_status` para que el usuario sepa qué vínculos IFC son interoperables y cuáles son locales.
- **Pendiente: redactar `ISO-12006.md`** — marco conceptual de ISO 12006-2 y su implementación como NBR 15965. Lectura obligatoria antes de diseñar el modelo de datos.

---

## ADR-002 — Fuente primaria del catálogo TCPO y estrategia de datos

**Estado:** Revisado (reemplaza decisión anterior de Estrategia A como MVP)  
**Pregunta original:** ¿Cómo vincularemos nuestra base de datos traducida de la TCPO V14 con la TCPO V15? ¿Es posible?

### Contexto

La TCPO V14 (40.446 partidas procesadas en V0) no tiene UUIDs ni clasificación NBR 15965. La TCPO V15 es la edición que restructuró el catálogo adoptando NBR 15965, asignando código NBR y UUID a cada ítem, y está disponible como PDF (`538948707-TCPO-BIM-15-Edicao.pdf`).

La decisión inicial planteaba usar clasificación semántica con IA (Estrategia A) sobre la V14 como MVP, y reservar la extracción del PDF (Estrategia B) para después. Esa secuencia fue descartada por la siguiente razón: si el PDF V15 ya contiene los ítems con sus descripciones y sus códigos NBR asignados oficialmente, extraerlo da en un solo paso tanto el catálogo como la clasificación. Construir una capa de clasificación IA sobre V14 sería agregar complejidad innecesaria sobre datos que ya existen correctos en la fuente oficial.

### Decisión

**El PDF TCPO V15 es la única fuente primaria del catálogo.** La base de datos V14 queda descontinuada como fuente de ítems.

El pipeline de datos es:

1. **Verificar el tipo del PDF** — determinar si es vectorial (texto extraíble con `pdftotext` o `pdfplumber`) o rasterizado (requiere OCR). Esta verificación es el primer paso técnico del proyecto antes de escribir cualquier código de ingesta.

2. **Si vectorial:** construir un parser que extraiga la tabla de ítems V15 en el formato `descripción | código NBR | UUID`. Todos los ítems quedan con `classification_source: "v15_official"` desde el primer día.

3. **Si rasterizado:** aplicar OCR (Tesseract o similar) con validación posterior. Mayor esfuerzo y margen de error, pero sigue siendo la ruta correcta: los datos oficiales valen el costo del OCR.

4. **Rescate de activos de V0:** una vez cargado el catálogo V15, los activos del trabajo previo se recuperan por cruce de descripción normalizada entre V14 y V15:
   
   - ~29.500 traducciones PT→ES ya validadas.
   - Clasificación de relevancia Paraguay (~25.100 ítems).
   - Glosario técnico PT→ES.
   - Mapeos TCPO→Mandu'a ya calculados.
     Estos activos se transfieren a los ítems V15 correspondientes sin necesidad de repetir el trabajo de traducción para los ítems coincidentes.

5. **Estrategia C — validación bSDD (opcional):** una vez cargado el catálogo V15 con UUIDs oficiales, consultar la API pública de bSDD para enriquecer los registros con URIs canónicas y términos en es-419 donde estén disponibles.

### Consecuencias

- **La Estrategia A (clasificación IA sobre V14) queda descartada.** No se ejecuta ni como paso previo ni como fallback.
- El pipeline de ingesta tiene una dependencia crítica: el tipo del PDF determina el esfuerzo técnico. Esto debe resolverse como primera tarea de datos, antes de diseñar el esquema de base de datos definitivo.
- Los ítems SER.* (servicios compuestos) también se obtienen del PDF V15 con sus códigos NBR correspondientes, resolviendo el problema que en V14 dejaba esa clase sin UUID.
- El campo `classification_source` para todos los ítems del catálogo base será `v15_official`. Solo los ítems creados por usuarios tendrán `classification_source: "user"`.
- La V14 sigue siendo útil como referencia auxiliar para el rescate de traducciones, pero no como catálogo activo de V2.

---

## ADR-003 — Traducción, extracción del PDF y preparación del catálogo

**Estado:** Aceptado  
**Pregunta original:** ¿Cómo traduciremos al español los ítems? ¿Podemos usar la bSDD como herramienta de traducción?

### Contexto

El catálogo TCPO V15 existe en portugués brasileño como PDF. Para que Cost-Mapper funcione necesita ese catálogo traducido al español, con clasificación NBR 15965 y cargado en la base de datos. En V0 estos procesos (traducción, clasificación de relevancia) estaban accesibles desde la interfaz de usuario como páginas de "Configuración", lo que contaminó la UX con herramientas que el 99% de los usuarios nunca necesita ver.

### Decisión

**La preparación del catálogo es un proceso de administrador/desarrollador, no una función de la aplicación.** La interfaz de usuario siempre recibe el catálogo ya procesado, traducido y listo. Los scripts de preparación son herramientas internas que corren una vez (o bajo demanda cuando hay actualizaciones del catálogo), completamente fuera del alcance del usuario final.

Esta separación es la distinción clásica entre **pipeline ETL** y **aplicación**:

```
PIPELINE ETL (herramientas de desarrollador — invisibles para el usuario)
──────────────────────────────────────────────────────────────────────────

Script 1 — Extracción del PDF TCPO V15:
  · Verificar tipo de PDF (vectorial → pdfplumber / rasterizado → OCR)
  · Extraer tabla de ítems: descripción | código NBR | UUID
  · Validar y limpiar los datos extraídos
  · Salida: catálogo crudo en formato estructurado

Script 2 — Traducción PT→ES:
  · Gemini 2.5 Flash + glosario técnico PT→ES (rescatado de V0)
  · Deduplicación por hash MD5 (no traducir la misma descripción dos veces)
  · Clasificación de relevancia Paraguay en el mismo llamado a la API
  · Rescate de ~29.500 traducciones ya validadas de V0 por cruce de descripción
  · Salida: catálogo con descripciones en español y flag de relevancia PY

Script 3 — Carga en base de datos:
  · Ingesta del catálogo procesado en PostgreSQL
  · Asignación de metadatos (classification_source, uuid_status, bim_taggable, etc.)
  · Validación de integridad (UUIDs únicos, jerarquía NBR correcta)

──────────────────────────────────────────────────────────────────────────
APLICACIÓN (lo que el usuario ve)
──────────────────────────────────────────────────────────────────────────

Catálogo listo en base de datos → el usuario navega, busca, asigna, presupuesta
```

**Sobre bSDD como fuente de traducción:** no viable. Los ítems TCPO tienen descripciones técnicas muy específicas (diámetros, marcas, normas) que no tienen correlato en los conceptos abstractos de bSDD. La cobertura de NBR 15965 en bSDD además es incompleta. bSDD se usa únicamente como validación opcional post-carga: si un ítem tiene UUID oficial, se puede consultar bSDD para enriquecer con URI canónica y término en es-419 si está registrado.

### Consecuencias

- Ninguna pantalla de la aplicación expone herramientas de traducción, extracción de PDF ni carga de catálogo.
- Los scripts ETL se mantienen en una carpeta separada del repositorio (`/scripts/etl/`) con documentación propia. Son herramientas de desarrollador.
- El glosario PT→ES de V0 (`glosario_construccion_py.json`) se rescata y usa en el Script 2. No se reconstruye desde cero.
- Las ~29.500 traducciones validadas de V0 se recuperan por cruce de descripción normalizada. El trabajo previo no se pierde.
- Cuando salga una nueva versión del catálogo TCPO, el administrador ejecuta los scripts ETL. La aplicación no necesita reiniciarse ni actualizarse para reflejar el nuevo catálogo.

---

## ADR-004 — Flujo de trabajo IFC: importación, mapeo y sincronización

**Estado:** Aceptado  
**Pregunta original:** ¿Cómo hacemos que el modelo IFC generado por Revit sea 100% compatible? Propuesta inicial: plantilla + biblioteca de familias.

### Contexto

El vínculo entre el modelo 3D y el presupuesto es el núcleo funcional de Cost-Mapper. El IFC es un estándar abierto (ISO 16739) que cualquier software de modelado puede exportar, pero la calidad y el contenido de esa exportación varía enormemente. En el mercado paraguayo, la mayoría de los modelos no traerán clasificación NBR embebida. El sistema debe funcionar bien con cualquier IFC y mejorar progresivamente a medida que el usuario adopta mejores prácticas.

### Dos conceptos que no son lo mismo

**Biblioteca del proyecto** — ítems que el usuario preselecciona en Cost-Mapper antes de modelar. Es el universo de partidas candidatas para ese proyecto. De aquí sale el archivo de keynotes para Revit. Se puede copiar de un proyecto similar.

**Asignaciones del proyecto** — vínculos reales `GlobalId → ítem` generados durante el mapeo (automático por keynote o manual asistido). De aquí sale el presupuesto.

Un ítem puede estar en la biblioteca sin estar asignado. Un ítem puede asignarse aunque no estuviera en la biblioteca. Son dos tablas separadas en el modelo de datos.

### Flujo completo de trabajo

```
══════════════════════════════════════════════════════
 FASE 1 — ANTES DE MODELAR (en Cost-Mapper)
══════════════════════════════════════════════════════

Usuario crea proyecto en Cost-Mapper
          ↓
Construye la biblioteca del proyecto:
  · Busca y agrega ítems del catálogo (faceta, texto, relevancia PY)
  · Copia biblioteca de un proyecto similar  ← función esencial
  · O parte de una plantilla por tipo de obra
    (residencial, comercial, infraestructura...)
          ↓
Configura el archivo de keynotes:
  · Selecciona qué facetas incluir (ver sección keynotes)
  · Cost-Mapper genera el .txt con SOLO los ítems de la biblioteca
          ↓
Usuario descarga el keynote file y lo carga en Revit

══════════════════════════════════════════════════════
 FASE 2 — MODELADO (en Revit u otro software BIM)
══════════════════════════════════════════════════════

Usuario aplica keynotes NBR a los elementos del modelo
(autocompletado, por categoría, en masa — rápido)
          ↓
Exporta el IFC  →  cada elemento trae su IfcClassificationReference

══════════════════════════════════════════════════════
 FASE 3 — IMPORTACIÓN (en Cost-Mapper)
══════════════════════════════════════════════════════

Usuario importa el IFC
          ↓
ifcopenshell extrae elementos 3D y calcula cantidades
(desde BaseQuantities o desde la geometría directamente)
          ↓
Por cada elemento: ¿trae IfcClassificationReference?

  SÍ → ítem asignado automáticamente desde el código NBR
  NO → mapeo asistido:
       · Sugerencia por IfcType
         (IfcWall → resultados de mampostería/tabique,
          IfcSlab → resultados de losa, etc.)
       · Usuario acepta, ajusta o busca manualmente
       · Un elemento puede tener múltiples ítems
         (ej. IfcWall: resultado estructural + revoque + pintura)
          ↓
Panel de revisión unificado:
  · Auto-asignados     → verificar que el ítem sea correcto
  · Sin asignar        → completar mapeo
  · Con alerta         → ver sección de actualizaciones
          ↓
Presupuesto calculado automáticamente
```

**El camino de keynotes es el preferido.** El mapeo asistido es el fallback para elementos sin clasificar, no el flujo principal. Cuanto más se adopta la plantilla de keynotes, menos tiempo pasa el usuario en la pantalla de mapeo.

### Herramientas IFC

- **Backend:** `ifcopenshell` (Python, open source, LGPL) — lectura del IFC, extracción de elementos, cálculo de cantidades desde geometría.
- **Frontend — visor 3D:** `@thatopen/components` (WebGL) — visualización del modelo, resaltado bidireccional: clic en elemento 3D resalta fila en presupuesto y viceversa.

Ambas herramientas son software-agnósticas: cubren exportaciones de Revit, ArchiCAD, Allplan y FreeCAD sin dependencia de ningún proveedor.

### Keynotes NBR — el archivo de clasificación

El mecanismo Open BIM para vincular elementos a una clasificación es `IfcClassificationReference` — campo estándar del IFC, legible por cualquier software. Las keynotes de Revit son la **interfaz de gestión masiva** para poblar ese campo: permiten aplicar códigos a cientos de elementos con autocompletado y asignación por categoría.

#### Formato del archivo

Texto plano, tres columnas separadas por tabulación:

```
CÓDIGO[TAB]DESCRIPCIÓN[TAB]CÓDIGO_PADRE

3E        
3E 02    Resultados de obra gruesa    3E
3E 02 10    Muros de mampostería cerámica    3E 02
3E 02 10 15    Muro de ladrillo cerámico e=15cm    3E 02 10
4U        
4U 10    Dormitorio    4U
```

Revit renderiza esto como árbol navegable. En el elemento se almacena solo el **código** — la descripción se resuelve desde el archivo en tiempo real. Si actualizamos una descripción en la base de datos y regeneramos el `.txt`, se actualiza en todos los elementos de Revit sin tocarlos.

#### Qué facetas incluir — atributo `bim_taggable`

Solo las facetas con representación geométrica posible en un modelo BIM son aptas para keynotes:

| Faceta | Tipo                       | `bim_taggable` | Incluido por defecto en keynotes         |
| ------ | -------------------------- |:--------------:|:----------------------------------------:|
| `3E`   | Resultados de construcción | ✅              | ✅ activo                                 |
| `4U`   | Unidades / Espacios        | ✅              | ✅ activo                                 |
| `2C`   | Componentes / Materiales   | ✅              | ❌ inactivo (configurable por sub-faceta) |
| `2N`   | Funciones / Mano de obra   | ❌              | ❌ nunca                                  |
| `2Q`   | Equipos de construcción    | ❌              | ❌ nunca                                  |
| `1S`   | Servicios / Procesos       | ❌              | ❌ nunca                                  |

`3E` es la faceta primaria: el elemento IFC representa el resultado construido. Los `2N`, `2C` y `2Q` viven en la APU del ítem, no en el modelo.

Las tres facetas `bim_taggable` son **opcionales e independientes**. El usuario elige cuáles incluir al generar el archivo — al menos una debe estar seleccionada. `2C` es además configurable por sub-faceta (sus 3.735 ítems hacen impracticable incluirla completa):

```
Al generar el keynote file:

[✅] 3E — Resultados de construcción      (por defecto: activo)
[✅] 4U — Unidades y espacios             (por defecto: activo)
[ ] 2C — Componentes / Materiales        (por defecto: inactivo)
    [ ] 2C 04 — Estructuras y cerramientos
    [ ] 2C 10 — Acabados internos
    [ ] 2C 78 — Instalaciones hidráulicas
    [ ] 2C 82 — Instalaciones eléctricas
    ...
```

`bim_taggable` es independiente del software: un resultado (`3E`) siempre tendrá geometría en cualquier BIM; una función de mano de obra (`2N`) nunca la tendrá.

#### El archivo es generado por proyecto, no es global

El keynote file no se genera desde el catálogo completo — se genera desde la **biblioteca del proyecto**. Esto mantiene el archivo pequeño y enfocado. Si durante el modelado el usuario necesita un ítem que no está en la biblioteca, lo agrega en Cost-Mapper y regenera el archivo.

El archivo incluye una línea de versión (`# Cost-Mapper — Proyecto: Edificio Central — v3 — 2026-05-06`) para que el usuario sepa qué versión tiene cargada en Revit.

Cuando Cost-Mapper importa un IFC y encuentra un código NBR que no existe en la base de datos actual, genera una alerta de obsolescencia: el keynote file puede estar desactualizado.

#### Conexión con el exportador IFC de Revit

El exportador IFC open source de Autodesk acepta un archivo `.json` que mapea parámetros de Revit a propiedades IFC. La plantilla `.rte` post-MVP incluye ese archivo preconfigurado para exportar el parámetro `Keynote` como `IfcClassificationReference`. El usuario instala la plantilla una vez y el mapeo opera en todos sus proyectos. Si el exportador nativo no soporta el mapeo directo, un Shared Parameter actúa de puente sin cambiar el flujo del usuario.

### Sincronización de cambios del modelo

**Las cantidades nunca se almacenan.** Cost-Mapper guarda `GlobalId → ítem`; la cantidad siempre se recalcula desde la geometría actual con `ifcopenshell` en cada importación. Un muro que cambia de dimensiones actualiza su cantidad automáticamente sin intervención.

El `GlobalId` es el identificador persistente del IFC. Revit lo mantiene mientras el elemento exista — modificar un muro no cambia su `GlobalId`. Solo borrar y recrear el elemento genera un GUID nuevo y rompe el vínculo. Eso es un problema de disciplina de modelado; la documentación del proyecto debe advertirlo.

Para detectar qué cambió entre versiones, el sistema guarda un snapshot de los **parámetros cualitativos** del elemento al momento del mapeo (espesor, material, tipo). Al reimportar, compara el snapshot con el estado actual.

**Clasificación de cambios:**

| Tipo de cambio                                      | Ejemplo                                            | Acción del sistema                                   |
| --------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| **Cuantitativo**                                    | El muro creció en área                             | Cantidad actualizada, presupuesto recalculado        |
| **Cualitativo**                                     | Espesor 15 cm → 20 cm, cambio de material          | Alerta "verificar ítem", usuario confirma o reasigna |
| **Keynote cambiada** (fuente: `ifc_classification`) | Arquitecto cambió clasificación NBR en Revit       | Ítem actualizado automáticamente al nuevo código     |
| **Keynote cambiada** (fuente: `user`)               | Usuario había corregido manualmente en Cost-Mapper | Alerta de conflicto, usuario decide                  |
| **Elemento nuevo**                                  | GlobalId no existía antes                          | Sin asignar, pasa por flujo normal de mapeo          |
| **Elemento eliminado**                              | GlobalId desaparecido                              | Alerta, usuario decide si elimina la partida         |

El principio: **el sistema respeta la fuente del mapeo**. Los vínculos que vinieron de keynote se actualizan cuando el keynote cambia. Los que el usuario corrigió manualmente no se pisan sin confirmación.

### MVP — generación del keynote file

La generación del archivo de keynotes es una función del MVP. Cost-Mapper genera el `.txt` desde la biblioteca del proyecto en cualquier momento que el usuario lo solicite. Incluye versionado por proyecto y filtrado por faceta configurable.

Un **archivo de keynotes base** con los ítems NBR de mayor uso en Paraguay se distribuye como punto de partida para proyectos nuevos — el usuario lo importa a su biblioteca y ajusta según el proyecto.

### Post-MVP — plantilla Revit

Entregables adicionales que requieren trabajo fuera del código de Cost-Mapper:

- **Plantilla `.rte`:** Proyecto de Revit preconfigurado con parámetros IFC mapeados y configuración del exportador IFC lista para exportar keynotes como `IfcClassificationReference`.
- **Biblioteca de familias `.rfa`:** Familias Revit con parámetros IFC ya configurados para los tipos de elementos más comunes en Paraguay.

### Consecuencias

- El mapeo se almacena como `GlobalId → ítem`. Nunca por nombre, posición ni índice.
- El módulo de importación IFC soporta dos modos: **inicial** (proyecto nuevo) y **actualización** (diff sobre proyecto existente).
- El módulo no rechaza archivos por falta de clasificación — reporta los elementos sin asignar para mapeo manual.
- El visor 3D y la tabla de presupuesto están bidireccionalmente vinculados.
- Biblioteca del proyecto y asignaciones del proyecto son dos tablas separadas en el modelo de datos.
- La generación del keynote file es una función del **MVP**, no post-MVP ni documentación auxiliar.
- No hay dependencia de Revit: cualquier software que exporte IFC válido funciona.

---

## ADR-005 — Formatos de entregable (presupuesto exportado)

**Estado:** Aceptado  
**Pregunta original:** ¿Qué formato usamos para el entregable? Propuesta inicial: Formato MOPC+DNCP, CostMapper01, CostMapper02, plantilla personalizada generada por IA.

### Contexto

Los presupuestos de construcción en Paraguay se presentan en formatos muy distintos según el destinatario: obras públicas exigen el formato MOPC/DNCP, cada empresa privada tiene su plantilla propia, y los clientes individuales prefieren algo legible y profesional sin jerga burocrática.

### Decisión

Se adoptan cuatro formatos de exportación, implementados en fases:

**MVP:**

- **CostMapper Standard (PDF):** Formato propio, limpio, con: información del proyecto, tabla de ítems con composición de APU, resumen por capítulo, totales en Guaraníes y USD. Diseñado para ser legible por cualquier cliente. Logo del proyecto, fecha, versión.
- **Excel abierto (XLSX):** Exportación completa de la base de datos del presupuesto: todos los ítems, cantidades, precios unitarios, subtotales. Sin formato especial; el usuario puede darle formato manual o usarlo como fuente de datos para otros sistemas.

**Post-MVP (V2 completo):**

- **Formato MOPC/DNCP:** La estructura exigida para licitaciones públicas paraguayas. Requiere investigar el formato exacto actual del MOPC y la DNCP antes de implementarlo. Crítico para el Perfil 2 (empresas constructoras).
- **Plantilla personalizada por IA:** Un skill de agente que toma la descripción del formato requerido (en lenguaje natural o por ejemplo de un documento) y genera la plantilla de exportación correspondiente. Esta idea es innovadora y está alineada con la visión de extensibilidad del proyecto. Se implementa después de que el motor de exportación base esté estable.

### Consecuencias

- El motor de exportación debe diseñarse con abstracción suficiente para que agregar nuevos formatos no requiera tocar la lógica de presupuesto.
- Investigar y documentar el formato MOPC/DNCP actual antes de implementarlo (puede haber cambiado).
- La nomenclatura "CostMapper01/02" se simplifica a "CostMapper Standard" para claridad.

---

## ADR-006 — Extensibilidad y documentación para desarrolladores

**Estado:** Aceptado  
**Pregunta original (nueva):** ¿Cómo hacemos que el programa sea fácil de modificar para estudiantes y desarrolladores? ¿Es suficiente con buena documentación? ¿Ayudaría una biblioteca de skills para agentes de programación?

### Contexto

El Perfil 3 (estudiante/profesional en formación) no solo consume el software: quiere entenderlo, modificarlo y usarlo como base para sus propias ideas. Open source sin buena documentación de desarrollo es open source de nombre. Un proyecto que los estudiantes pueden modificar con confianza tiene un impacto educativo real en el mercado paraguayo de BIM.

Además, la proliferación de agentes de IA para programación (Claude Code, GitHub Copilot, Cursor) significa que la documentación técnica es consumida tanto por humanos como por máquinas.

### Decisión

**Documentación técnica como entregable de primer nivel:**

El proyecto incluye, como parte del repositorio y no como algo opcional, los siguientes documentos técnicos:

- `CONTRIBUTING.md`: Guía de contribución (cómo configurar el entorno, estilo de código, proceso de PR).
- `ARCHITECTURE.md`: Diagrama del sistema y explicación de cada módulo, incluyendo las razones de las decisiones (referencia a estos ADRs).
- `ADR/` (este documento y sus sucesores): El historial de decisiones de diseño es documentación técnica fundamental.
- Docstrings en todo el código Python y TypeScript con el estándar correspondiente (Google style para Python, JSDoc para TS).
- Un `CLAUDE.md` en la raíz del repositorio con instrucciones para agentes de IA: convenciones del proyecto, qué archivos no tocar, cómo correr los tests, los ADRs que deben leer antes de proponer cambios.

**Biblioteca de skills para agentes de programación:**

El repositorio incluirá una carpeta `ai-skills/` con prompts especializados para agentes de IA (Claude Code, Copilot, Cursor). Los skills se crean junto con la ejecución del código — cuando se implementa una funcionalidad que tiene sentido documentar como skill reutilizable, se agrega en ese momento. No se pre-definen skills que aún no existen.

Ejemplo confirmado como primer skill cuando se implemente:

- `ai-skills/add-export-format.md`: Cómo agregar un nuevo formato de exportación.

Los demás se irán creando a medida que el proyecto avance.

Estos skills son instrucciones en lenguaje natural que cualquier estudiante puede darle a un agente de IA para que lo ayude a extender el programa con contexto completo del proyecto.

**Arquitectura modular como requisito de diseño:**

El sistema debe diseñarse con módulos con responsabilidades claras y contratos definidos (interfaces/tipos exportados), de forma que un estudiante pueda modificar un módulo sin necesitar entender todos los demás. Esto no es solo buena práctica de ingeniería: es un requisito explícito del producto dado el perfil de usuario objetivo.

### Continuidad entre agentes de IA

**El problema que queremos evitar** es exactamente lo que pasó en V0: el proyecto avanzó, las decisiones cambiaron, las razones de esos cambios se perdieron, y al retomar el trabajo (con otro agente o en otra sesión) fue necesario reconstruir el contexto desde cero. La solución no es tecnológica — es documentar con la disciplina suficiente para que cualquier agente pueda leer los archivos del repositorio y llegar al mismo nivel de contexto que el agente original.

El sistema completo tiene cinco piezas que trabajan juntas:

**1. `CLAUDE.md` — el punto de entrada del agente**

Un archivo en la raíz del repositorio que todo agente de IA debe leer antes de proponer cualquier cambio. Contiene:

- Descripción del proyecto en dos párrafos
- Qué ADRs leer y en qué orden
- Estructura de carpetas con el propósito de cada una
- Convenciones de código (estilo, naming, estructura de commits)
- Qué archivos NO tocar sin revisar el ADR correspondiente
- Cómo correr los scripts ETL, los tests y el servidor de desarrollo

El `CLAUDE.md` es el briefing operativo. Un agente que lo lee sabe cómo moverse por el proyecto sin preguntar. Se actualiza cada vez que cambia una convención o se agrega un módulo nuevo.

**2. ADRs — la memoria de decisiones**

Ya los tenemos. Son la razón de por qué el sistema es como es, no solo qué es. Cuando un agente lee un ADR entiende no solo la decisión sino las alternativas que se descartaron y por qué. Eso evita que proponga de nuevo algo que ya evaluamos y rechazamos. Un agente sin ADRs puede volver a sugerir la Estrategia A del ADR-002 porque no sabe que ya la descartamos.

Cuando una decisión cambia, el ADR se actualiza (o se crea uno nuevo que lo reemplaza y el anterior se marca `Superado`). El historial de cambios vive en git.

**3. `DEVLOG.md` — el diario de sesión**

Un archivo en la raíz del repositorio. Al final de cada sesión de trabajo (con o sin IA), se agrega una entrada breve con la fecha, qué se implementó, qué problemas aparecieon, qué decisiones cambiaron y cuál es el siguiente paso concreto. No es un documento formal — es un log cronológico liviano.

```markdown
## 2026-05-06
**Implementado:** Parser PDF TCPO V15 (vectorial confirmado con pdfplumber).
**Problema:** La columna UUID viene con saltos de línea en ~12% de las filas. 
  Solución: regex de normalización post-extracción.
**Decisión cambiada:** ninguna.
**Próximo paso:** Script 02 — traducción PT→ES con rescate de V0.
```

El `DEVLOG.md` responde la pregunta "¿qué pasó en la última sesión?" que no se puede responder leyendo el código. Es el puente entre sesiones.

**4. Commits con contexto**

El mensaje de commit no es solo el qué — incluye el por qué cuando no es obvio:

```
✅ fix: cambiar motor PDF de PyPDF2 a pdfplumber

   PyPDF2 perdía el orden de columnas en tablas de múltiples columnas.
   pdfplumber preserva la estructura de coordenadas. Ver ADR-003.
```

El log de git se convierte en un historial de decisiones técnicas consultable. Un agente puede hacer `git log --oneline` y entender la evolución del proyecto en cinco minutos.

**5. La documentación-primero como práctica de trabajo**

El problema de V0 no fue falta de herramientas — fue que la documentación fue posterior al código. En V2, la secuencia es siempre: ADR → `DEVLOG.md` → código → commit con contexto. Un agente que llega a un repositorio construido así puede leer los docs y entender la intención antes de leer una línea de código. El código pasa a ser la implementación de decisiones documentadas, no un misterio que hay que reverse-engineerear.

**En síntesis:** la continuidad entre agentes se garantiza con `CLAUDE.md` (cómo entrar), ADRs (por qué las cosas son así), `DEVLOG.md` (qué pasó ayer) y commits con contexto (qué cambió y por qué). No requiere ninguna herramienta especial — solo disciplina de escritura al final de cada sesión.

### Consecuencias

- El `CLAUDE.md` del repositorio debe crearse antes del primer commit de código, no después.
- El `DEVLOG.md` se inicia con la primera entrada de datos (extracción del PDF V15) y se actualiza en cada sesión.
- La carpeta `ai-skills/` se construye junto con el código — un skill se crea cuando la funcionalidad que documenta ya existe.
- Las interfaces entre módulos deben estar explícitamente documentadas (no asumidas).
- La extensibilidad se convierte en un criterio de aceptación al diseñar cada módulo nuevo.
- Cambiar de agente de IA (o de sesión) no requiere re-explicar el proyecto — el agente lee `CLAUDE.md` + ADRs + últimas entradas del `DEVLOG.md` y está operativo.

---

## ADR-007 — Flujo de caja y fases de ejecución

**Estado:** Propuesto (post-MVP)
**Pregunta original:** ¿Por qué no se usa el facet `1F` (Fases) de NBR 15965 si el análisis de flujo de caja es importante para gestionar una obra?

### Contexto

El facet `1F` de NBR 15965 clasifica las *etapas del ciclo de vida* de una construcción: anteproyecto, proyecto ejecutivo, ejecución, operación, demolición. No es una herramienta de programación temporal sino una clasificación del tipo de etapa.

El análisis de flujo de caja — saber cuándo se necesita cada peso durante la obra — requiere algo distinto: vincular cada partida presupuestaria a un período de ejecución concreto (mes, semana, etapa) para calcular el desembolso acumulado a lo largo del tiempo. Esto corresponde a la dimensión **BIM 4D** (tiempo) conectada a **BIM 5D** (costo).

### Decisión

El módulo de flujo de caja se implementa en post-MVP con la siguiente estructura mínima:

- Cada proyecto puede tener **fases de ejecución** definidas por el usuario (nombre + fecha de inicio + duración). No son códigos NBR — son etapas específicas del proyecto concreto.
- Cada ítem del presupuesto puede asignarse a una o más fases.
- El sistema calcula automáticamente el **desembolso por período** y la **curva S** (desembolso acumulado).
- Las fases pueden vincularse a códigos `1F` de NBR 15965 como metadato de clasificación del tipo de etapa, pero ese vínculo es opcional y no afecta el cálculo.

**MVP:** No hay módulo de fases. El presupuesto es una lista plana sin dimensión temporal.

**Post-MVP:** Se agrega el módulo de fases con curva S. El diseño del módulo debe ser coherente con el modelo de datos base para no requerir migración disruptiva.

### Consecuencias

- El modelo de datos del MVP debe prever una columna `fase_id` nullable en la tabla de asignaciones, aunque no se use hasta post-MVP. Esto evita una migración de esquema más adelante.
- El `1F` de NBR 15965 está disponible en el catálogo como facet de clasificación, pero no genera lógica especial en el MVP.
- El módulo de flujo de caja es una funcionalidad diferenciadora importante para el Perfil 2 (empresas constructoras) que justifica su implementación en V2 completo.

---

## ADR-008 — Repositorio y protocolo de control de versiones

**Estado:** Aceptado  
**Pregunta original:** ¿Usamos el repositorio de V0 o creamos uno nuevo? ¿Cómo evitamos volver a perder trabajo por una operación incorrecta de "backup"?

### Contexto

En V0 se perdió aproximadamente una semana de trabajo. La causa fue que al pedir "crear un backup completo antes de aplicar un renombrado", el agente de IA interpretó "backup" como una copia local de carpeta — no como un commit de git. El repositorio de GitHub no recibió nada. Cuando la operación fue mal, el "backup" disponible era el último commit que había llegado a GitHub, que tenía una semana de antigüedad.

El problema de fondo tiene dos dimensiones:

1. **Protocolo de trabajo:** la frase "backup" es ambigua. Para un agente de IA puede significar una copia de carpeta local. Para git, el único backup que importa es un commit pusheado a GitHub.
2. **Verificación humana:** el usuario no tiene suficiente conocimiento de git para verificar independientemente que el repositorio remoto está en el estado correcto. Si el agente hizo algo incorrecto, el usuario no puede detectarlo.

### Decisión

**Sobre el repositorio:**

Se crea un **repositorio nuevo** para V2. No se reutiliza el repositorio de V0.

Razones:
- Historial limpio desde el primer commit. No hay que navegar entre código de V0 y V2 mezclado.
- Libertad total para elegir el nombre del proyecto sin arrastrar la URL vieja.
- Sin riesgo de contaminación: ninguna rama, tag ni configuración de V0 puede interferir.
- Más simple de gestionar para alguien con poco conocimiento de git.

El repositorio de V0 **no se borra**. Se archiva usando la función "Archive repository" de GitHub (Settings → General → Danger Zone → Archive this repository). Esto lo convierte en **solo lectura**: nadie puede hacer push accidental, aparece una leyenda "Archived" visible, y todo el historial queda disponible como referencia permanente. El URL original sigue funcionando.

**Sobre el protocolo de commits:**

La regla central es: **push = guardado real**. Un commit que existe solo en el disco local no es un backup — puede perderse si la computadora falla o si se corre una operación destructiva. El único estado que cuenta como "guardado" es el que aparece en `github.com`.

Reglas obligatorias que todo agente de IA debe seguir en este proyecto:

1. **Al final de cada sesión de trabajo:** siempre hacer `git add -A && git commit -m "..." && git push` antes de terminar. No existe "lo termino en la próxima sesión sin commitear".

2. **Antes de cualquier operación riesgosa** (renombrar el proyecto, reestructurar carpetas, cambiar configuración de git, borrar archivos en masa): la secuencia obligatoria es:
   - `git add -A && git commit -m "checkpoint antes de [operación]" && git push`
   - Reportar al usuario: "Hice push. El último commit en GitHub dice: `[mensaje exacto]`. Podés verificarlo en `github.com/[usuario]/[repo]`."
   - Esperar confirmación del usuario antes de continuar.
   - Recién ahí ejecutar la operación riesgosa.

3. **Lenguaje:** nunca usar la palabra "backup" para referirse a una copia de archivos local. Si el usuario pide "hacer un backup", interpretar siempre como "commit y push a GitHub".

4. **Verificación:** cuando el agente reporta que "guardó" o "hizo backup", siempre incluir el mensaje exacto del último commit visible en GitHub — no en el disco local. Esto permite al usuario verificar en el navegador sin saber git.

### Por qué no se archiva V0 borrando ramas

GitHub Archive es la opción correcta (y no borrar ramas) porque:
- La función Archive de GitHub es reversible — se puede "desarchivar" si alguna vez se necesita.
- No requiere conocer git para aplicarla — es una acción en la interfaz web.
- Preserva todo: código, issues, commits, README. Funciona como memoria histórica del proyecto.

### Consecuencias

- El primer commit del repositorio nuevo es el `CLAUDE.md` con la estructura de carpetas vacía — no código.
- El protocolo de commit+push es una **regla de módulo** al mismo nivel que "ningún módulo escribe en la tabla de otro". No es una sugerencia.
- El usuario puede verificar el estado del repositorio en cualquier momento entrando a `github.com/[usuario]/cost-mapper` en el navegador — si el último commit refleja la sesión actual, el trabajo está seguro.
- El repositorio de V0 permanece en GitHub indefinitely como referencia. Su URL no cambia.

---

## Registro de decisiones

| ADR | Título                                              | Estado           |
| --- | --------------------------------------------------- | ---------------- |
| 001 | Identificación y trazabilidad de ítems              | Aceptado         |
| 002 | Fuente primaria del catálogo TCPO                   | Aceptado         |
| 003 | Traducción y preparación del catálogo               | Aceptado         |
| 004 | Flujo de trabajo IFC: importación y sincronización  | Aceptado         |
| 005 | Formatos de entregable del presupuesto              | Aceptado         |
| 006 | Extensibilidad y documentación para desarrolladores | Aceptado         |
| 007 | Flujo de caja y fases de ejecución                  | Propuesto (post-MVP) |
| 008 | Repositorio y protocolo de control de versiones     | Aceptado         |

## Documentos pendientes derivados de estos ADRs

| Documento                  | Motivación                                                                                       | Prioridad |
| -------------------------- | ------------------------------------------------------------------------------------------------ | --------- |
| ~~`ARQUITECTURA.md`~~      | ✅ Creado                                                                                         | Alta      |
| ~~`STACK-TECNOLOGICO.md`~~ | ✅ Creado                                                                                         | Alta      |
| Plantilla Revit .rte       | ADR-004 — recurso de compatibilidad IFC, post-MVP                                                | Media     |
| `ai-skills/` (incremental) | ADR-006 — skills creados junto con la ejecución del código, no pre-definidos                     | Media     |
