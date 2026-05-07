import { useEffect, useState, useRef } from 'react'
import { getItemAPU, updateItem, updateAPUComponent, addAPUComponent } from '../../api/catalog'
import { Chip, SourceBadge } from './Chip'
import { Icon } from './Icon'
import { fmt } from './formatters'
import { AddInsumoModal } from './AddInsumoModal'
import type { APUComponentRead, CatalogItem } from '../../types/catalog'

interface DetailPanelProps {
  item: CatalogItem | null
}

/** Componente interno para ediciÃ³n en lÃ­nea (texto y nÃºmeros) */
function InlineEdit({ 
  value, 
  onSave, 
  type = 'text',
  align = 'left',
  children
}: { 
  value: string | number | null, 
  onSave: (val: string) => void,
  type?: 'text' | 'number',
  align?: 'left' | 'right',
  children?: React.ReactNode
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempVal, setTempVal] = useState(value?.toString() ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTempVal(value?.toString() ?? '')
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    setIsEditing(false)
    if (tempVal !== (value?.toString() ?? '')) {
      onSave(tempVal)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setTempVal(value?.toString() ?? '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={tempVal}
        onChange={e => setTempVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          background: 'var(--bg-elevated, #2a2a2a)',
          color: 'var(--text-primary, #fff)',
          border: '1px solid var(--border-color, #444)',
          borderRadius: 2,
          padding: '2px 4px',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          textAlign: align
        }}
      />
    )
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      style={{ 
        cursor: 'text', 
        minHeight: 18, 
        minWidth: 20,
        display: 'inline-block',
        width: '100%',
        textAlign: align,
        borderBottom: '1px dashed transparent',
        transition: 'border-color 0.2s'
      }}
      onMouseEnter={e => e.currentTarget.style.borderBottom = '1px dashed var(--text-secondary, #888)'}
      onMouseLeave={e => e.currentTarget.style.borderBottom = '1px dashed transparent'}
    >
      {children ? children : (type === 'number' && value != null 
        ? (align === 'right' ? Number(value).toLocaleString('es-PY') : value) 
        : (value || <span style={{ color: 'var(--text-secondary)' }}>â€”</span>))}
    </div>
  )
}

/** Panel inferior APU â€” muestra el desglose de un Ã­tem seleccionado. */
export function DetailPanel({ item }: DetailPanelProps) {
  const [apu, setApu] = useState<APUComponentRead[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddingInsumo, setIsAddingInsumo] = useState(false)

  const fetchAPU = () => {
    if (!item) { setApu([]); return }
    setLoading(true)
    getItemAPU(item.id)
      .then(setApu)
      .catch(() => setApu([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAPU()
  }, [item?.id])

  const handleUpdateItemDesc = async (val: string) => {
    if (!item) return
    try {
      await updateItem(item.id, { description_es: val })
      // La prop item es de solo lectura, no actualizamos el estado local aquÃ­,
      // idealmente el componente padre lo refrescarÃ­a, pero evitamos crashear.
    } catch (e) {
      console.error('Error al actualizar descripciÃ³n', e)
    }
  }

  const handleUpdateComponentDesc = async (component_id: string, val: string) => {
    try {
      await updateItem(component_id, { description_es: val })
      fetchAPU()
    } catch (e) {
      console.error('Error al actualizar descripciÃ³n de componente', e)
    }
  }

  const handleUpdateCoef = async (apu_component_id: string, val: string) => {
    const num = parseFloat(val.replace(',', '.'))
    if (isNaN(num)) return
    try {
      await updateAPUComponent(apu_component_id, { quantity: num, source: 'CUSTOM' })
      fetchAPU()
    } catch (e) {
      console.error('Error al actualizar coeficiente', e)
    }
  }

  const handleUpdatePrecio = async (component_id: string, val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return
    try {
      await updateItem(component_id, { unit_price: num, fuente_precios: 'CUSTOM' })
      fetchAPU()
    } catch (e) {
      console.error('Error al actualizar precio', e)
    }
  }

  const handleUpdateFuenteCoef = async (apu_component_id: string, val: string) => {
    try {
      await updateAPUComponent(apu_component_id, { source: val || undefined })
      fetchAPU()
    } catch (e) {
      console.error('Error al actualizar fuente coef', e)
    }
  }

  const handleUpdateFuentePrecio = async (component_id: string, val: string) => {
    try {
      await updateItem(component_id, { fuente_precios: val || undefined })
      fetchAPU()
    } catch (e) {
      console.error('Error al actualizar fuente precio', e)
    }
  }

  const handleToggleVerified = async () => {
    if (!item) return
    try {
      await updateItem(item.id, { is_verified: !item.is_verified })
      // Ideally trigger a refresh of the item in the parent, but here we just wait
      // Actually we should let the user see the change instantly if possible,
      // but item is passed as prop. A full reload might be needed in parent.
      item.is_verified = !item.is_verified
    } catch (e) {
      console.error('Error al verificar', e)
    }
  }

  const handleAddInsumo = async (component_id: string, coef: number) => {
    if (!item) return
    try {
      await addAPUComponent(item.id, {
        component_id,
        quantity: coef,
        unit: 'un', // Will be ignored by backend since it uses component unit actually, wait, the backend model requires it.
        source: 'CUSTOM'
      })
      setIsAddingInsumo(false)
      fetchAPU()
    } catch (e) {
      console.error('Error al agregar insumo', e)
      alert('Error al agregar insumo')
    }
  }

  if (!item) {
    return (
      <div className="dpanel">
        <div className="dpanel__empty">
          SeleccionÃ¡ un Ã­tem para ver su AnÃ¡lisis de Precio Unitario (APU).
        </div>
      </div>
    )
  }

  return (
    <div className="dpanel">
      <div className="dpanel__strip">
        <div className="dpanel__strip-center">
          <Chip faceta={item.facet} />
          <span className="codetag">{item.nbr_code}</span>
          <span style={{ minWidth: 200 }}>
            <InlineEdit value={item.description_es} onSave={handleUpdateItemDesc} />
          </span>
          <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>Â·</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {apu.length > 0 ? `${apu.length} insumos Â· ` : ''}
            {item.unit_price != null ? `â‚² ${fmt(item.unit_price)}/${item.unit}` : 'sin precio'}
          </span>
        </div>
        <div className="dpanel__strip-tools">
          <button 
            onClick={handleToggleVerified}
            style={{ 
              background: item.is_verified ? 'var(--success-subtle)' : 'var(--warning-subtle)',
              border: `1px solid ${item.is_verified ? 'var(--success)' : 'var(--warning)'}`,
              color: item.is_verified ? 'var(--success)' : 'var(--warning)',
              borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            {item.is_verified ? '✓ Verificado' : '⚠️ Verificar'}
          </button>
          <Icon name="pin" size={14} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <div className="dpanel__body">
        {loading && (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Cargando APUâ€¦</div>
        )}
        {!loading && apu.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
            Sin componentes APU registrados para este Ã­tem.
          </div>
        )}
        {!loading && apu.length > 0 && (
          <table className="apu-tbl">
            <thead>
              <tr>
                <th style={{ width: 42 }}>FAC</th>
                <th style={{ width: 120 }}>CÃ“DIGO</th>
                <th>INSUMO</th>
                <th style={{ width: 50 }}>UND</th>
                <th className="num" style={{ width: 80 }}>COEF.</th>
                <th style={{ width: 110 }}>FUENTE COEF.</th>
                <th className="num" style={{ width: 110 }}>P. UNIT (â‚²)</th>
                <th style={{ width: 110 }}>FUENTE PRECIO</th>
              </tr>
            </thead>
            <tbody>
              {apu.map(r => (
                <tr key={r.apu_component_id}>
                  <td><Chip faceta={r.clase} /></td>
                  <td className="num">{r.codigo}</td>
                  <td>
                    <InlineEdit 
                      value={r.descripcion} 
                      onSave={v => handleUpdateComponentDesc(r.component_id, v)} 
                    />
                  </td>
                  <td>{r.unidad}</td>
                  <td className="num">
                    <InlineEdit 
                      value={r.coef} 
                      onSave={v => handleUpdateCoef(r.apu_component_id, v)} 
                      type="number" 
                      align="right" 
                    />
                  </td>
                  <td>
                    <InlineEdit 
                      value={r.fuente_coef} 
                      onSave={v => handleUpdateFuenteCoef(r.apu_component_id, v)}
                    >
                      <SourceBadge source={r.fuente_coef ?? 'â€”'} />
                    </InlineEdit>
                  </td>
                  <td className="num">
                    <InlineEdit 
                      value={r.precio} 
                      onSave={v => handleUpdatePrecio(r.component_id, v)} 
                      type="number" 
                      align="right" 
                    />
                  </td>
                  <td>
                    <InlineEdit 
                      value={r.fuente_precio} 
                      onSave={v => handleUpdateFuentePrecio(r.component_id, v)}
                    >
                      <SourceBadge source={r.fuente_precio ?? 'â€”'} />
                    </InlineEdit>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && (
          <div style={{ padding: '8px 16px' }}>
            <button 
              onClick={() => setIsAddingInsumo(true)}
              style={{ padding: '6px 12px', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 4, width: '100%', textAlign: 'center' }}
            >
              + Añadir Insumo
            </button>
          </div>
        )}
      </div>

      {isAddingInsumo && (
        <AddInsumoModal 
          onClose={() => setIsAddingInsumo(false)} 
          onAdd={handleAddInsumo} 
        />
      )}
    </div>
  )
}
