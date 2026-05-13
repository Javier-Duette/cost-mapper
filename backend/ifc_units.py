# -*- coding: utf-8 -*-
"""
Mapa compartido de compatibilidad IFC-tipo → unidades canónicas.

Usado por mapper (validación/filtrado) y cualquier módulo futuro que necesite
saber qué unidad de medición corresponde a un tipo de elemento IFC.

Unidades canónicas (mismas que catalog.models.CANONICAL_UNITS):
  m², m³, m, un, kg, l, h, bls, gl
"""

from __future__ import annotations

IFC_TYPE_UNITS: dict[str, frozenset[str]] = {
    "IfcWall":               frozenset(["m²"]),
    "IfcWallStandardCase":   frozenset(["m²"]),
    "IfcSlab":               frozenset(["m²"]),
    "IfcRoof":               frozenset(["m²"]),
    "IfcCovering":           frozenset(["m²"]),
    "IfcStair":              frozenset(["m²"]),
    "IfcRamp":               frozenset(["m²"]),
    "IfcColumn":             frozenset(["m", "m³"]),
    "IfcColumnStandardCase": frozenset(["m", "m³"]),
    "IfcBeam":               frozenset(["m", "m³"]),
    "IfcBeamStandardCase":   frozenset(["m", "m³"]),
    "IfcPile":               frozenset(["m", "m³"]),
    "IfcMember":             frozenset(["m", "m³"]),
    "IfcFooting":            frozenset(["m³"]),
    "IfcDoor":               frozenset(["un"]),
    "IfcWindow":             frozenset(["un"]),
    "IfcFurnishingElement":  frozenset(["un"]),
    "IfcFurniture":          frozenset(["un"]),
}


def units_for_ifc_type(ifc_type: str) -> frozenset[str] | None:
    """Retorna el conjunto de unidades válidas para un tipo IFC.

    None = tipo desconocido, sin restricción de unidad (cualquier ítem es asignable).
    """
    return IFC_TYPE_UNITS.get(ifc_type)
