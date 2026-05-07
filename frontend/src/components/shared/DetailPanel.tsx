import { useEffect, useState } from 'react'
import { getItemAPU } from '../../api/catalog'
import { Chip, SourceBadge } from './Chip'
import { Icon } from './Icon'
import { fmt } from './formatters'
import type { APUComponent, CatalogItem } from '../../types/catalog'

interface DetailPanelProps {
  item: CatalogItem | null
}

/** Panel inferior APU — muestra el desglose de un ítem seleccionado. */
export function DetailPanel({ item }: DetailPanelProps) {
  const [apu, setApu] = useState<APUComponent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!item) { setApu([]); return }
    setLoading(true)
    getItemAPU(item.id)
      .then(setApu)
      .catch(() => setApu([]))
      .finally(() => setLoading(false))
  }, [item?.id])

  if (!item) {
    return (
      <div className="dpanel">
        <div className="dpanel__empty">
          Seleccioná un ítem para ver su Análisis de Precio Unitario (APU).
        </div>
      </div>
    )
  }

  return (
    <div className="dpanel">
      <div className="dpanel__strip">
        <div className="dpanel__strip-center">
          <Chip faceta={item.faceta} />
          <span className="codetag">{item.nbr_code}</span>
          <span>{item.description}</span>
          <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>·</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {apu.length} insumos · ₲ {fmt(item.unit_price)}/{item.unit}
          </span>
        </div>
        <div className="dpanel__strip-tools">
          <Icon name="pin" size={14} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <div className="dpanel__body">
        {loading && (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Cargando APU…</div>
        )}
        {!loading && apu.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
            Sin componentes APU registrados para este ítem.
          </div>
        )}
        {!loading && apu.length > 0 && (
          <table className="apu-tbl">
            <thead>
              <tr>
                <th style={{ width: 42 }}>FAC</th>
                <th style={{ width: 120 }}>CÓDIGO</th>
                <th>INSUMO</th>
                <th style={{ width: 50 }}>UND</th>
                <th className="num" style={{ width: 80 }}>COEF.</th>
                <th style={{ width: 110 }}>FUENTE COEF.</th>
                <th className="num" style={{ width: 110 }}>P. UNIT (₲)</th>
                <th style={{ width: 110 }}>FUENTE PRECIO</th>
              </tr>
            </thead>
            <tbody>
              {apu.map(r => (
                <tr key={r.id}>
                  <td><Chip faceta={r.component_faceta} /></td>
                  <td className="num">{r.component_code}</td>
                  <td>{r.component_description}</td>
                  <td>{r.component_unit}</td>
                  <td className="num">{r.coefficient.toLocaleString('es-PY')}</td>
                  <td><SourceBadge source={r.coef_source} /></td>
                  <td className="num">{fmt(r.unit_price)}</td>
                  <td><SourceBadge source={r.price_source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
