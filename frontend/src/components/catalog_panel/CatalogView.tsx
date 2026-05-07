import { useEffect, useState, useCallback } from 'react'
import { searchItems } from '../../api/catalog'
import { Chip, SourceBadge } from '../shared/Chip'
import { fmt } from '../shared/formatters'
import type { CatalogItem, Faceta } from '../../types/catalog'

const TREE: { id: Faceta; label: string; count: number }[] = [
  { id: '3E', label: 'Resultados de construcción', count: 412 },
  { id: '4U', label: 'Servicios de obra',          count: 86 },
  { id: '2C', label: 'Componentes / Materiales',   count: 1184 },
  { id: '2N', label: 'Mano de obra',               count: 92 },
  { id: '2Q', label: 'Equipos',                    count: 138 },
]

interface CatalogViewProps {
  search: string
  activeFaceta: Faceta | null
  onSelectFaceta: (f: Faceta | null) => void
  selectedId: string | null
  onSelect: (id: string, item: CatalogItem) => void
}

/** Vista de Catálogo: árbol de facetas NBR + tabla de ítems. */
export function CatalogView({
  search, activeFaceta, onSelectFaceta, selectedId, onSelect,
}: CatalogViewProps) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await searchItems({
        q: search || undefined,
        facet: activeFaceta ?? undefined,
        limit: 100,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar catálogo')
    } finally {
      setLoading(false)
    }
  }, [search, activeFaceta])

  useEffect(() => { void load() }, [load])

  return (
    <div className="cat">
      <aside className="cat__tree">
        <div className="cat__tree-hdr">FACETAS NBR 15965</div>
        {TREE.map(n => (
          <div
            key={n.id}
            className={`cat__tree-item${activeFaceta === n.id ? ' is-active' : ''}`}
            onClick={() => onSelectFaceta(activeFaceta === n.id ? null : n.id)}
          >
            <Chip faceta={n.id} />
            <span className="cat__tree-label">{n.label}</span>
            <span className="cat__tree-count">{n.count}</span>
          </div>
        ))}
      </aside>

      <div className="cat__list">
        {error && (
          <div style={{ padding: 20, color: 'var(--error)', fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}
        {loading && !error && (
          <div style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
            Cargando…
          </div>
        )}
        {!loading && !error && (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 48 }}>FAC</th>
                <th style={{ width: 130 }}>CÓDIGO NBR</th>
                <th>DESCRIPCIÓN</th>
                <th style={{ width: 60 }}>UND</th>
                <th className="num" style={{ width: 130 }}>P. UNIT (₲)</th>
                <th style={{ width: 110 }}>FUENTE</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr
                  key={r.id}
                  className={selectedId === r.id ? 'is-selected' : ''}
                  onClick={() => onSelect(r.id, r)}
                >
                  <td><Chip faceta={r.faceta} /></td>
                  <td className="num">{r.nbr_code}</td>
                  <td className="desc">{r.description}</td>
                  <td>{r.unit}</td>
                  <td className="num">{fmt(r.unit_price)}</td>
                  <td><SourceBadge source={r.price_source} /></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
                    Sin resultados{total === 0 ? '' : ` — ${total} en total, ajustá los filtros`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
