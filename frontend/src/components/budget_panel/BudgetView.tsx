import { Chip } from '../shared/Chip'
import { fmt } from '../shared/formatters'
import { Icon } from '../shared/Icon'
import type { Faceta } from '../../types/catalog'

/* Datos mock hasta que el módulo budget/ esté implementado en el backend. */
interface BudgetRow {
  id: string
  type: 'item' | 'group'
  faceta?: Faceta
  code?: string
  desc?: string
  meta?: string
  unit?: string
  qty?: number
  price?: number | null
  total?: number | null
  label?: string
  count?: number
  subtotal?: number | null
}

const MOCK_ROWS: BudgetRow[] = [
  { id: 'g1', type: 'group', faceta: '3E', label: 'Resultados de construcción', count: 14, subtotal: 187_450_000 },
  { id: 'r1', type: 'item', faceta: '3E', code: '3E.04.07.001', desc: 'Muro de mampostería 15cm', meta: 'ladrillo cerámico hueco', unit: 'm²', qty: 340, price: 485_000, total: 164_900_000 },
  { id: 'r2', type: 'item', faceta: '3E', code: '3E.05.02.012', desc: 'Revoque interior fino', meta: 'mortero 1:4', unit: 'm²', qty: 285, price: 125_000, total: 35_625_000 },
  { id: 'r3', type: 'item', faceta: '3E', code: '3E.06.01.020', desc: 'Pintura latex interior', meta: 'dos manos', unit: 'm²', qty: 285, price: null, total: null },
  { id: 'g2', type: 'group', faceta: '2C', label: 'Componentes / Materiales', count: 8, subtotal: null },
  { id: 'r4', type: 'item', faceta: '2C', code: '2C.06.01.118', desc: 'Ladrillo cerámico hueco 15×20×30', unit: 'un', qty: 18_700, price: 2_450, total: 45_815_000 },
  { id: 'r5', type: 'item', faceta: '2C', code: '2C.03.01.045', desc: 'Cemento Portland CP-II — bolsa 50kg', unit: 'bls', qty: 420, price: 62_000, total: 26_040_000 },
  { id: 'g3', type: 'group', faceta: '2N', label: 'Mano de obra', count: 4, subtotal: 38_200_000 },
  { id: 'r6', type: 'item', faceta: '2N', code: '2N.01.02.005', desc: 'Albañil oficial', unit: 'hr', qty: 320, price: 68_000, total: 21_760_000 },
  { id: 'r7', type: 'item', faceta: '2N', code: '2N.01.02.012', desc: 'Ayudante de albañil', unit: 'hr', qty: 390, price: 42_000, total: 16_380_000 },
]
const BUDGET_TOTAL = MOCK_ROWS.filter(r => r.type === 'item' && r.total != null).reduce((a, r) => a + (r.total ?? 0), 0)
const MISSING_PRICES = MOCK_ROWS.filter(r => r.type === 'item' && r.price == null).length

interface BudgetViewProps {
  search: string
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Vista de Presupuesto: KPIs + tabla agrupada por faceta. Usa datos mock (módulo budget/ pendiente). */
export function BudgetView({ search, selectedId, onSelect }: BudgetViewProps) {
  const visible = MOCK_ROWS.filter(r => {
    if (!search) return true
    if (r.type === 'group') return true
    const q = search.toLowerCase()
    return r.desc?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q)
  })

  return (
    <>
      {MISSING_PRICES > 0 && (
        <div className="banner">
          <Icon name="warning" size={16} />
          <span className="banner__msg">
            Tu presupuesto contiene <strong>{MISSING_PRICES} ítems sin precio</strong>. Algunos cálculos están incompletos.
          </span>
          <button>Completar precios</button>
        </div>
      )}

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi__lbl">Costo directo</div>
          <div className="kpi__val">₲ {fmt(BUDGET_TOTAL)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__lbl">Ítems totales</div>
          <div className="kpi__val">{MOCK_ROWS.filter(r => r.type === 'item').length}</div>
        </div>
        <div className="kpi">
          <div className="kpi__lbl">Sin precio</div>
          <div className={`kpi__val${MISSING_PRICES > 0 ? ' kpi__val--warn' : ''}`}>{MISSING_PRICES}</div>
        </div>
        <div className="kpi">
          <div className="kpi__lbl">Última modif.</div>
          <div className="kpi__val">hoy 14:32</div>
        </div>
      </div>

      <div className="section__body">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 48 }}>FAC</th>
              <th style={{ width: 130 }}>CÓDIGO NBR</th>
              <th>DESCRIPCIÓN</th>
              <th style={{ width: 60 }}>UND</th>
              <th className="num" style={{ width: 90 }}>CANT.</th>
              <th className="num" style={{ width: 130 }}>P. UNIT (₲)</th>
              <th className="num" style={{ width: 150 }}>SUBTOTAL (₲)</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              if (r.type === 'group') {
                return (
                  <tr key={`g${i}`} className="group-hdr">
                    <td colSpan={6}>
                      <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>▾</span>
                      {r.faceta && <Chip faceta={r.faceta} />}
                      &nbsp;{r.label} · {r.count} ítems
                    </td>
                    <td className="num" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {fmt(r.subtotal)}
                    </td>
                  </tr>
                )
              }
              const sel = r.id === selectedId
              return (
                <tr key={r.id} className={sel ? 'is-selected' : ''} onClick={() => onSelect(r.id)}>
                  <td>{r.faceta && <Chip faceta={r.faceta} />}</td>
                  <td className="num">{r.code}</td>
                  <td className="desc">
                    {r.desc}
                    {r.meta && <small>{r.meta}</small>}
                  </td>
                  <td>{r.unit}</td>
                  <td className="num">{fmt(r.qty)}</td>
                  <td className="num">
                    {r.price == null
                      ? <span style={{ color: 'var(--warning)' }}>sin precio</span>
                      : fmt(r.price)}
                  </td>
                  <td className="num">{fmt(r.total)}</td>
                </tr>
              )
            })}
            <tr className="ftr">
              <td colSpan={6} style={{ textAlign: 'right' }}>TOTAL COSTO DIRECTO</td>
              <td className="num">₲ {fmt(BUDGET_TOTAL)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
