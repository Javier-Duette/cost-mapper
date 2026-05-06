# Guía Técnica: buildingSMART Data Dictionary (bSDD) y su rol en Cost-Mapper

Para que **Cost-Mapper** sea una herramienta verdaderamente inteligente, no solo debe conocer los códigos de la **NBR 15965**, sino que debe saber cómo esos códigos se relacionan con el resto del mundo. Aquí es donde entra el **bSDD**.

## 1. ¿Qué es el bSDD?

El **buildingSMART Data Dictionary (bSDD)** es un servicio en línea (una biblioteca basada en la nube) que aloja clasificaciones, diccionarios de datos y sus propiedades. Es gestionado por **buildingSMART International**.

Piénsalo como una "Wikipedia de datos técnicos" para BIM, pero diseñada para ser leída por máquinas, no solo por humanos.

### El problema que resuelve:

Imagina que un arquitecto en Brasil clasifica un material como *"Concreto C25"* (usando NBR 15965) y un calculista en Paraguay necesita presupuestarlo usando una base de datos local. Sin un diccionario común, la computadora no entiende que ambos hablan de lo mismo. El bSDD actúa como el **traductor universal**.

## 2. ¿Cómo funciona técnicamente?

El bSDD utiliza una tecnología llamada **Web Semántica**. Cada concepto (como un ítem de la NBR 15965) recibe una **URI** (Uniform Resource Identifier), que es una dirección web única.

### Estructura de un concepto en bSDD:

- **Nombre:** Arena Fina.

- **Clasificación:** NBR 15965-4 (2C 02...).

- **UUID:** `bbb243d5-e177-45be-a555...`

- **URI:** `https://identifier.buildingsmart.org/uri/abnt/nbr15965/...`

- **Propiedades vinculadas:** Densidad, costo unitario base, huella de carbono.

## 3. La conexión: NBR 15965 + bSDD

La norma brasileña **ABNT NBR 15965** ya está siendo integrada en el bSDD. Esto significa que:

1. Los **UUIDs** que viste en la Parte 4 de la norma son los mismos que están registrados en los servidores de buildingSMART.

2. Cualquier software puede consultar la API del bSDD para descargar automáticamente la jerarquía completa de la norma sin necesidad de cargar PDFs manualmente.

## 4. ¿Cómo ayudará el bSDD a nuestro proyecto Cost-Mapper?

Para nuestro gestor de costos, el bSDD es un **multiplicador de potencia**:

### A. Mapeo Automático de Costos

Si un modelo IFC llega a **Cost-Mapper** con una clasificación bSDD, nuestro software puede identificar instantáneamente qué es el objeto, buscar su UUID y sugerir automáticamente el Análisis de Precio Unitario (APU) correcto.

### B. Enriquecimiento de Datos

A través del bSDD, **Cost-Mapper** puede obtener propiedades técnicas que no están en el modelo 3D (ej. pesos específicos, coeficientes de desperdicio estándar) consultando el diccionario global en tiempo real.

### C. Compatibilidad Cross-Standard

Si un cliente en Paraguay quiere ver el presupuesto en formato **Uniclass 2015** (UK) en lugar de **NBR 15965**, el bSDD permite que **Cost-Mapper** haga esa traducción automáticamente, ya que ambos sistemas están mapeados al mismo concepto raíz en el diccionario global.

## 5. Resumen para el equipo de desarrollo

| **Característica**  | **Impacto en Cost-Mapper**                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Acceso vía API**  | No necesitamos "picar" datos; consumimos la norma directamente de la nube.                                |
| **Estandarización** | Cost-Mapper se convierte en un software "Standard-Compliant".                                             |
| **Escalabilidad**   | Hoy usamos NBR 15965, mañana podemos añadir cualquier norma del mundo sin cambiar el código del software. |

**Conclusión:** El bSDD es el ecosistema donde viven los UUIDs. Al integrar **Cost-Mapper** con bSDD, estamos creando un software que no solo calcula costos, sino que gestiona información digital de alto valor.
