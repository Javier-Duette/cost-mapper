"""
Activa como work items los nodos hoja de clasificación NBR en las facetas indicadas.

Un nodo hoja es un nodo de clasificación (is_work_item=False) que no aparece como
padre derivado de ningún otro nodo en la misma faceta.

Uso:
    python scripts/activate_leaf_nodes.py
    python scripts/activate_leaf_nodes.py --dry-run
    python scripts/activate_leaf_nodes.py --facets 2C 2N
"""

import argparse
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "backend" / "costmapper_dev.db"

DEFAULT_FACETS = ["2C", "2N", "2Q"]


def derive_parent_code(nbr_code: str) -> str | None:
    parts = nbr_code.split(" ")
    if len(parts) <= 1:
        return None
    segments = parts[1:]
    for i in range(len(segments) - 1, -1, -1):
        if segments[i] not in ("00", "0"):
            if i == 0:
                return None
            parent_segs = segments[:]
            parent_segs[i] = "00"
            return parts[0] + " " + " ".join(parent_segs)
    return None


def find_leaf_nodes(cur: sqlite3.Cursor, facets: list[str]) -> list[tuple]:
    placeholders = ",".join("?" * len(facets))
    cur.execute(
        f"SELECT id, nbr_code, description_es FROM catalog_items "
        f"WHERE is_work_item = 0 AND facet IN ({placeholders}) ORDER BY nbr_code",
        facets,
    )
    all_nodes = cur.fetchall()

    all_codes = {row["nbr_code"] for row in all_nodes}

    parent_codes: set[str] = set()
    for row in all_nodes:
        p = derive_parent_code(row["nbr_code"])
        if p:
            parent_codes.add(p)

    leaves = [row for row in all_nodes if row["nbr_code"] not in parent_codes]
    return leaves


def main():
    parser = argparse.ArgumentParser(description="Activar nodos hoja NBR como work items")
    parser.add_argument("--dry-run", action="store_true", help="No escribir en DB")
    parser.add_argument("--facets", nargs="+", default=DEFAULT_FACETS, help="Facetas a procesar")
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print(f"Facetas: {args.facets}")
    leaves = find_leaf_nodes(cur, args.facets)
    total = len(leaves)

    print(f"Nodos hoja encontrados: {total}")
    if args.dry_run:
        print("(dry-run: no se escribirá en la DB)")
        for row in leaves[:20]:
            print(f"  {row['nbr_code']:30s}  {(row['description_es'] or '')[:60]}")
        if total > 20:
            print(f"  ... y {total - 20} más")
        conn.close()
        return

    ids = [row["id"] for row in leaves]
    placeholders = ",".join("?" * len(ids))
    cur.execute(
        f"UPDATE catalog_items SET is_work_item = 1 WHERE id IN ({placeholders})",
        ids,
    )
    conn.commit()
    print(f"Activados {cur.rowcount} nodos como work items.")
    conn.close()


if __name__ == "__main__":
    main()
