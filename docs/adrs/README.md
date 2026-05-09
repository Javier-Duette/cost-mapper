# Decisiones de Arquitectura — Cost-Mapper V2

> **Propósito:** Las preguntas abiertas del proyecto se resuelven aquí como **Architecture Decision Records (ADRs)**. Cada ADR documenta una decisión de diseño: el contexto que generó la pregunta, la alternativa elegida, las razones y las consecuencias. Una vez aceptado, un ADR no se borra: si la decisión cambia, se crea uno nuevo que lo reemplaza y se marca el anterior como `Superado`.

---

## Registro de decisiones

| ADR | Título                                              | Estado               | Archivo |
| --- | --------------------------------------------------- | -------------------- | ------- |
| 001 | Identificación y trazabilidad de ítems              | Aceptado             | [ADR-001](ADR-001.md) |
| 002 | Fuente primaria del catálogo TCPO                   | Aceptado             | [ADR-002](ADR-002.md) |
| 003 | Traducción y preparación del catálogo               | Aceptado             | [ADR-003](ADR-003.md) |
| 004 | Flujo de trabajo IFC: importación y sincronización  | Aceptado             | [ADR-004](ADR-004.md) |
| 005 | Formatos de entregable del presupuesto              | Aceptado             | [ADR-005](ADR-005.md) |
| 006 | Extensibilidad y documentación para desarrolladores | Aceptado             | [ADR-006](ADR-006.md) |
| 007 | Flujo de caja y fases de ejecución                  | Propuesto (post-MVP) | [ADR-007](ADR-007.md) |
| 008 | Repositorio y protocolo de control de versiones     | Aceptado             | [ADR-008](ADR-008.md) |
| 009 | Migración del backend a SQLModel                    | Aceptado             | [ADR-009](ADR-009.md) |
| 010 | Presupuesto manual pre-IFC con `manual_quantity`    | Aceptado             | [ADR-010](ADR-010.md) |
| 011 | Distinción nodos NBR vs ítems TCPO con `is_work_item` | Aceptado           | [ADR-011](ADR-011.md) |
| 012 | Extracción TCPO V15 con LLM Vision y crop local de tablas | Aceptado       | [ADR-012](ADR-012.md) |
| 013 | `AGENTS.md` como fuente canonica para agentes IA      | Aceptado             | [ADR-013](ADR-013.md) |
| 014 | IFC-first para mapeo; keynotes como export opcional   | Aceptado             | [ADR-014](ADR-014.md) |

## Documentos pendientes derivados de estos ADRs

| Documento                  | Motivación                                                                                       | Prioridad |
| -------------------------- | ------------------------------------------------------------------------------------------------ | --------- |
| ~~`ARQUITECTURA.md`~~      | ✅ Creado                                                                                         | Alta      |
| ~~`STACK-TECNOLOGICO.md`~~ | ✅ Creado                                                                                         | Alta      |
| Plantilla Revit .rte       | ADR-004 — recurso de compatibilidad IFC, post-MVP                                                | Media     |
| `ai-skills/` (incremental) | ADR-006 — skills creados junto con la ejecución del código, no pre-definidos                     | Media     |

## Cómo agregar un nuevo ADR

1. Crear un archivo `ADR-0XX.md` en esta carpeta con la plantilla de abajo
2. Agregar la fila correspondiente en la tabla de arriba
3. Referenciar el ADR en `AGENTS.md` si afecta archivos protegidos o reglas de agentes

```markdown
## ADR-0XX — [Título de la decisión]

**Estado:** Propuesto | Aceptado | Superado
**Pregunta original:** ¿[La duda que generó la decisión]?

### Contexto
[Por qué surgió esta decisión. Qué alternativas se consideraron y descartaron.]

### Decisión
[Qué se decidió. Ser específico — no solo el qué sino el por qué.]

### Consecuencias
[Qué implica esta decisión. Qué queda pendiente o cambia en el resto del sistema.]
```
