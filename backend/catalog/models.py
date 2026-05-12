"""
Modelos SQLModel del módulo catalog (ADR-009).

Modelos con table=True → tablas en la base de datos.
Modelos sin table=True → validación de request/response.

Referencia: docs/MODELO-DE-DATOS.md secciones 1 y 2.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from pydantic import field_validator
from sqlmodel import Field, Relationship, SQLModel

# ---------------------------------------------------------------------------
# Constantes de dominio
# ---------------------------------------------------------------------------

# Mapa de normalización de unidades: alias → forma canónica.
# El validator normaliza en escritura; la DB siempre guarda la forma canónica.
_UNIT_ALIASES: dict[str, str] = {
    "m²": "m²", "m2": "m²",
    "m³": "m³", "m3": "m³",
    "m": "m", "ml": "m",
    "un": "un", "und": "un", "unidad": "un", "pza": "un", "pieza": "un",
    "kg": "kg",
    "l": "l", "lt": "l",
    "h": "h", "hr": "h",
    "bls": "bls", "bolsa": "bls",
    "gl": "gl", "global": "gl",
}

# Conjunto de todas las formas de entrada aceptadas (para mensajes de error).
VALID_UNITS: frozenset[str] = frozenset(_UNIT_ALIASES.keys())

# Formas canónicas (lo que se guarda en la DB).
CANONICAL_UNITS: frozenset[str] = frozenset(_UNIT_ALIASES.values())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _uuid() -> str:
    """Genera un UUID v4 como string (Capa 3 — ítems locales, ADR-001)."""
    return str(uuid.uuid4())


def _now() -> datetime:
    """Timestamp UTC actual."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Tablas de base de datos (table=True)
# ---------------------------------------------------------------------------

class CatalogItem(SQLModel, table=True):
    """Ítem del catálogo de presupuesto.

    Tabla central del sistema. Contiene todos los ítems presupuestables:
    los extraídos del PDF TCPO V15, y los creados por usuarios.

    Referencia: MODELO-DE-DATOS.md sección 1.
    """

    __tablename__ = "catalog_items"

    # --- Identidad (ADR-001) ---
    id: str = Field(
        default_factory=_uuid,
        primary_key=True,
        max_length=36,
        description="UUID NBR 15965 o UUID v4 generado localmente.",
    )
    uuid_status: str = Field(
        default="local",
        max_length=20,
        description="'official' | 'provisional' | 'local'",
    )

    # --- Clasificación NBR ---
    nbr_code: str = Field(
        max_length=20,
        index=True,
        description="Código de faceta NBR 15965. Ej: '3E 05 20 10'",
    )
    facet: str = Field(
        max_length=5,
        index=True,
        description="Primeros 2 caracteres del nbr_code. Ej: '3E'",
    )
    parent_nbr_code: str | None = Field(
        default=None,
        max_length=20,
        description="Código NBR del padre en la jerarquía. NULL para raíces.",
    )

    # --- Descripción ---
    description_pt: str | None = Field(
        default=None,
        description="Descripción original en portugués (TCPO V15).",
    )
    description_es: str = Field(
        description="Descripción en español (traducida o ingresada).",
    )

    # --- Unidad y clasificación ---
    unit: str = Field(
        max_length=50,
        description="Unidad de medida. Ej: 'm²', 'm³', 'un', 'hr'",
    )
    classification_source: str = Field(
        default="user",
        max_length=20,
        description="'v15_official' | 'user'",
    )
    confidence: int | None = Field(
        default=None,
        ge=0,
        le=100,
        description="0-100. Solo para clasificaciones automáticas.",
    )

    # --- Origen y estado ---
    creado_por: str = Field(
        max_length=100,
        description="'catalog_tcpo' | 'catalog_mandua' | 'user:{id}' | 'import:{fuente}'",
    )
    oficial: bool = Field(
        default=False,
        description="true = proviene de catálogo oficial sin modificación.",
    )
    bim_taggable: bool = Field(
        default=False,
        description="true = puede etiquetarse en modelo BIM (facetas 3E, 4U, 2C).",
    )
    relevant_py: bool = Field(
        default=True,
        description="true = relevante para el mercado paraguayo.",
    )

    # --- Precios ---
    unit_price: Decimal | None = Field(
        default=None,
        max_digits=14,
        decimal_places=2,
        description="Precio unitario vigente. NULL si no fue cargado.",
    )
    currency: str | None = Field(
        default=None,
        max_length=3,
        description="'PYG' | 'USD' | 'BRL'. NULL si unit_price es NULL.",
    )
    fuente_precios: str | None = Field(
        default=None,
        max_length=200,
        description="Origen del precio. Ej: 'mandua_2026_03'",
    )
    fuente_factores: str | None = Field(
        default=None,
        max_length=200,
        description="Origen de rendimientos APU. Ej: 'tcpo' | 'mopc'",
    )

    # --- Tipo de registro (ADR-011) ---
    is_work_item: bool = Field(
        default=False,
        description="true = ítem de trabajo TCPO presupuestable. false = nodo de clasificación NBR (sin precio).",
    )
    is_verified: bool = Field(
        default=False,
        description="Indica si un usuario humano verificó la exactitud de este ítem y su APU.",
    )
    verificado_por: str | None = Field(
        default=None,
        description="Nombre del usuario que verificó el ítem.",
        max_length=100,
    )
    fecha_verificacion: datetime | None = Field(
        default=None,
        description="Fecha y hora de la verificación.",
    )

    # --- Auditoría ---
    modificado_por: str | None = Field(
        default=None,
        max_length=100,
        description="Último usuario/proceso que editó el ítem.",
    )
    created_at: datetime = Field(
        default_factory=_now,
        description="Fecha de creación.",
    )
    updated_at: datetime = Field(
        default_factory=_now,
        description="Fecha de última actualización.",
    )

    # --- Relaciones ---
    apu_components: list["APUComponent"] = Relationship(
        back_populates="item",
        sa_relationship_kwargs={"foreign_keys": "[APUComponent.item_id]"},
    )


class APUComponent(SQLModel, table=True):
    """Componente de un Análisis de Precio Unitario (APU).

    Vincula un ítem padre con un ítem insumo (mano de obra, material, equipo)
    indicando la cantidad necesaria por unidad del padre.

    Referencia: MODELO-DE-DATOS.md sección 2.
    """

    __tablename__ = "apu_components"

    id: str = Field(
        default_factory=_uuid,
        primary_key=True,
        max_length=36,
    )
    item_id: str = Field(
        foreign_key="catalog_items.id",
        index=True,
        description="FK → ítem padre que se descompone.",
    )
    component_id: str = Field(
        foreign_key="catalog_items.id",
        index=True,
        description="FK → ítem insumo (2N, 2Q o 2C).",
    )
    quantity: Decimal = Field(
        max_digits=12,
        decimal_places=6,
        gt=0,
        description="Cantidad del insumo por unidad del padre.",
    )
    unit: str = Field(
        max_length=50,
        description="Unidad del insumo. Ej: 'hr', 'kg', 'un'",
    )
    notes: str | None = Field(
        default=None,
        description="Observaciones de rendimiento.",
    )
    source: str = Field(
        default="user",
        max_length=20,
        description="'tcpo' | 'mopc' | 'user'",
    )

    # --- Relaciones ---
    item: CatalogItem = Relationship(
        back_populates="apu_components",
        sa_relationship_kwargs={"foreign_keys": "[APUComponent.item_id]"},
    )
    component: CatalogItem = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[APUComponent.component_id]"},
    )


# ---------------------------------------------------------------------------
# Modelos de validación (sin table=True) — reemplazan schemas.py
# ---------------------------------------------------------------------------

class CatalogItemCreate(SQLModel):
    """Request body para crear un ítem manualmente (Capa 3, ADR-001)."""

    nbr_code: str = Field(max_length=20)
    facet: str = Field(max_length=5)
    description_es: str
    unit: str = Field(max_length=50)
    description_pt: str | None = None
    parent_nbr_code: str | None = None
    bim_taggable: bool = False
    relevant_py: bool = True
    unit_price: Decimal | None = None
    currency: str | None = None
    fuente_precios: str | None = None
    fuente_factores: str | None = None

    @field_validator("unit", mode="before")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        v = str(v).strip()
        canonical = _UNIT_ALIASES.get(v)
        if canonical is None:
            raise ValueError(
                f"Unidad '{v}' no válida. Opciones: {sorted(VALID_UNITS)}"
            )
        return canonical


class CatalogItemUpdate(SQLModel):
    """Request body para edición parcial de un ítem.

    Todos los campos son opcionales — solo se actualizan los enviados.
    """

    description_es: str | None = None
    unit: str | None = None
    unit_price: Decimal | None = None
    currency: str | None = None
    fuente_precios: str | None = None
    fuente_factores: str | None = None
    relevant_py: bool | None = None
    is_verified: bool | None = None
    verificado_por: str | None = None
    fecha_verificacion: datetime | None = None

    @field_validator("unit", mode="before")
    @classmethod
    def validate_unit(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = str(v).strip()
        canonical = _UNIT_ALIASES.get(v)
        if canonical is None:
            raise ValueError(
                f"Unidad '{v}' no válida. Opciones: {sorted(VALID_UNITS)}"
            )
        return canonical


class CatalogItemRead(SQLModel):
    """Response model para un ítem del catálogo (sin relaciones pesadas)."""

    id: str
    uuid_status: str
    nbr_code: str
    facet: str
    description_es: str
    description_pt: str | None
    unit: str
    unit_price: Decimal | None
    currency: str | None
    fuente_precios: str | None
    fuente_factores: str | None
    bim_taggable: bool
    relevant_py: bool
    oficial: bool
    is_verified: bool
    verificado_por: str | None
    fecha_verificacion: datetime | None
    is_work_item: bool
    parent_nbr_code: str | None
    creado_por: str
    modificado_por: str | None
    created_at: datetime
    updated_at: datetime


class APUComponentRead(SQLModel):
    """Response model para una fila del desglose APU."""

    clase: str          # facet del componente (2N, 2Q, 2C)
    codigo: str         # nbr_code del componente
    descripcion: str    # description_es del componente
    unidad: str         # unit del componente
    coef: Decimal       # quantity
    precio: Decimal | None  # unit_price del componente
    currency: str | None
    fuente_precio: str | None  # fuente_precios del componente
    fuente_coef: str | None    # source del apu_component
    apu_component_id: str  # id del APUComponent (para edición)
    component_id: str      # id del catalog_item componente
    creado_por: str | None = None
    modificado_por: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

class APUComponentUpdate(SQLModel):
    """Request body para edición parcial de un componente APU (coeficientes)."""

    quantity: Decimal | None = None
    source: str | None = None

class APUComponentCreate(SQLModel):
    """Request body para agregar un insumo a un APU."""

    component_id: str = Field(max_length=36)
    quantity: Decimal
    unit: str = Field(max_length=50)
    source: str = Field(max_length=20)
