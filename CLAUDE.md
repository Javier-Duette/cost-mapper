# CLAUDE.md — Compatibilidad para agentes Claude

> **Estado:** deprecado como fuente canonica. Se conserva solo como puente para
> herramientas que buscan automaticamente `CLAUDE.md`.

La fuente vigente para todos los agentes de IA que trabajan en Cost-Mapper es:

**[`AGENTS.md`](AGENTS.md)**

Antes de proponer cambios, Claude Code debe leer `AGENTS.md` y seguirlo como
briefing operativo completo: contexto del proyecto, skills discovery, ADRs,
reglas de modulo, protocolo de git, convenciones de codigo, archivos protegidos
y cierre de sesion.

## Regla de sincronizacion

- No agregar reglas nuevas en este archivo.
- Si cambia el flujo de trabajo de agentes, actualizar `AGENTS.md`,
  `.agents/skills/cost-mapper-agent/SKILL.md` y, si corresponde,
  `docs/adrs/ADR-013.md`.
- Este archivo solo puede cambiar para mantener claro el puente de compatibilidad.

## Motivo

Cost-Mapper no depende de un unico agente. `AGENTS.md` es el punto de entrada
neutral para Codex, Claude Code, Copilot, Cursor y futuros agentes. La decision
esta documentada en `docs/adrs/ADR-013.md`.
