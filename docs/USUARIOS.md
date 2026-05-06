# Perfiles de Usuario y Casos de Uso — Cost-Mapper

> Este documento define quiénes usarán Cost-Mapper, qué problema resuelve para cada uno, y cómo interactúan con el sistema. Cada decisión de diseño de interfaz, priorización de features y definición del MVP debe poder justificarse volviendo a este documento.

---

## Perfil 1 — El Presupuestador Independiente

**Quién es:** Ingeniero civil o arquitecto que trabaja de forma independiente o en estudios pequeños (1-5 personas). Prepara presupuestos para proyectos privados: viviendas, locales comerciales, pequeños edificios. Su principal herramienta hoy es Excel o una plantilla heredada de un colega.

**Contexto de trabajo:**

- Maneja 3 a 10 proyectos activos en simultáneo.
- No tiene tiempo para aprender herramientas complejas.
- El cliente le pide el presupuesto "para el lunes".
- Conoce BIM de nombre pero nunca lo usó para presupuestar, solo para ver planos en 3D si el arquitecto le manda el modelo.

**Problema que tiene hoy:**
Cada presupuesto empieza desde cero o desde una copia del anterior. Actualizar precios cuando sale la nueva edición de Mandu'a es un trabajo manual ítem por ítem. Si el arquitecto cambia el diseño, hay que recalcular a mano qué cambió. Comete errores por ítems olvidados o mal contados porque extrae las cantidades de los planos 2D a ojo.

**Qué le resuelve Cost-Mapper:**

- Carga el IFC del proyecto y obtiene las cantidades automáticamente sin medir a mano.
- Vincula esas cantidades al catálogo TCPO con precios Mandu'a actualizados.
- Cuando el arquitecto modifica el modelo, recalcula solo lo que cambió.
- Exporta el presupuesto en PDF o Excel listo para entregar al cliente.

**Cómo interactúa con el sistema:**

1. Crea un proyecto nuevo.
2. Sube el archivo IFC exportado desde Revit o ArchiCAD.
3. El sistema extrae los elementos del modelo y sugiere las partidas TCPO correspondientes.
4. Revisa y ajusta los vínculos donde sea necesario.
5. Asigna precios Mandu'a a los ítems.
6. Exporta el presupuesto.

**Feature crítica para este perfil:** La vinculación automática IFC → TCPO debe ser lo suficientemente buena para que la revisión manual sea el 20% del trabajo, no el 80%.

**Feature que NO necesita en el MVP:** Colaboración multi-usuario, visor 3D avanzado, integración con bSDD.

---

## Perfil 2 — El Ingeniero de Obra en Empresa Constructora

**Quién es:** Profesional que trabaja dentro de una empresa constructora mediana o grande. Participa en licitaciones públicas y privadas. Maneja proyectos de mayor escala: edificios de varios pisos, obras de infraestructura, hospitales.

**Contexto de trabajo:**

- La empresa ya tiene equipos de diseño que trabajan en Revit.
- Participa en licitaciones donde el MOPC o la SENAVITAT exige formatos específicos de presupuesto.
- Trabaja en equipo — varias personas editan el presupuesto en paralelo.
- Necesita trazabilidad: saber quién modificó qué y cuándo.

**Problema que tiene hoy:**
El modelo BIM del arquitecto y el presupuesto del ingeniero viven en mundos separados. Cada actualización del modelo requiere reunión, revisión manual y reconciliación. En proyectos grandes, esa brecha cuesta semanas. Las licitaciones públicas exigen formatos de presupuesto muy específicos que hay que armar a mano desde cero.

**Qué le resuelve Cost-Mapper:**

- Vinculación directa y viva entre el modelo IFC y el presupuesto.
- Cuando el modelo se actualiza, el sistema marca qué ítems cambiaron.
- Varios usuarios pueden trabajar en el mismo presupuesto.
- Exportación en formatos compatibles con los requerimientos del MOPC.

**Cómo interactúa con el sistema:**

1. La empresa tiene los proyectos en Cost-Mapper como entorno compartido.
2. El equipo de diseño actualiza el IFC y lo sube al proyecto.
3. Cost-Mapper notifica los cambios que afectan al presupuesto.
4. El ingeniero revisa, aprueba o ajusta los cambios.
5. Genera los informes requeridos para la licitación.

**Feature crítica para este perfil:** Colaboración multi-usuario y control de cambios. El historial de modificaciones es esencial para licitaciones.

**Feature que NO necesita en el MVP:** Esta funcionalidad completa (multi-usuario con historial) es post-MVP. En el MVP, alcanza con que un usuario único pueda hacer el flujo completo.

---

## Perfil 3 — El Estudiante / Profesional en Formación

**Quién es:** Estudiante de los últimos años de ingeniería civil o arquitectura, o profesional joven que está aprendiendo BIM. En Paraguay, las universidades están empezando a incorporar BIM en sus currículos pero aún hay muy poca práctica real.

**Contexto de trabajo:**

- No tiene presupuesto para licencias de software costosas.
- Quiere aprender el flujo de trabajo BIM 5D para ser más empleable.
- Trabaja en proyectos académicos o de práctica, no en proyectos reales pagos.
- Tiene más tiempo que los profesionales y más tolerancia para explorar el sistema.

**Problema que tiene hoy:**
Las herramientas BIM 5D del mercado cuestan cientos o miles de dólares anuales. Nadie le enseña el flujo completo en la universidad porque no hay software accesible para hacerlo en clase. Aprende BIM de forma incompleta — solo el modelado 3D, nunca el costo.

**Qué le resuelve Cost-Mapper:**

- Acceso gratuito a una herramienta BIM 5D real, sin límites de uso.
- Aprende el flujo completo: modelo → cantidades → partidas → presupuesto.
- El catálogo TCPO le da contexto sobre cómo se descompone el costo real de una obra.
- Puede llevar ese aprendizaje a su primer trabajo.
- <mark>Puede adaptar el software a su necesidad (open source)</mark>

**Cómo interactúa con el sistema:**
Igual que el Perfil 1, pero con modelos de práctica más simples. Le importa especialmente el explorador de ítems TCPO para entender la composición de las partidas.

**Feature crítica para este perfil:** Que el sistema sea intuitivo sin necesitar capacitación previa. El explorador de catálogo y la visualización de la composición de las APUs son muy relevantes aquí.

**Feature que NO necesita:** Exportación en formatos MOPC, colaboración multi-usuario.

---

## Perfil 4 — El Organismo Público / Fiscalizador

**Quién es:** Técnico del MOPC, MSPBS, Gobernaciones o municipios que recibe presupuestos de licitaciones y necesita verificarlos o compararlos. También puede ser un auditor que revisa que el presupuesto de una obra pública sea coherente con los precios del mercado.

**Contexto de trabajo:**

- No genera presupuestos, los recibe y los verifica.
- Necesita comparar el presupuesto presentado contra un precio de referencia.
- Le importa la trazabilidad: cada ítem debe tener respaldo técnico.
- Las obras grandes se licitan con requisitos de estandarización crecientes.

**Problema que tiene hoy:**
Verificar un presupuesto de licitación es un proceso manual que puede tomar días. Comparar precios unitarios contra referencias de mercado es laborioso. La heterogeneidad de formatos entre distintos oferentes hace la comparación aún más difícil.

**Qué le resuelve Cost-Mapper:**

- Un presupuesto generado con Cost-Mapper tiene trazabilidad completa: cada ítem tiene su partida TCPO, su composición de insumos y su precio referenciado a Mandu'a.
- El formato estandarizado facilita la comparación entre oferentes.
- En el largo plazo: podría importar presupuestos Cost-Mapper directamente para verificación automática.

**Cómo interactúa con el sistema:**
Este perfil es un usuario indirecto en el MVP — recibe los outputs de Cost-Mapper pero no usa la herramienta directamente. En versiones posteriores, podría haber un módulo de revisión.

**Feature crítica para este perfil:** La calidad y estandarización del PDF/Excel exportado. El documento exportado es lo que este perfil recibe.

---

## Resumen: prioridad por perfil para el MVP

| Feature                         | Perfil 1 (Independiente) | Perfil 2 (Empresa) | Perfil 3 (Estudiante) | Perfil 4 (Organismo) |
| ------------------------------- | ------------------------ | ------------------ | --------------------- | -------------------- |
| Carga de IFC                    | ★★★ crítico              | ★★★ crítico        | ★★★ crítico           | —                    |
| Vinculación automática IFC→TCPO | ★★★ crítico              | ★★★ crítico        | ★★ importante         | —                    |
| Explorador de catálogo TCPO     | ★★★ crítico              | ★★ importante      | ★★★ crítico           | —                    |
| Precios Mandu'a en Gs.          | ★★★ crítico              | ★★★ crítico        | ★☆ útil               | ★★★ crítico          |
| Exportación PDF/Excel           | ★★★ crítico              | ★★★ crítico        | ★☆ útil               | ★★★ crítico          |
| Ítems personalizados (PY.*)     | ★★ importante            | ★★★ crítico        | ★☆ útil               | —                    |
| Visor 3D con resaltado          | ★★ importante            | ★★ importante      | ★★★ crítico           | —                    |
| Colaboración multi-usuario      | ☆ no necesita            | ★★★ crítico        | ☆ no necesita         | —                    |
| Historial de cambios            | ☆ no necesita            | ★★★ crítico        | ☆ no necesita         | ★★ importante        |
| Formatos MOPC                   | ☆ no necesita            | ★★★ crítico        | ☆ no necesita         | ★★★ crítico          |

**El MVP sirve al Perfil 1 y parcialmente al Perfil 3.** Los Perfiles 2 y 4 requieren features que son post-MVP (multi-usuario, formatos MOPC, historial de cambios). Esa es la delimitación correcta: un presupuestador independiente puede presupuestar un proyecto completo desde el día uno.

---

## Flujo de trabajo tipo — MVP (Perfil 1)

Este es el recorrido exacto que un usuario del Perfil 1 hace en el MVP, de principio a fin:

```
1. Crea un proyecto nuevo (nombre, cliente, fecha)
        ↓
2. Sube el archivo IFC exportado desde su software de diseño
        ↓
3. Cost-Mapper extrae los elementos del modelo
   (muros, losas, columnas, aberturas, etc.)
        ↓
4. El sistema sugiere automáticamente partidas TCPO
   para cada tipo de elemento, usando la vinculación UUID
        ↓
5. El usuario revisa las sugerencias:
   - Acepta las correctas
   - Ajusta las incorrectas (busca en el catálogo)
   - Agrega ítems que no tienen representación geométrica
     (ej. instalaciones, gastos generales)
        ↓
6. Asigna precios Mandu'a a cada partida
        ↓
7. Exporta el presupuesto en PDF o Excel
        ↓
8. Entrega al cliente
```

Este flujo es la vara con la que se mide el MVP: si un usuario del Perfil 1 puede completar este recorrido de punta a punta, el MVP está listo.
