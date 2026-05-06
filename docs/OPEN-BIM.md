# Open BIM — El ecosistema donde vive Cost-Mapper

## 1. ¿Qué es BIM?

**BIM (Building Information Modeling)** no es un software. Es una metodología de trabajo en la que toda la información de un proyecto de construcción — geometría, materiales, costos, tiempos, mantenimiento — se almacena en un modelo digital único y coherente a lo largo de todo el ciclo de vida del edificio.

Un modelo BIM no es un dibujo en 3D. Es una base de datos con forma de edificio. Un muro en BIM no es solo una representación visual: sabe de qué está hecho, cuánto cuesta, cuándo se construyó y qué le pasa cuando el edificio envejece.

Las dimensiones del BIM representan capas de información sobre ese modelo:

- **3D:** La geometría del edificio.
- **4D:** El cronograma de obra vinculado a la geometría.
- **5D:** El costo vinculado a la geometría — el territorio de Cost-Mapper.
- **6D:** La sostenibilidad y eficiencia energética.
- **7D:** La gestión del activo durante su vida útil (Facility Management).

## 2. El problema: los silos de datos

Durante décadas, cada software de construcción habló su propio idioma. El arquitecto diseñaba en Revit, el estructurista calculaba en SAP2000, el presupuestador trabajaba en Excel, y el contratista tenía sus propias planillas. Cada disciplina vivía en un silo.

El resultado era siempre el mismo: información duplicada, errores de traducción entre programas, presupuestos que no coincidían con los planos, y nadie responsable de la coherencia global.

## 3. La solución: Open BIM

**Open BIM** es el movimiento liderado por **buildingSMART International** que propone resolver ese problema con tres principios:

**Estándares abiertos:** Formatos de archivo que cualquier software puede leer y escribir, sin depender de un proveedor específico. El más importante es el **IFC (Industry Foundation Classes)**, un estándar ISO que describe cualquier elemento de construcción de forma universal.

**Identificadores únicos:** Cada concepto — un material, un servicio, un elemento constructivo — tiene un **UUID** que lo identifica de forma inequívoca en cualquier sistema del mundo. Independientemente del idioma, del país o del software, ese UUID siempre apunta al mismo concepto.

**Diccionarios compartidos:** El **buildingSMART Data Dictionary (bSDD)** es el repositorio en la nube donde viven esos UUIDs y sus definiciones. Si un software en Paraguay y otro en Alemania usan el mismo UUID, ambos saben que están hablando del mismo objeto.

## 4. Por qué Open BIM importa en Paraguay

Paraguay está en un momento de inflexión. El sector público (MOPC, MSPBS, SENAVE) empieza a exigir BIM en licitaciones de infraestructura. El sector privado mira hacia Brasil y Argentina, donde la metodología ya está más consolidada.

Sin embargo, el mercado local tiene un obstáculo real: **las herramientas BIM disponibles son costosas, están en inglés o portugués, y están diseñadas para realidades de mercado muy distintas a la paraguaya.** Un presupuestador en Asunción trabaja con precios de Mandu'a en Guaraníes, con ítems del MOPC, con especificaciones locales. Los softwares BIM 5D del mercado no hablan ese idioma.

El resultado es que muchos profesionales paraguayos usan BIM para el diseño (3D) pero siguen presupuestando en Excel. La brecha entre el modelo y el costo es manual, lenta y propensa a errores. **El BIM 5D no ha llegado al mercado paraguayo en serio.**

## 5. Dónde vive Cost-Mapper en este ecosistema

Cost-Mapper es una herramienta **Open BIM nativa**. Esto significa tres cosas concretas:

**Lee el estándar, no un formato propietario.** Cost-Mapper importa archivos IFC — el estándar abierto — no archivos de Revit, Archicad o cualquier otro software específico. Si el modelo viene de Revit, ArchiCAD, Allplan o cualquier otra herramienta que exporte IFC, Cost-Mapper lo lee. El usuario no está atado a ningún fabricante.

**Usa UUIDs para vincular el modelo al costo.** Cuando Cost-Mapper asocia un muro del modelo IFC con una partida de presupuesto, esa asociación se hace a través de UUIDs — los identificadores de la **ABNT NBR 15965**, la norma de clasificación de la información de la construcción. Eso significa que el vínculo entre geometría y costo sobrevive a actualizaciones de software, cambios de versión y migraciones de datos.

**Es open source.** El código de Cost-Mapper es público, modificable y extensible. Cualquier profesional, empresa o institución puede adaptarlo a sus necesidades sin pagar licencias. Esto es coherente con la filosofía Open BIM: el conocimiento de la construcción debe ser abierto.

## 6. La cadena de estándares de Cost-Mapper

Cost-Mapper no inventa sus propias reglas. Se apoya en estándares internacionales existentes y los conecta con la realidad local:

```
ISO 12006-2 (marco conceptual internacional)
       ↓
ABNT NBR 15965 (clasificación brasileña, aplicable al Mercosur)
       ↓  codifica con UUIDs registrados en
bSDD (buildingSMART Data Dictionary)
       ↓  vincula objetos de
IFC (Industry Foundation Classes — ISO 16739)
       ↓  leído por
Cost-Mapper
       ↓  cruzado con
TCPO V14/V15 + Mandu'a (datos de costos localizados en Gs.)
       ↓  produce
Presupuesto en el idioma del mercado paraguayo
```

Esta cadena es lo que diferencia Cost-Mapper de una hoja de cálculo sofisticada: cada guaraní del presupuesto está respaldado por un estándar internacional y trazable hasta el objeto del modelo 3D.

## 7. Lo que Cost-Mapper no pretende ser

Es importante delimitar el alcance para mantener la coherencia del proyecto.

Cost-Mapper **no es** un software de modelado BIM. No reemplaza a Revit, ArchiCAD ni ninguna herramienta de autoría de modelos. El usuario sigue diseñando donde siempre diseñó.

Cost-Mapper **no es** un software de gestión de proyectos completo. No reemplaza MS Project ni herramientas de planificación 4D. Se enfoca exclusivamente en el 5D: el vínculo entre el modelo y el costo.

Cost-Mapper **es** el eslabón que faltaba en el flujo de trabajo BIM paraguayo: la herramienta que toma un modelo IFC y produce un presupuesto normalizado, trazable y en el idioma del mercado local.
