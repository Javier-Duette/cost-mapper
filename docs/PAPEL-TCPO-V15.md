# TCPO v15: El Motor Unificado de Cost-Mapper

En el ecosistema de **Cost-Mapper**, la **TCPO v15 (Tabela de Composições de Preços para Orçamentos - Edición BIM)** no actúa como una base de datos externa, sino como el **núcleo de inteligencia de ingeniería**. Su papel es crítico porque es la herramienta que materializa la integración entre la norma de clasificación y el presupuesto real.

## 1. La Fusión Nativa: TCPO + NBR 15965

A diferencia de versiones anteriores, la **TCPO v15** fue reestructurada para ser compatible con la metodología BIM. Su mayor aporte a nuestro proyecto es que ya contiene las relaciones cruzadas:

- **Códigos NBR 15965 integrados:** Cada composición de la TCPO v15 incluye en su ficha los códigos de las tablas de la norma (específicamente de la Parte 4: Recursos y Parte 5: Resultados).

- **Papel en Cost-Mapper:** Esto elimina la necesidad de que nosotros realicemos mapeos manuales propensos a errores. El software simplemente realiza una consulta (*query*) directa: "Si el objeto IFC tiene el código NBR X, tráeme la composición TCPO Y".

## 2. El "Cerebro" de los Análisis de Precios Unitarios (APU)

La TCPO v15 provee a **Cost-Mapper** la lógica física de la construcción a través de:

1. **Coeficientes de Consumo:** No nos da solo un precio, nos da la "receta". Cuántas horas de oficial, cuántos kg de cemento y cuántas herramientas se necesitan por unidad de medida.

2. **Rendimientos de Mano de Obra:** Datos estadísticos reales sobre la productividad, fundamentales para conectar el costo (5D) con el cronograma (4D).

3. **Desglose de Insumos:** Permite que Cost-Mapper descomponga un ítem global en una lista de compras detallada.

## 3. Flujo Operativo en el Software

El papel de la TCPO v15 define el flujo de trabajo automatizado de **Cost-Mapper**:

| **Acción del Usuario**      | **Proceso Interno (Cost-Mapper + TCPO v15)**                                             | **Resultado**                |
| --------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- |
| **Carga de IFC**            | El visor lee la propiedad `ClassificationCode` (NBR 15965).                              | Identificación del elemento. |
| **Vinculación Automática**  | Se busca en la base TCPO v15 el ítem que comparta ese código o UUID.                     | Match instantáneo.           |
| **Cálculo de Cantidades**   | El motor de cómputo multiplica la geometría (m3, m2, m) por los coeficientes de la TCPO. | Cantidad de recursos.        |
| **Localización de Precios** | Se aplican los precios en Guaraníes (u otra moneda) a los insumos de la TCPO.            | Presupuesto Final.           |

## 4. Ventaja Estratégica: Estándar Regional

Al usar la TCPO v15 como base de datos maestra, **Cost-Mapper** se posiciona como una herramienta de nivel internacional:

- **Interoperabilidad Total:** Al hablar el idioma de la NBR 15965, el software es compatible con cualquier modelo generado en Revit, Archicad o Allplan que siga estándares internacionales.

- **Transparencia:** Para proyectos públicos en Paraguay (como el Gran Hospital del Sur), Cost-Mapper ofrece una trazabilidad total: cada guaraní del presupuesto está respaldado por una composición técnica normalizada.

## Conclusión

La **TCPO v15** es el plato ya preparado para **Cost-Mapper**. Nos ahorra años de investigación y carga de datos, permitiéndonos enfocarnos en la experiencia de usuario y en la potencia del visor 3D, mientras que la "inteligencia del costo" queda asegurada por la base de datos más prestigiosa de la región ya unificada con la norma BIM.
