import { useEffect, useState, useRef, useCallback, Fragment } from 'react'

import { Chip } from '../shared/Chip'
import { fmt } from '../shared/formatters'
import { Icon } from '../shared/Icon'
import { getBudget, getBudgetIfc } from '../../api/budget'
import { updateLibraryEntry } from '../../api/library'
import type { BudgetRow, BudgetSummary, IfcBudgetRow, IfcBudgetSummary } from '../../types/budget'
import type { ToastKind } from '../shared/Toast'

interface BudgetViewProps {
  projectId: string | null
  search: string
  selectedId: string | null
  onSelect: (id: string) => void
  toast: (text: string, kind?: ToastKind) => void
}

type BudgetMode = 'library' | 'ifc'
type AnyRow = BudgetRow | IfcBudgetRow

/** Vista de Presupuesto: KPIs + tabla agrupada por faceta con ediciÃ³n inline de cantidad. */
export function BudgetView({ projectId, search, selectedId, onSelect, toast }: BudgetViewProps) {
  const [mode, setMode] = useState<BudgetMode>('library')

  const [budget, setBudget] = useState<BudgetSummary | null>(null)
  const [ifcBudget, setIfcBudget] = useState<IfcBudgetSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingVal, setEditingVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    const p = mode === 'ifc'
      ? getBudgetIfc(projectId).then(setIfcBudget)
      : getBudget(projectId).then(setBudget)

    p
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar presupuesto'))
      .finally(() => setLoading(false))
  }, [projectId, mode])

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
      toast('Cantidad invÃ¡lida â€” ingresÃ¡ un nÃºmero positivo', 'error')
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
          <div className="empty-state__sub">SeleccionÃ¡ un proyecto para ver el presupuesto.</div>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando presupuestoâ€¦</div>
  if (error) return <div style={{ padding: 20, color: 'var(--error)', fontSize: 13 }}>âš  {error}</div>
  if (mode === 'library' && !budget) return null
  if (mode === 'ifc' && !ifcBudget) return null

  const summary = mode === 'ifc' ? ifcBudget! : budget!
  const rows = summary.rows as AnyRow[]

  const missingPrice = summary.items_without_price
  const missingQty = summary.items_without_quantity
  const warningCount = missingPrice + missingQty

  const visible = search
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return r.description_es.toLowerCase().includes(q) || r.nbr_code.toLowerCase().includes(q)
      })
    : rows

  const groups = (() => {
    const out: { facet: string; rows: AnyRow[] }[] = []
    for (const row of visible) {
      const last = out[out.length - 1]
      if (!last || last.facet !== row.facet) {
        out.push({ facet: row.facet, rows: [row] })
      } else {
        last.rows.push(row)
      }
    }
    return out
  })()

  const isIfcMode = mode === 'ifc'

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Fuente</div>
        <button
          className={`btn${!isIfcMode ? ' btn--primary' : ''}`}
          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
          onClick={() => { setMode('library'); setIfcBudget(null) }}
        >
          Manual (Biblioteca)
        </button>
        <button
          className={`btn${isIfcMode ? ' btn--primary' : ''}`}
          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
          onClick={() => { setMode('ifc'); setBudget(null) }}
          title="Calcula desde mapeo IFC + cantidades runtime (MVP: muros en m²)"
        >
          IFC (Mapeo)
        </button>
      </div>

      {warningCount > 0 && (
        <div className="banner">
          <Icon name="warning" size={16} />
          <span className="banner__msg">
            {missingPrice > 0 && <><strong>{missingPrice} Ã­tems sin precio</strong>{missingQty > 0 ? ' Â· ' : ''}</>}
            {missingQty > 0 && <><strong>{missingQty} Ã­tems sin cantidad</strong></>}
            . Algunos cÃ¡lculos estÃ¡n incompletos.
          </span>
        </div>
      )}

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi__lbl">Costo directo</div>
          <div className="kpi__val">â‚² {fmt(summary.total)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__lbl">Ãtems totales</div>
          <div className="kpi__val">{summary.items_count}</div>
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
        {summary.items_count === 0 ? (
          <div className="empty-state">
            <Icon name="budget" size={48} style={{ color: 'var(--bg-surface-raised)' }} />
            <div className="empty-state__title">Presupuesto vacÃ­o</div>
            <div className="empty-state__sub">
              {isIfcMode
                ? 'AsignÃ¡ Ã­tems a elementos IFC en "Mapeo IFC" para calcular un presupuesto desde el modelo.'
                : 'AgregÃ¡ Ã­tems desde el CatÃ¡logo para construir el presupuesto del proyecto.'}
            </div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 48 }}>FAC</th>
                <th style={{ width: 170 }}>CÃ“DIGO NBR</th>
                <th>DESCRIPCIÃ“N</th>
                <th style={{ width: 60 }}>UND</th>
                <th className="num" style={{ width: 90 }}>CANT.</th>
                <th className="num" style={{ width: 130 }}>P. UNIT (â‚²)</th>
                {isIfcMode && <th className="num" style={{ width: 70 }}>EL.</th>}
                <th className="num" style={{ width: 150 }}>SUBTOTAL (â‚²)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ facet, rows: gRows }) => (
                <Fragment key={`g-${facet}`}>
                  <tr key={`g-${facet}`} className="group-hdr">
                    <td colSpan={isIfcMode ? 7 : 6}>
                      <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>â–¾</span>
                      <Chip faceta={facet} />
                      &nbsp;{gRows.length} Ã­tem{gRows.length !== 1 ? 's' : ''}
                    </td>
                    <td className="num" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {fmt(gRows.reduce((a, r) => a + (r.subtotal ?? 0), 0))}
                    </td>
                  </tr>
                  {gRows.map(r => {
                    const rowKey = isIfcMode ? (r as IfcBudgetRow).item_id : (r as BudgetRow).entry_id
                    const sel = rowKey === selectedId
                    const editing = !isIfcMode && rowKey === editingId

                    return (
                      <tr key={rowKey} className={sel ? 'is-selected' : ''} onClick={() => onSelect(rowKey)}>
                        <td><Chip faceta={r.facet} /></td>
                        <td className="num">{r.nbr_code}</td>
                        <td className="desc">{r.description_es}</td>
                        <td>{r.unit}</td>
                        <td
                          className="num qty-cell"
                          title={isIfcMode ? 'Cantidad calculada desde IFC (MVP: muros en m² si el ítem está en m²)' : 'Clic para editar cantidad'}
                          onClick={e => {
                            if (isIfcMode) return
                            e.stopPropagation()
                            const rr = r as BudgetRow
                            startEdit(rr.entry_id, rr.manual_quantity)
                          }}
                        >
                          {isIfcMode ? (
                            (r as IfcBudgetRow).computed_quantity == null
                              ? <span className="qty-empty">â€”</span>
                              : <span className="qty-value">{fmt((r as IfcBudgetRow).computed_quantity)}</span>
                          ) : editing ? (
                            <input
                              ref={inputRef}
                              className="qty-input"
                              value={editingVal}
                              onChange={e => setEditingVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') void confirmEdit((r as BudgetRow).entry_id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              onBlur={() => void confirmEdit((r as BudgetRow).entry_id)}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            (r as BudgetRow).manual_quantity == null
                              ? <span className="qty-empty">â€”</span>
                              : <span className="qty-value">{fmt((r as BudgetRow).manual_quantity)}</span>
                          )}
                        </td>
                        <td className="num">
                          {r.unit_price == null
                            ? <span style={{ color: 'var(--warning)' }}>sin precio</span>
                            : fmt(r.unit_price)}
                        </td>
                        {isIfcMode && <td className="num">{(r as IfcBudgetRow).elements_count}</td>}
                        <td className="num">{fmt(r.subtotal)}</td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
              <tr className="ftr">
                <td colSpan={isIfcMode ? 7 : 6} style={{ textAlign: 'right' }}>TOTAL COSTO DIRECTO</td>
                <td className="num">â‚² {fmt(summary.total)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
