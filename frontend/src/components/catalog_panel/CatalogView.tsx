import { useEffect, useState, useCallback } from 'react'
import { searchItems } from '../../api/catalog'
import { Chip, SourceBadge } from '../shared/Chip'
import { fmt } from '../shared/formatters'
import type { CatalogItem, Faceta } from '../../types/catalog'

const TREE: { id: Faceta; label: string }[] = [
  { id: '3E', label: 'Resultados de construcción' },
  { id: '3R', label: 'Recursos de construcción' },
  { id: '4U', label: 'Servicios de obra' },
  { id: '2C', label: 'Componentes / Materiales' },
  { id: '2N', label: 'Mano de obra' },
  { id: '2Q', label: 'Equipos' },
]

interface CatalogViewProps {
  search: string
  activeFaceta: Faceta | null
  onSelectFaceta: (f: Faceta | null) => void
  relevantOnly: boolean
  selectedId: string | null
  onSelect: (id: string, item: CatalogItem) => void
  projectId: string | null
  onAddToProject: (item: CatalogItem) => Promise<void>
}

/** Vista de Catálogo: árbol de facetas NBR + tabla de ítems con datos reales del backend. */
export function CatalogView({
  search, activeFaceta, onSelectFaceta, relevantOnly,
  selectedId, onSelect, projectId, onAddToProject,
}: CatalogViewProps) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const needsQuery = !activeFaceta && !search

  const load = useCallback(async () => {
    if (needsQuery) { setItems([]); setTotal(0); return }
    setLoading(true)
    setError(null)
    try {
      const res = await searchItems({
        q: search || undefined,
        facet: activeFaceta ?? undefined,
        relevant_py: relevantOnly || undefined,
        limit: 100,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar catálogo')
    } finally {
      setLoading(false)
    }
  }, [search, activeFaceta, relevantOnly, needsQuery])

  useEffect(() => { void load() }, [load])

  const handleAdd = async (e: React.MouseEvent, item: CatalogItem) => {
    e.stopPropagation()
    if (!projectId || addingId) return
    setAddingId(item.id)
    try {
      await onAddToProject(item)
    } finally {
      setAddingId(null)
    }
  }

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
          </div>
        ))}
      </aside>

      <div className="cat__list">
        {needsQuery && (
          <div className="empty-state">
            <div className="empty-state__title">Seleccioná una faceta</div>
            <div className="empty-state__sub">
              El catálogo contiene más de 10.000 ítems NBR 15965.<br />
              Elegí una faceta en el panel izquierdo o escribí en el buscador.
            </div>
          </div>
        )}
        {!needsQuery && error && (
          <div style={{ padding: 20, color: 'var(--error)', fontSize: 13 }}>⚠ {error}</div>
        )}
        {!needsQuery && loading && !error && (
          <div style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando…</div>
        )}
        {!needsQuery && !loading && !error && (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 48 }}>FAC</th>
                <th style={{ width: 170 }}>CÓDIGO NBR</th>
                <th>DESCRIPCIÓN</th>
                <th style={{ width: 60 }}>UND</th>
                <th className="num" style={{ width: 130 }}>P. UNIT (₲)</th>
                <th style={{ width: 110 }}>FUENTE</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr
                  key={r.id}
                  className={selectedId === r.id ? 'is-selected' : ''}
                  onClick={() => onSelect(r.id, r)}
                >
                  <td><Chip faceta={r.facet} /></td>
                  <td className="num">{r.nbr_code}</td>
                  <td className="desc">{r.description_es}</td>
                  <td>{r.unit}</td>
                  <td className="num">{fmt(r.unit_price)}</td>
                  <td>
                    <SourceBadge source={r.fuente_precios ?? (r.oficial ? 'TCPO v15' : 'Custom')} />
                  </td>
                  <td style={{ padding: '0 6px', textAlign: 'center' }}>
                    {projectId && (
                      <button
                        className="btn-add-to-project"
                        title="Agregar al proyecto"
                        disabled={addingId === r.id}
                        onClick={e => handleAdd(e, r)}
                      >
                        {addingId === r.id ? '…' : '+'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
                    {total === 0
                      ? 'Sin resultados — ajustá los filtros'
                      : `Mostrando 0 de ${total} — refinar búsqueda`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {!needsQuery && !loading && items.length > 0 && (
          <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
            {items.length} de {total.toLocaleString('es-PY')} ítems
          </div>
        )}
      </div>
    </div>
  )
}
