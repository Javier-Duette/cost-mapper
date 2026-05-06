# Estado Real de los Datos: TCPO V14, TCPO V15 y NBR 15965

> **Este documento reemplaza la línea de intención que existía antes.** Registra el inventario exacto de datos disponibles, lo que falta, y las estrategias concretas para resolver el problema más crítico del proyecto: la ausencia de UUIDs en los datos de la TCPO V14.

---

## 1. La confusión que hundió V0 — documentada formalmente

El archivo `tcpo-versao-15.xlsx` con la hoja `VOLARE-15_NOV2018` **contiene datos TCPO V14**, no V15. "VOLARE" es el nombre del software de presupuestos de Editora PINI; "15" en el nombre de la hoja es la versión del software, no de la TCPO.

La **TCPO V15 real** es la edición que restructuró el catálogo adoptando el sistema de clasificación **OmniClass / ABNT NBR 15965**, asignando un código NBR y un UUID a cada ítem. Esa edición existe actualmente solo como **PDF** (`538948707-TCPO-BIM-15-Edicao.pdf`), no como un Excel estructurado con campos de UUID separados.

Sin UUID, no hay vínculo con IFC. Sin vínculo con IFC, no hay BIM 5D. Esta fue la causa raíz del abandono de V0.

---

## 2. Inventario de datos disponibles hoy

### 2.1 TCPO V14 (datos en mano, ya procesados)

| Métrica                                     | Valor                                         |
| ------------------------------------------- | --------------------------------------------- |
| Partidas totales cargadas                   | 40.446                                        |
| Códigos únicos totales                      | 11.599                                        |
| Códigos únicos MAT. (materiales)            | 3.679                                         |
| Códigos únicos M.O. (mano de obra)          | 46                                            |
| Códigos únicos SER.* (servicios compuestos) | 5.846                                         |
| Traducciones PT→ES completadas              | ~29.500 (73%)                                 |
| Clasificación relevancia Paraguay           | ~25.100 ítems                                 |
| Formato                                     | Excel VOLARE, cargado en SQLite               |
| Sistema de codificación                     | Alfanumérico propio V14 (`05.101.000010.SER`) |
| **UUIDs NBR 15965**                         | **Ninguno**                                   |

### 2.2 NBR 15965 — Análisis detallado de los archivos disponibles

Se analizaron las 5 partes disponibles en Excel. Resultado:

| Parte              | Descripción                     | Ítems     | UUIDs      | Facetas    | Estado                             |
| ------------------ | ------------------------------- | --------- | ---------- | ---------- | ---------------------------------- |
| **Parte 2** (2012) | Características de los objetos  | 1.388     | ❌ 0%       | 0M         | Edición antigua, formato diferente |
| **Parte 3** (2014) | Procesos de la construcción     | 643       | ❌ 0%       | 1F, 1S, 1D | Sin UUIDs en el Excel              |
| **Parte 4** (2021) | **Recursos de la construcción** | **4.497** | ✅ **100%** | 2C, 2N, 2Q | El más útil — UUIDs completos      |
| **Parte 5** (2022) | Resultados de la construcción   | 1.017     | ❌ 0%       | 3E, 3R     | Sin UUIDs en el Excel              |
| **Parte 6** (2022) | Unidades y espacios             | 2.533     | ❌ 0%       | 4U, 4A     | Sin UUIDs en el Excel              |

**Conclusión clave:** Solo la **Parte 4 (Recursos)** tiene UUIDs completos. Es la parte más relevante para el puente TCPO, ya que cubre materiales (2C), equipos (2Q) y funciones/roles (2N).

#### Desglose de Parte 4 por faceta

| Faceta | Descripción             | Ítems con UUID | Relevancia para TCPO V14               |
| ------ | ----------------------- | -------------- | -------------------------------------- |
| **2C** | Componentes / Productos | 3.735          | ★★★ — cubre los ítems `MAT.` de V14    |
| **2Q** | Equipos                 | 609            | ★★☆ — cubre `EQ.AQ.` y `EQ.LOC` de V14 |
| **2N** | Funciones / Roles       | 153            | ★☆☆ — cubre parcialmente `M.O.` de V14 |

Ejemplos de categorías 2C de nivel 1 (todas con UUID):

- `2C 04` → Productos para ejecución de estructuras y cerramientos
- `2C 10` → Productos para acabados internos
- `2C 78` → Productos para instalaciones hidráulico-sanitarias
- `2C 82` → Productos para instalaciones eléctricas e iluminación

### 2.3 TCPO V15 — Solo en PDF

El archivo `538948707-TCPO-BIM-15-Edicao.pdf` existe pero no está en formato machine-readable con campos separados. Para extraer los códigos NBR 15965 que la V15 asigna a cada partida, habría que aplicar un pipeline de extracción de PDF. No se conoce aún si el PDF es vectorial (texto extraíble) o rasterizado (imagen con OCR requerido).

**Estado:** Fuente de verdad disponible como referencia humana, pero no como dato importable directamente hasta verificar su tipo y aplicar el pipeline correspondiente.

---

## 3. El problema técnico real — por qué el mapeo es difícil

### 3.1 NBR 15965 es una taxonomía, no un catálogo de productos

La TCPO V14 contiene ítems muy específicos con especificaciones técnicas:

- `"Areia fina lavada"`
- `"Eletroduto de aço com costura galvanização eletrolítica Ø 2 1/2""` 
- `"Tubo corrugado PEAD para drenagem Ø 900 mm"`

La NBR 15965 Parte 4 contiene **categorías de clasificación**:

- `2C 82 xx xx` → "Produtos para instalações elétricas"
- `2C 78 22 00` → "Tubos e conexões para drenagem"

El mapeo no es ítem-a-ítem, es **ítem-a-categoría**. Miles de ítems TCPO concretos corresponden a una misma categoría NBR. La relación es muchos-a-uno.

### 3.2 El matching por palabras clave es insuficiente

Se probó matching por superposición de vocabulario entre los 3.681 ítems MAT. de V14 y los 3.735 ítems 2C de Parte 4. Resultado: falsos positivos constantes. Las especificaciones técnicas de V14 (diámetros, marcas, normas de material) no tienen correlato en los nombres abstractos de las categorías NBR. El matching léxico simple no funciona.

### 3.3 Los servicios SER.* son el caso más difícil

Los 5.846 servicios compuestos de V14 (SER.CG, SER.MO, SER.CH) representan actividades constructivas completas. Deberían mapearse a la Parte 3 (Procesos / 1S) o Parte 5 (Resultados / 3E). Problema: **ninguna de esas partes tiene UUIDs en los Excel disponibles**. El mapeo de servicios quedará sin UUID oficial hasta que ABNT publique esas partes actualizadas o hasta que se extraiga la información del PDF V15.

---

## 4. Estrategias propuestas — Vinculación V14 → NBR 15965

### Estrategia A — Clasificación semántica con IA (Recomendada para MVP)

**Concepto:** Usar Gemini para clasificar cada ítem único de V14 dentro del árbol de categorías NBR 15965 Parte 4, asignando el código y UUID de la categoría más apropiada.

**Proceso:**

1. Tomar la descripción PT (y ES si disponible) del ítem V14.
2. Proveer al modelo el árbol de categorías NBR Parte 4 relevante según la clase del ítem.
3. El modelo responde con el código NBR más apropiado + nivel de confianza (0-100).
4. Almacenar el UUID correspondiente con `classification_source: "gemini_auto"` y `confidence`.
5. Ítems con confianza < 70 entran a cola de revisión humana.

**Escala y costo estimado:**

| Clase V14       | Ítems únicos | Faceta NBR destino | Lotes (8 ítems) | Costo API est. |
| --------------- | ------------ | ------------------ | --------------- | -------------- |
| MAT.            | 3.679        | 2C (3.735 ítems)   | ~460            | ~$0.50         |
| EQ.AQ. / EQ.LOC | ~600         | 2Q (609 ítems)     | ~75             | ~$0.10         |
| M.O.            | 46           | 2N (153 ítems)     | ~6              | despreciable   |
| **Total**       | **~4.325**   |                    | **~540**        | **~$0.60**     |

**Ventajas:**

- Ejecutable con el pipeline Gemini ya construido en V0.
- Costo insignificante.
- Todos los ítems MAT. y EQ. quedan con UUID oficial de la NBR.
- El UUID es de categoría, suficiente para BIM 5D a nivel de presupuesto.

**Limitación para SER.*:** Los servicios no tienen UUID disponible en las partes correspondientes. Se clasifican temáticamente (asignando el código NBR Parte 5 más cercano) pero se marcan `uuid_disponible: false` hasta resolución.

**Script reusable de V0:** `src/gemini_client.py` con nuevo prompt de clasificación.

---

### Estrategia B — Extracción del PDF TCPO V15 (Alta fidelidad, post-MVP)

**Concepto:** Extraer del PDF `TCPO-BIM-15-Edicao.pdf` los pares (código V14 / descripción → código NBR V15 → UUID) que la editorial ya asignó oficialmente.

**Pre-requisito crítico:** Verificar el tipo de PDF.

- Si es **vectorial** (texto extraíble con pdftotext): pipeline directo con parser.
- Si es **rasterizado** (imagen): requiere OCR + validación, mucho mayor esfuerzo y margen de error.

**Proceso si vectorial:**

1. Extraer texto con pdftotext.
2. Identificar el patrón de tablas (código V15 | descripción | código NBR | UUID).
3. Construir parser para ese patrón.
4. Cruzar resultados con ítems V14 por descripción normalizada.
5. Reemplazar clasificaciones automáticas de Estrategia A con las oficiales V15.

**Ventajas:** Máxima fidelidad. Cubre SER.* con sus códigos NBR. Es la fuente de datos que la editorial ya verificó.

**Cuándo ejecutar:** Después del MVP. Primero validar la viabilidad del PDF antes de invertir ingeniería.

---

### Estrategia C — API bSDD (Enriquecimiento opcional)

**Concepto:** Usar la API pública de buildingSMART Data Dictionary para confirmar y enriquecer los UUIDs con URIs canónicas bSDD.

**Uso recomendado:** No como estrategia principal, sino como paso de validación post-clasificación. Si el ítem tiene UUID asignado por Estrategia A, consultar bSDD para verificar si ese código NBR tiene URI canónica registrada. Si existe, agregarla como `bsdd_uri` en la base de datos.

**Limitación:** La integración de la NBR 15965 en bSDD puede estar incompleta en las partes sin UUID.

---

## 5. Decisión recomendada

### Para el MVP de Cost-Mapper V2

Implementar **Estrategia A** para las clases MAT., EQ.AQ. y M.O.:

- ~4.325 ítems únicos clasificados con UUID NBR oficial.
- Costo total < $1 en API.
- Tiempo de ejecución: un script de ~2 horas corriendo en background.
- Los servicios SER.* se clasifican temáticamente sin UUID, marcados como pendientes.

### Para Cost-Mapper V2 completo (post-MVP)

Verificar el tipo del PDF TCPO V15 e implementar **Estrategia B** para reemplazar clasificaciones automáticas con datos oficiales del editor, especialmente para cubrir los servicios SER.*.

---

## 6. Tabla resumen ejecutiva

| Clase V14                    | Ítems únicos | Datos NBR disponibles | UUID posible | Acción V2                          |
| ---------------------------- | ------------ | --------------------- | ------------ | ---------------------------------- |
| MAT.                         | 3.679        | Parte 4 / 2C ✅        | ✅ Sí         | Estrategia A                       |
| EQ.AQ. / EQ.LOC              | ~600         | Parte 4 / 2Q ✅        | ✅ Sí         | Estrategia A                       |
| M.O.                         | 46           | Parte 4 / 2N ✅        | ✅ Sí         | Estrategia A                       |
| SER.CG / SER.MO / SER.CH     | 5.846        | Parte 3/5 (sin UUID)  | ❌ No aún     | Clasificación temática + pendiente |
| TCPO V15 (códigos oficiales) | Desconocido  | PDF disponible        | Sí (en PDF)  | Estrategia B post-MVP              |
