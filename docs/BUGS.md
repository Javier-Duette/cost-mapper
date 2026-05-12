# BUGS

## Catálogo de ítems

- [x] APU: al agregar/editar insumos no se recalculaba el total del ítem (ahora recalcula `unit_price` desde el APU y la UI refresca el ítem).
- [x] Crear ítem: la unidad era texto libre (ahora dropdown con unidades soportadas).
- [x] Eliminar ítems: no existía funcionalidad (ahora `DELETE /api/catalog/items/{id}` + botón en panel; devuelve 409 si está referenciado por Biblioteca/Mapeo o como insumo).

## Mapeo IFC

- [x] Remapear un ítem ya mapeado (por grupo): ahora en tab **Asignados (manual)** se puede **reasignar grupo** (sobrescribe asignaciones previas del grupo).

## Utilidades para pruebas

- `scripts/seed_demo_prices.py`: normaliza unidades y asigna precios demo a todos los work items sin precio (y elimina work items con unidad no soportada en la DB local).

