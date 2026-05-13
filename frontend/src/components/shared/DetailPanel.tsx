import { Fragment, useEffect, useState } from 'react'
import { getItem, getItemAPU, updateItem, updateAPUComponent, addAPUComponent, deleteItem, getItemUsedIn, deleteAPUComponent } from '../../api/catalog'
import { Chip, SourceBadge } from './Chip'
import { Icon } from './Icon'
import { fmt } from './formatters'
import { AddInsumoModal } from './AddInsumoModal'
import { VerifyModal } from './VerifyModal'
import { AuditModal } from './AuditModal'
import { InlineEdit } from './InlineEdit'
import type { APUComponentRead, CatalogItem } from '../../types/catalog'

interface DetailPanelProps {
  item: CatalogItem | null
  onUpdate?: (updated: CatalogItem) => void
  onDelete?: () => void
}

/** Panel inferior APU — muestra el desglose de un ítem seleccionado. */
export function DetailPanel({ item, onUpdate, onDelete }: DetailPanelProps) {
  const [apu, setApu] = useState<APUComponentRead[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddingInsumo, setIsAddingInsumo] = useState(false)
  const [showUsedIn, setShowUsedIn] = useState(false)
  const [itemUsedIn, setItemUsedIn] = useState<CatalogItem[] | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [auditAction, setAuditAction] = useState<{
    type: 'item_price' | 'comp_price',
    targetId: string,
    newValue: string,
    apuId?: string
  } | null>(null)

  const fetchAPU = () => {
    if (!item) { setApu([]); return }
    setLoading(true)
    getItemAPU(item.id)
      .then(setApu)
      .catch(() => setApu([]))
      .finally(() => setLoading(false))
  }

  const refreshItem = async () => {
    if (!item) return
    try {
      const updated = await getItem(item.id)
      onUpdate?.(updated)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchAPU()
    setShowUsedIn(false)
    setItemUsedIn(null)
  }, [item?.id])

  const handleUpdateItemDesc = async (val: string) => {
    if (!item) return
    try {
      await updateItem(item.id, { description_es: val })
      if (onUpdate) onUpdate({ ...item, description_es: val })
    } catch (e) {
      console.error('Error al actualizar descripción', e)
    }
  }

  const handleUpdateItemPriceRequest = (val: string) => {
    if (!item) return
    setAuditAction({ type: 'item_price', targetId: item.id, newValue: val })
  }

  const handleUpdateItemPriceConfirm = async (username: string, source: string) => {
    if (!item || !auditAction) return
    const num = parseFloat(auditAction.newValue)
    try {
      await updateItem(item.id, { 
        unit_price: num, 
        fuente_precios: source,
        is_verified: false,
        verificado_por: null,
        fecha_verificacion: null
      }, username)
      if (onUpdate) {
        onUpdate({ 
          ...item, 
          unit_price: num, 
          fuente_precios: source,
          is_verified: false,
          verificado_por: null,
          fecha_verificacion: null,
          modificado_por: username,
          updated_at: new Date().toISOString()
        })
      }
      setAuditAction(null)
    } catch (e) {
      console.error('Error al actualizar precio del ítem', e)
    }
  }

  const handleUpdateComponentDesc = async (component_id: string, val: string) => {
    try {
      await updateItem(component_id, { description_es: val })
      fetchAPU()
    } catch (e) {
      console.error('Error al actualizar descripción de componente', e)
    }
  }

  const handleUpdateCoef = async (apu_component_id: string, val: string) => {
    const num = parseFloat(val.replace(',', '.'))
    if (isNaN(num)) return
    try {
      await updateAPUComponent(apu_component_id, { quantity: num, source: 'CUSTOM' })
      fetchAPU()
      await refreshItem()
    } catch (e) {
      console.error('Error al actualizar coeficiente', e)
    }
  }

  const handleUpdatePrecioRequest = (component_id: string, val: string) => {
    setAuditAction({ type: 'comp_price', targetId: component_id, newValue: val })
  }

  const handleUpdatePrecioConfirm = async (username: string, source: string) => {
    if (!auditAction) return
    const num = parseFloat(auditAction.newValue)
    try {
      await updateItem(auditAction.targetId, { unit_price: num, fuente_precios: source }, username)
      fetchAPU()
      await refreshItem()
      setAuditAction(null)
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
    if (item.is_verified) {
      try {
        await updateItem(item.id, { 
          is_verified: false, 
          verificado_por: null,
          fecha_verificacion: null
        })
        if (onUpdate) {
          onUpdate({
            ...item,
            is_verified: false,
            verificado_por: null,
            fecha_verificacion: null
          })
        }
      } catch (e) {
        console.error('Error al quitar verificacion', e)
      }
    } else {
      setIsVerifying(true)
    }
  }

  const handleVerify = async (username: string) => {
    if (!item) return
    const now = new Date().toISOString()
    try {
      await updateItem(item.id, { 
        is_verified: true, 
        verificado_por: username,
        fecha_verificacion: now
      })
      if (onUpdate) {
        onUpdate({
          ...item,
          is_verified: true,
          verificado_por: username,
          fecha_verificacion: now
        })
      }
      setIsVerifying(false)
    } catch (e) {
      console.error('Error al verificar', e)
    }
  }

  const handleAddInsumo = async (component_id: string, unit: string, coef: number) => {
    if (!item) return
    try {
      await addAPUComponent(item.id, {
        component_id,
        quantity: coef,
        unit,
        source: 'CUSTOM'
      })
      setIsAddingInsumo(false)
      fetchAPU()
      await refreshItem()
    } catch (e) {
      console.error('Error al agregar insumo', e)
      alert('Error al agregar insumo')
    }
  }

  const handleToggleUsedIn = async () => {
    if (showUsedIn) { setShowUsedIn(false); return }
    setShowUsedIn(true)
    if (itemUsedIn !== null) return
    try {
      const parents = await getItemUsedIn(item!.id)
      setItemUsedIn(parents)
    } catch {
      setItemUsedIn([])
    }
  }

  const handleDeleteInsumo = async (apuId: string, codigo: string) => {
    if (!confirm(`¿Quitar ${codigo} del APU de este ítem?`)) return
    try {
      await deleteAPUComponent(apuId)
      fetchAPU()
      await refreshItem()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo quitar el insumo')
    }
  }

  const handleDeleteItem = async () => {
    if (!item) return
    const ok = confirm(`Eliminar ítem ${item.nbr_code}?\n\nSolo funciona si el ítem no está en la Biblioteca, el Mapeo IFC, ni como insumo en el APU de otro ítem.`)
    if (!ok) return
    try {
      await deleteItem(item.id)
      onDelete?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar el ítem')
    }
  }

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
          <Chip faceta={item.facet} />
          <span className="codetag">{item.nbr_code}</span>
          <span style={{ minWidth: 200 }}>
            <InlineEdit value={item.description_es} onSave={handleUpdateItemDesc} />
          </span>
          <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>·</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {apu.length > 0 ? `${apu.length} insumos · ` : ''}
            <InlineEdit value={item.unit_price} onSave={handleUpdateItemPriceRequest} type="number" align="right">
              {item.unit_price != null ? `₲ ${fmt(item.unit_price)}/${item.unit}` : 'sin precio'}
            </InlineEdit>
          </span>
        </div>
        <div className="dpanel__strip-tools">
          <button
            onClick={() => { void handleToggleUsedIn() }}
            className="btn"
            title="Ver ítems que usan este ítem como componente APU"
            style={{ fontSize: 11, padding: '4px 8px' }}
          >
            {showUsedIn ? '▲ Usos' : `Usos${itemUsedIn ? ` (${itemUsedIn.length})` : ''}`}
          </button>
          <button
            onClick={() => { void handleDeleteItem() }}
            title="Eliminar ítem"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: 4,
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Icon name="trash" size={14} />
          </button>
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
            {item.is_verified 
              ? `✓ Verificado por ${item.verificado_por || 'Usuario'} el ${item.fecha_verificacion ? new Date(item.fecha_verificacion).toLocaleDateString('es-PY') : ''}` 
              : '⚠️ Verificar'}
          </button>
          <div title={`Cargado por: ${item.creado_por}\nÚltima modificación: ${item.modificado_por || item.creado_por} el ${new Date(item.updated_at).toLocaleString('es-PY')}`}>
             <Icon name="info" size={14} style={{ color: 'var(--text-secondary)', cursor: 'help' }} />
          </div>
          <Icon name="pin" size={14} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {showUsedIn && (
        <div style={{ padding: '6px 16px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          {itemUsedIn === null && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cargando…</span>
          )}
          {itemUsedIn?.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Este ítem no se usa como insumo en ningún APU.</span>
          )}
          {(itemUsedIn?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Usado en:</span>
              {itemUsedIn!.map(p => (
                <span key={p.id}
                  style={{ fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '2px 8px' }}
                  title={p.description_es}
                >
                  {p.nbr_code} — {p.description_es}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="dpanel__body">
        {loading && (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Cargando APU...</div>
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
                <th style={{ width: 24 }}></th>
                <th style={{ width: 42 }}>FAC</th>
                <th style={{ width: 120 }}>CÓDIGO</th>
                <th>INSUMO</th>
                <th style={{ width: 60 }}>UND</th>
                <th className="num" style={{ width: 70 }}>COEF.</th>
                <th style={{ width: 100 }}>FUENTE COEF.</th>
                <th className="num" style={{ width: 110 }}>P. UNIT (₲)</th>
                <th style={{ width: 90 }}>FUENTE PRECIO</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {apu.map(r => (
                <Fragment key={r.apu_component_id}>
                <tr>
                  <td style={{ padding: '0 4px' }}>
                    <div 
                      className="info-trigger" 
                      title={`Cargado por: ${r.creado_por || 'Sistema'}\nÚltima modificación: ${r.modificado_por || r.creado_por || 'Sistema'} el ${r.updated_at ? new Date(r.updated_at).toLocaleString('es-PY') : 'N/A'}`}
                    >
                      <Icon name="info" size={14} style={{ color: 'var(--text-secondary)', cursor: 'help' }} />
                    </div>
                  </td>
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
                      <SourceBadge source={r.fuente_coef ?? '—'} />
                    </InlineEdit>
                  </td>
                  <td className="num">
                    <InlineEdit 
                      value={r.precio} 
                      onSave={v => handleUpdatePrecioRequest(r.component_id, v)} 
                      type="number" 
                      align="right" 
                    />
                  </td>
                  <td>
                    <InlineEdit
                      value={r.fuente_precio}
                      onSave={v => handleUpdateFuentePrecio(r.component_id, v)}
                    >
                      <SourceBadge source={r.fuente_precio ?? '—'} />
                    </InlineEdit>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn"
                      style={{ height: 20, padding: '0 6px', fontSize: 15, color: 'var(--text-secondary)' }}
                      onClick={() => { void handleDeleteInsumo(r.apu_component_id, r.codigo) }}
                      title="Quitar este insumo del APU"
                    >
                      ×
                    </button>
                  </td>
                </tr>
                </Fragment>
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
      {isVerifying && (
        <VerifyModal 
          onClose={() => setIsVerifying(false)} 
          onConfirm={handleVerify} 
        />
      )}
      {auditAction && (
        <AuditModal
          title="Confirmar Cambio de Precio"
          message={
            auditAction.type === 'item_price'
              ? apu.length > 0
                ? `Vas a fijar el precio del ítem a ₲ ${parseFloat(auditAction.newValue).toLocaleString('es-PY')} de forma manual. Este ítem tiene ${apu.length} insumo${apu.length !== 1 ? 's' : ''} en su APU — si confirmás, el precio manual sobreescribe el APU. Los insumos seguirán visibles pero dejarán de controlar el precio del ítem. Usá esta opción solo si no tenés APU cargado o si el precio de mercado difiere del APU.`
                : `Vas a establecer el precio unitario del ítem a ₲ ${parseFloat(auditAction.newValue).toLocaleString('es-PY')}.`
              : `Vas a modificar el precio del insumo a ₲ ${parseFloat(auditAction.newValue).toLocaleString('es-PY')}. Este precio se comparte en todos los APUs donde aparece este insumo — el cambio afecta a todos los ítems que lo usan.`
          }
          confirmText="Confirmar Cambio"
          onClose={() => setAuditAction(null)}
          onConfirm={auditAction.type === 'item_price' ? handleUpdateItemPriceConfirm : handleUpdatePrecioConfirm}
          initialSource={item?.fuente_precios || 'CUSTOM'}
        />
      )}
    </div>
  )
}
