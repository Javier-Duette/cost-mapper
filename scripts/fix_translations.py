import sqlite3
import os
import json
import hashlib
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "scripts" / "etl_tcpo" / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")

DB_PATH = _REPO_ROOT / "backend" / "costmapper_dev.db"
CACHE_PATH = _REPO_ROOT / "scripts" / "data" / "translation_cache.json"

PROMPT_TEMPLATE = """
Sos un traductor técnico experto en construcción civil para Paraguay.
Traducí la siguiente descripción de ítem del portugués al español paraguayo.

REGLAS ESTRICTAS DE TRADUCCIÓN:
- "telha trapezoidal" -> "chapa trapezoidal"
- "telha ondulada" -> "chapa ondulada"
- "telha de fibrocimento" -> "chapa de fibrocemento"
- "telha metálica" -> "chapa metálica"
- "telha cerâmica" -> "teja cerámica"
- "telha colonial" -> "teja colonial"
- "telha francesa" -> "teja francesa"
- "telha plan" -> "teja plan"
- "concreto" -> "hormigón"
- "fôrma" -> "encofrado"
- "carpinteiro" -> "carpintero"

IMPORTANTE: "telha" NO siempre es "teja". Si es de chapa/metal/fibrocemento, es "chapa". Si es de cerámica/barro, es "teja".

Devolvé ÚNICAMENTE el texto traducido al español. Sin comillas, sin formato markdown, sin explicaciones.
Texto original: {pt}
"""

def md5_hash(text: str) -> str:
    return hashlib.md5(text.strip().lower().encode("utf-8")).hexdigest()

def smart_fix():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, description_pt, description_es FROM catalog_items WHERE description_pt LIKE '%telha%' OR description_es LIKE '%chapa%'")
    rows = cursor.fetchall()
    conn.close()
    
    conn = sqlite3.connect(DB_PATH, timeout=15)
    cursor = conn.cursor()
    
    if CACHE_PATH.exists():
        with CACHE_PATH.open("r", encoding="utf-8") as f:
            cache = json.load(f)
    else:
        cache = {}

    updates = 0
    for row_id, pt_desc, es_desc in rows:
        if not pt_desc:
            continue
            
        # Preguntar a Gemini
        prompt = PROMPT_TEMPLATE.format(pt=pt_desc)
        try:
            response = model.generate_content(prompt)
            correct_es = response.text.strip()
            
            if correct_es and correct_es != es_desc:
                print(f"[{pt_desc}]\n  Antes:   {es_desc}\n  Después: {correct_es}\n")
                # Actualizar DB
                cursor.execute("UPDATE catalog_items SET description_es = ? WHERE id = ?", (correct_es, row_id))
                # Actualizar Caché
                cache[md5_hash(pt_desc)] = correct_es
                updates += 1
                
        except Exception as e:
            print(f"Error con '{pt_desc}': {e}")

    if updates > 0:
        conn.commit()
        with CACHE_PATH.open("w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
            
    print(f"\n¡Se corrigieron inteligentemente {updates} ítems!")
    conn.close()

if __name__ == "__main__":
    print("Iniciando corrección INTELIGENTE con Gemini...")
    smart_fix()
