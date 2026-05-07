import { useEffect, useState, useRef, useCallback } from 'react'
import { Chip } from '../shared/Chip'
import { fmt } from '../shared/formatters'
import { Icon } from '../shared/Icon'
import { getBudget } from '../../api/budget'
import { updateLibraryEntry } from '../../api/library'
import type { BudgetSummary } from '../../types/budget'
import type { ToastKind } from '../shared/Toast'

interface BudgetViewProps {
  projectId: string | null
  search: string
  selectedId: string | null
  onSelect: (id: string) => void
  toast: (text: string, kind?: ToastKind) => void
}

/** Vista de Presupuesto: KPIs + tabla agrupada por faceta con edición inline de cantidad. */
export function BudgetView({ projectId, search, selectedId, onSelect, toast }: BudgetViewProps) {
  const [budget, setBudget] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingVal, setEditingVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    getBudget(projectId)
      .then(setBudget)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar presupuesto'))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (editingId) inputRef.current?.focus()
  }, [editingId])

  const startEdit = (entryId: string, currentQty: number | null) => {
    setEditingId(entryId)
    setEditingVal(currentQty != null ? String(currentQty) : '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingVal('')
  }

  const confirmEdit = async (entryId: string) => {
    if (!projectId) return
    const raw = editingVal.trim().replace(',', '.')
    const qty = raw === '' ? null : Number(raw)

    if (raw !== '' && (isNaN(qty!) || qty! < 0)) {
      toast('Cantidad inválida — ingresá un número positivo', 'error')
      return
    }

    cancelEdit()
    try {
      await updateLibraryEntry(projectId, entryId, { manual_quantity: qty })
      load()
    } catch {
      toast('Error al guardar la cantidad', 'error')
    }
  }

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
                    const editing = r.entry_id === editingId
                    return (
                      <tr key={r.entry_id} className={sel ? 'is-selected' : ''} onClick={() => onSelect(r.entry_id)}>
                        <td><Chip faceta={r.facet} /></td>
                        <td className="num">{r.nbr_code}</td>
                        <td className="desc">{r.description_es}</td>
                        <td>{r.unit}</td>
                        <td
                          className="num qty-cell"
                          title="Clic para editar cantidad"
                          onClick={e => { e.stopPropagation(); startEdit(r.entry_id, r.manual_quantity) }}
                        >
                          {editing ? (
                            <input
                              ref={inputRef}
                              className="qty-input"
                              value={editingVal}
                              onChange={e => setEditingVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void confirmEdit(r.entry_id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              onBlur={() => void confirmEdit(r.entry_id)}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            r.manual_quantity == null
                              ? <span className="qty-empty">—</span>
                              : <span className="qty-value">{fmt(r.manual_quantity)}</span>
                          )}
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
