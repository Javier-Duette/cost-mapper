import { useEffect, useState } from 'react'
import { Chip } from '../shared/Chip'
import { fmt } from '../shared/formatters'
import { Icon } from '../shared/Icon'
import { getBudget } from '../../api/budget'
import type { BudgetSummary } from '../../types/budget'

interface BudgetViewProps {
  projectId: string | null
  search: string
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Vista de Presupuesto: KPIs + tabla agrupada por faceta. Datos reales del módulo budget/. */
export function BudgetView({ projectId, search, selectedId, onSelect }: BudgetViewProps) {
  const [budget, setBudget] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    getBudget(projectId)
      .then(setBudget)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar presupuesto'))
      .finally(() => setLoading(false))
  }, [projectId])

  if (!projectId) {
    return (
      <div className="section__body">
        <div className="empty-state">
          <div className="empty-state__title">Sin proyecto activo</div>
          <div className="empty-state__sub">Seleccioná un proyecto para ver el presupuesto.</div>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando presupuesto…</div>
  if (error) return <div style={{ padding: 20, color: 'var(--error)', fontSize: 13 }}>⚠ {error}</div>
  if (!budget) return null

  const missingPrice = budget.items_without_price
  const missingQty   = budget.items_without_quantity
  const warningCount = missingPrice + missingQty

  const visible = search
    ? budget.rows.filter(r => {
        const q = search.toLowerCase()
        return r.description_es.toLowerCase().includes(q) || r.nbr_code.toLowerCase().includes(q)
      })
    : budget.rows

  // Group rows by facet for display
  const groups: { facet: string; rows: typeof visible }[] = []
  for (const row of visible) {
    const last = groups[groups.length - 1]
    if (!last || last.facet !== row.facet) {
      groups.push({ facet: row.facet, rows: [row] })
    } else {
      last.rows.push(row)
    }
  }

  return (
    <>
      {warningCount > 0 && (
        <div className="banner">
          <Icon name="warning" size={16} />
          <span className="banner__msg">
            {missingPrice > 0 && <><strong>{missingPrice} ítems sin precio</strong>{missingQty > 0 ? ' · ' : ''}</>}
            {missingQty > 0 && <><strong>{missingQty} ítems sin cantidad</strong></>}
            . Algunos cálculos están incompletos.
          </span>
        </div>
      )}

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi__lbl">Costo directo</div>
          <div className="kpi__val">₲ {fmt(budget.total)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__lbl">Ítems totales</div>
          <div className="kpi__val">{budget.items_count}</div>
        </div>
        <div className="kpi">
          <div className="kpi__lbl">Sin precio</div>
          <div className={`kpi__val${missingPrice > 0 ? ' kpi__val--warn' : ''}`}>{missingPrice}</div>
        </div>
        <div className="kpi">
          <div className="kpi__lbl">Sin cantidad</div>
          <div className={`kpi__val${missingQty > 0 ? ' kpi__val--warn' : ''}`}>{missingQty}</div>
        </div>
      </div>

      <div className="section__body">
        {budget.items_count === 0 ? (
          <div className="empty-state">
            <Icon name="budget" size={48} style={{ color: 'var(--bg-surface-raised)' }} />
            <div className="empty-state__title">Presupuesto vacío</div>
            <div className="empty-state__sub">
              Agregá ítems desde el Catálogo para construir el presupuesto del proyecto.
            </div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 48 }}>FAC</th>
                <th style={{ width: 170 }}>CÓDIGO NBR</th>
                <th>DESCRIPCIÓN</th>
                <th style={{ width: 60 }}>UND</th>
                <th className="num" style={{ width: 90 }}>CANT.</th>
                <th className="num" style={{ width: 130 }}>P. UNIT (₲)</th>
                <th className="num" style={{ width: 150 }}>SUBTOTAL (₲)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ facet, rows: gRows }) => (
                <>
                  <tr key={`g-${facet}`} className="group-hdr">
                    <td colSpan={6}>
                      <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>▾</span>
                      <Chip faceta={facet} />
                      &nbsp;{gRows.length} ítem{gRows.length !== 1 ? 's' : ''}
                    </td>
                    <td className="num" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {fmt(gRows.reduce((a, r) => a + (r.subtotal ?? 0), 0))}
                    </td>
                  </tr>
                  {gRows.map(r => {
                    const sel = r.entry_id === selectedId
                    return (
                      <tr key={r.entry_id} className={sel ? 'is-selected' : ''} onClick={() => onSelect(r.entry_id)}>
                        <td><Chip faceta={r.facet} /></td>
                        <td className="num">{r.nbr_code}</td>
                        <td className="desc">{r.description_es}</td>
                        <td>{r.unit}</td>
                        <td className="num">
                          {r.manual_quantity == null
                            ? <span style={{ color: 'var(--warning)' }}>—</span>
                            : fmt(r.manual_quantity)}
                        </td>
                        <td className="num">
                          {r.unit_price == null
                            ? <span style={{ color: 'var(--warning)' }}>sin precio</span>
                            : fmt(r.unit_price)}
                        </td>
                        <td className="num">{fmt(r.subtotal)}</td>
                      </tr>
                    )
                  })}
                </>
              ))}
              <tr className="ftr">
                <td colSpan={6} style={{ textAlign: 'right' }}>TOTAL COSTO DIRECTO</td>
                <td className="num">₲ {fmt(budget.total)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
