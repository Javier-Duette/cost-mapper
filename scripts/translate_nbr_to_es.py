"""
Traduccion masiva PT->ES de nodos NBR 15965 usando Argos Translate (offline, GPU).

Solo traduce filas donde description_es esta vacia o contiene texto portugues.
Escribe los resultados directamente en la DB.

Uso:
    python scripts/translate_nbr_to_es.py
    python scripts/translate_nbr_to_es.py --dry-run      # no escribe en DB
    python scripts/translate_nbr_to_es.py --facet 2C     # solo una faceta
    python scripts/translate_nbr_to_es.py --overwrite    # retraducir todo
    python scripts/translate_nbr_to_es.py --batch-size 128
"""

import argparse
import sqlite3
import time
from pathlib import Path

import argostranslate.package
import argostranslate.translate

DB_PATH = Path(__file__).parent.parent / "backend" / "costmapper_dev.db"


def get_translator():
    installed = argostranslate.package.get_installed_packages()
    pkg = next((p for p in installed if p.from_code == "pt" and p.to_code == "es"), None)
    if pkg is None:
        print("Instalando paquete PT->ES de Argos Translate...")
        argostranslate.package.update_package_index()
        available = argostranslate.package.get_available_packages()
        to_install = next((p for p in available if p.from_code == "pt" and p.to_code == "es"), None)
        if to_install is None:
            raise RuntimeError("Paquete PT->ES no disponible en Argos Translate.")
        to_install.install()
    return argostranslate.translate.get_translation_from_codes("pt", "es")


def translate_batch(texts: list[str], translator) -> list[str]:
    return [translator.translate(t) for t in texts]


def main():
    parser = argparse.ArgumentParser(description="Traducir nodos NBR PT->ES")
    parser.add_argument("--dry-run", action="store_true", help="Traducir sin escribir en DB")
    parser.add_argument("--batch-size", type=int, default=128, help="Tamano de batch (default: 128)")
    parser.add_argument("--facet", type=str, default=None, help="Solo esta faceta. Ej: 2C")
    parser.add_argument("--overwrite", action="store_true", help="Retraducir incluso si ya tiene description_es")
    args = parser.parse_args()

    # ── Conectar DB ──────────────────────────────────────────────────────────
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # ── Cargar filas a traducir ───────────────────────────────────────────────
    if args.overwrite:
        where = "description_pt IS NOT NULL AND description_pt != ''"
    else:
        where = "description_pt IS NOT NULL AND description_pt != '' AND (description_es IS NULL OR description_es = '')"

    if args.facet:
        where += f" AND facet = '{args.facet}'"

    cur.execute(f"SELECT id, nbr_code, description_pt FROM catalog_items WHERE {where} ORDER BY nbr_code")
    rows = cur.fetchall()

    total = len(rows)
    if total == 0:
        print("No hay filas para traducir. Usa --overwrite para retraducir las que ya tienen description_es.")
        conn.close()
        return

    print(f"\nFilas a traducir: {total}")
    if args.dry_run:
        print("(dry-run: no se escribira en la DB)\n")
    print(f"Batch size: {args.batch_size}\n")

    # ── Cargar traductor ─────────────────────────────────────────────────────
    print("Cargando traductor Argos PT->ES...")
    translator = get_translator()
    print("Listo.\n")

    # ── Traducir en batches ──────────────────────────────────────────────────
    t_start = time.time()
    translated = 0
    errors = 0

    for i in range(0, total, args.batch_size):
        batch = list(rows[i:i + args.batch_size])
        texts = [r["description_pt"] for r in batch]

        try:
            translations = translate_batch(texts, translator)
        except Exception as e:
            print(f"  ERROR en batch {i // args.batch_size + 1}: {e}")
            errors += len(batch)
            continue

        if not args.dry_run:
            cur.executemany(
                "UPDATE catalog_items SET description_es = ? WHERE id = ?",
                [(t, r["id"]) for r, t in zip(batch, translations)]
            )
            conn.commit()

        translated += len(batch)
        elapsed = time.time() - t_start
        rate = translated / elapsed if elapsed > 0 else 1
        remaining = (total - translated) / rate

        sample_pt = texts[0][:65]
        sample_es = translations[0][:65]
        print(f"[{translated:>5}/{total}] {elapsed:5.0f}s | ~{remaining:.0f}s restantes")
        print(f"  PT: {sample_pt}")
        print(f"  ES: {sample_es}\n")

    # ── Resumen ──────────────────────────────────────────────────────────────
    total_time = time.time() - t_start
    print("=" * 60)
    print(f"Traducidos: {translated - errors:>5}/{total}")
    print(f"Errores:    {errors:>5}")
    print(f"Tiempo:     {total_time:.1f}s  ({total / total_time:.0f} nodos/s)")
    if args.dry_run:
        print("(dry-run: ningun cambio fue escrito en la DB)")

    conn.close()


if __name__ == "__main__":
    main()
