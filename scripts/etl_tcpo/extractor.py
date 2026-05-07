"""
Extractor TCPO — envía tablas recortadas a Gemini Vision y parsea la respuesta.

Cada imagen de tabla recortada produce una lista de ítems con este esquema:
  {
    "nbr_code":       str,   # código NBR completo con espacios
    "description_pt": str,   # descripción original en portugués
    "description_es": str,   # traducción al español técnico latinoamericano
    "unit":           str,   # unidad de medida (m², m³, h, kg, un, etc.)
    "components": [
      {
        "nbr_code":       str,
        "description_pt": str,
        "description_es": str,
        "unit":           str,
        "quantity":       float  # consumo por unidad del ítem padre
      }
    ]
  }

Tablas con múltiples columnas de Consumos (variantes) generan múltiples ítems.
"""

from __future__ import annotations

import io
import json
import re
import time
from pathlib import Path

import google.generativeai as genai
from PIL import Image

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_PROMPT = """
You are extracting data from a TCPO V15 (Tabela de Composições de Preços) table.
TCPO V15 is the Brazilian construction cost database aligned with NBR 15965.

The image shows one or more bordered construction service composition tables.

IMPORTANT — NBR code format:
- Codes span multiple lines in the image. Join all lines into one code with spaces.
- Example: "3R 02 57 / 27 00 00 00 / 00 02" → nbr_code: "3R 02 57 27 00 00 00 00 02"
- Same rule for component codes: "2N 36 16 25 / 12 15" → "2N 36 16 25 12 15"

Each table has:
- Header: [code box] | [description of the service] | [unit]
- Body: rows with columns Código | Descrição | Unid. | Consumos (quantity per unit of parent)

If a table has MULTIPLE "Consumos" columns (e.g., "sobrepostas" / "matajunta de ripas",
or "1º aproveitamento" / "2º aproveitamento"), return ONE item per column — each item
has the same nbr_code and description but with the components from that column's quantities.
Append the column header to the description to differentiate. Skip columns with "-" values.

Translate all descriptions to Latin American technical Spanish (not European Spanish).
Use standard construction terms: "carpintero" not "carpinteiro", "hormigón" not "concreto", etc.

Return a JSON array. Each element is one construction service composition:
[
  {
    "nbr_code": "FULL CODE JOINED WITH SPACES",
    "description_pt": "original Portuguese description",
    "description_es": "Spanish translation",
    "unit": "unit abbreviation exactly as shown (m², h, kg, un, m, m³, etc.)",
    "components": [
      {
        "nbr_code": "FULL CODE JOINED",
        "description_pt": "original",
        "description_es": "translation",
        "unit": "unit",
        "quantity": 0.4000
      }
    ]
  }
]

Rules:
- Return ONLY valid JSON. No markdown, no explanation, no code fences.
- If you cannot read a code clearly, use your best guess and add a "_UNCERTAIN" suffix.
- If the image has no TCPO tables, return an empty array: []
- quantities must be numbers (floats), not strings.
""".strip()

# ---------------------------------------------------------------------------
# Client setup
# ---------------------------------------------------------------------------

_model: genai.GenerativeModel | None = None


def init(api_key: str, model_name: str = "gemini-2.0-flash") -> None:
    """Inicializa el cliente Gemini. Llamar una vez al inicio."""
    global _model
    genai.configure(api_key=api_key)
    _model = genai.GenerativeModel(model_name)


# ---------------------------------------------------------------------------
# Extracción
# ---------------------------------------------------------------------------

def extract_table(crop: Image.Image, *, retries: int = 3) -> list[dict]:
    """Envía una imagen de tabla recortada a Gemini y devuelve los ítems parseados.

    Args:
        crop: Imagen PIL de la tabla.
        retries: Intentos en caso de error de API o JSON inválido.

    Returns:
        Lista de dicts con esquema de ítem. Lista vacía si la tabla no tiene datos.

    Raises:
        RuntimeError: Si se agotaron los reintentos.
    """
    if _model is None:
        raise RuntimeError("Llamar a init() antes de extract_table().")

    # PIL → bytes para la API
    buf = io.BytesIO()
    crop.save(buf, format="JPEG", quality=92)
    img_bytes = buf.getvalue()

    image_part = {"mime_type": "image/jpeg", "data": img_bytes}

    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            response = _model.generate_content([image_part, _PROMPT])
            raw = response.text.strip()
            items = _parse_response(raw)
            return items

        except json.JSONDecodeError as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))

        except Exception as e:
            last_err = e
            if "quota" in str(e).lower() or "429" in str(e):
                time.sleep(15)
            else:
                time.sleep(2 * (attempt + 1))

    raise RuntimeError(f"Error después de {retries} intentos: {last_err}")


def _parse_response(raw: str) -> list[dict]:
    """Parsea y valida el JSON devuelto por Gemini."""
    # Gemini a veces agrega ```json ... ``` aunque se le pide que no
    clean = re.sub(r"^```(?:json)?\s*", "", raw)
    clean = re.sub(r"\s*```$", "", clean).strip()

    data = json.loads(clean)

    if not isinstance(data, list):
        raise json.JSONDecodeError("Expected JSON array", clean, 0)

    validated = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if not item.get("nbr_code") or not item.get("description_es"):
            continue

        # Normalizar código: quitar saltos de línea residuales, colapsar espacios múltiples
        item["nbr_code"] = _normalize_code(item["nbr_code"])
        item.setdefault("description_pt", item["description_es"])
        item.setdefault("unit", "")

        components = []
        for comp in item.get("components", []):
            if not isinstance(comp, dict):
                continue
            if not comp.get("nbr_code"):
                continue
            comp["nbr_code"] = _normalize_code(comp["nbr_code"])
            comp.setdefault("description_pt", comp.get("description_es", ""))
            try:
                comp["quantity"] = float(comp.get("quantity", 0))
            except (TypeError, ValueError):
                comp["quantity"] = 0.0
            if comp["quantity"] > 0:
                components.append(comp)

        item["components"] = components
        validated.append(item)

    return validated


def _normalize_code(code: str) -> str:
    """Normaliza un código NBR: une líneas, colapsa espacios, mayúsculas."""
    code = code.replace("\n", " ").replace("\r", " ")
    code = re.sub(r"\s+", " ", code).strip().upper()
    # Quitar sufijo de incertidumbre para el campo pero lo podemos loguear en otro lugar
    # (lo dejamos en el código para que sea visible en la DB si hace falta)
    return code
