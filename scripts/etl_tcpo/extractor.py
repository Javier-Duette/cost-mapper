"""
Extractor TCPO — envía tablas recortadas a Gemini Vision y parsea la respuesta.

Cache de traducciones MD5 (rescatado de V0 — ver ADR-003):
  Cada descripción en portugués se hashea con MD5. Si ya existe en
  scripts/data/translation_cache.json, se usa la traducción guardada
  en lugar de confiar en la versión nueva de Gemini. Esto garantiza
  consistencia: "Carpinteiro" siempre se traduce igual en todas las páginas.
  El cache se actualiza con cada traducción nueva.

Cada imagen de tabla recortada produce una lista de ítems con este esquema:
  {
    "nbr_code":       str,
    "description_pt": str,
    "description_es": str,
    "unit":           str,
    "components": [
      {"nbr_code": str, "description_pt": str, "description_es": str,
       "unit": str, "quantity": float}
    ]
  }
"""

from __future__ import annotations

import hashlib
import io
import json
import re
import time
from pathlib import Path

import google.generativeai as genai
from PIL import Image

# ---------------------------------------------------------------------------
# Cache de traducciones MD5
# ---------------------------------------------------------------------------

_REPO_ROOT   = Path(__file__).parent.parent.parent
_CACHE_PATH  = _REPO_ROOT / "scripts" / "data" / "translation_cache.json"

_cache: dict[str, str] | None = None  # md5(description_pt) → description_es


def _load_cache() -> dict[str, str]:
    global _cache
    if _cache is None:
        if _CACHE_PATH.exists():
            _cache = json.loads(_CACHE_PATH.read_text(encoding="utf-8"))
        else:
            _cache = {}
    return _cache


def _save_cache() -> None:
    if _cache is not None:
        _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        _CACHE_PATH.write_text(
            json.dumps(_cache, indent=2, ensure_ascii=False, sort_keys=True),
            encoding="utf-8",
        )


def _md5(text: str) -> str:
    return hashlib.md5(text.strip().lower().encode("utf-8")).hexdigest()


def _cached_translation(description_pt: str) -> str | None:
    """Devuelve la traducción cacheada o None si no existe."""
    return _load_cache().get(_md5(description_pt))


def _store_translation(description_pt: str, description_es: str) -> None:
    """Guarda una traducción nueva en el cache (sin escribir a disco todavía)."""
    _load_cache()[_md5(description_pt)] = description_es


def flush_cache() -> int:
    """Escribe el cache a disco. Devuelve cantidad de entradas. Llamar al final de cada página."""
    _save_cache()
    return len(_cache or {})

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
    """Parsea, valida y aplica el cache MD5 al JSON devuelto por Gemini."""
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

        item["nbr_code"] = _normalize_code(item["nbr_code"])
        item.setdefault("description_pt", item["description_es"])
        item.setdefault("unit", "")

        # Cache MD5: si ya teníamos esta traducción, usarla para consistencia
        item["description_es"] = _apply_cache(item["description_pt"], item["description_es"])

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
                comp["description_es"] = _apply_cache(comp["description_pt"], comp["description_es"])
                components.append(comp)

        item["components"] = components
        validated.append(item)

    return validated


def _apply_cache(description_pt: str, gemini_translation: str) -> str:
    """Aplica el cache MD5: usa traducción guardada si existe, si no guarda la nueva.

    La traducción guardada tiene prioridad sobre la nueva de Gemini para garantizar
    que la misma descripción portuguesa siempre produce la misma traducción española.
    """
    cached = _cached_translation(description_pt)
    if cached:
        return cached
    # Nueva traducción: guardarla para uso futuro
    _store_translation(description_pt, gemini_translation)
    return gemini_translation


def _normalize_code(code: str) -> str:
    """Normaliza un código NBR: une líneas, colapsa espacios, mayúsculas."""
    code = code.replace("\n", " ").replace("\r", " ")
    code = re.sub(r"\s+", " ", code).strip().upper()
    # Quitar sufijo de incertidumbre para el campo pero lo podemos loguear en otro lugar
    # (lo dejamos en el código para que sea visible en la DB si hace falta)
    return code
