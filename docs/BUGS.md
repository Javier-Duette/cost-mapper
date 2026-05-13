# BUGS

## Catálogo de ítems

- [x] APU: al agregar/editar insumos no se recalculaba el total del ítem (ahora recalcula `unit_price` desde el APU y la UI refresca el ítem).
- [x] Ya se calculan los precios cuando se editan o agregan insumos, pero tambien si se edita el precio total se ignoran los insumos, esto puede implementarse pero debe aparecer una advertencia, de que si se pone ahi el precio los insumos ya no sirven de nada. osea esta opciones es solo para casos especiales y para items que realmente no tiene insumos. hay que diferenciar eso
- [x] Crear ítem: la unidad era texto libre (ahora dropdown con unidades soportadas).
- [x] Eliminar ítems: no existía funcionalidad (ahora `DELETE /api/catalog/items/{id}` + botón en panel; devuelve 409 si está referenciado por Biblioteca/Mapeo o como insumo).
- [x] No tengo como saber en que items un insumo esta asignado podemos implementar una forma de verlo (botón "Usos" en cada fila APU abre detalle inline con los ítems padre; endpoint `GET /api/catalog/items/{id}/used-in`).

## Presupuesto

- [x] Hay demasiados decimales dentro de IFC (Mapeo) y simbolos raros en toda la herramienta

## Mapeo IFC

- [x] Remapear un ítem ya mapeado (por grupo): ahora en tab **Asignados (manual)** se puede **reasignar grupo** (sobrescribe asignaciones previas del grupo).
- [x] Ahora mismo solo se puede remapear un elemento y no se puede desmapear ese elemento — botón "Desmapear grupo" en tab Asignados (manual) llama `POST /mapping/groups:unassign` y devuelve el grupo a Sin asignar.
- [x] Cuando entro a los elementos asignados no puedo ver la desc del item al que esta asignado solo veo el codigo — columna ITEM en `MappingGroupsTable` ahora muestra `nbr_code — description_es` (truncado con tooltip).

## Utilidades para pruebas

- `scripts/seed_demo_prices.py`: normaliza unidades y asigna precios demo a todos los work items sin precio (y elimina work items con unidad no soportada en la DB local).
