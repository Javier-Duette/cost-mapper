# Cost-Mapper

**Open source BIM 5D cost management for Paraguay**

Cost-Mapper vincula modelos IFC 3D con presupuestos de construcción usando el estándar de clasificación NBR 15965 como puente entre el modelo y el catálogo de ítems. El catálogo base proviene de la TCPO V15 adaptada al mercado local con precios de Mandu'a en Guaraníes.

## Flujo principal

```
Modelo IFC (Revit) → Cost-Mapper → Presupuesto con APUs → Export PDF/Excel
```

1. Importar un modelo IFC
2. Mapear elementos 3D a ítems del catálogo NBR 15965
3. Calcular el presupuesto automáticamente con sus APUs
4. Exportar el informe

## Stack

- **Backend:** Python 3.11 · FastAPI · ifcopenshell · PostgreSQL
- **Frontend:** TypeScript · React · @thatopen/components (visor IFC)
- **ETL:** Python · Gemini API (clasificación NBR)

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — punto de entrada para agentes de IA y desarrolladores
- [`DEVLOG.md`](DEVLOG.md) — log cronológico de sesiones
- [`docs/DUDAS.md`](docs/DUDAS.md) — decisiones de arquitectura (ADRs)
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — módulos del sistema
- [`docs/MODELO-DE-DATOS.md`](docs/MODELO-DE-DATOS.md) — schema PostgreSQL

## Cómo empezar

Ver [`CLAUDE.md`](CLAUDE.md) sección "Cómo correr el proyecto".

## Licencia

MIT — ver `LICENSE`
