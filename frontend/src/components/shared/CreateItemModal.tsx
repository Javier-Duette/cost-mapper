import { useState } from 'react'
import type { CatalogItem } from '../../types/catalog'
import type { NbrNode } from '../../api/catalog'
import { createItem, getNbrNextItemCode } from '../../api/catalog'
import { NbrTreePicker } from './NbrTreePicker'

const UNIT_OPTIONS = [
  { value: 'm²', label: 'm² (área)' },
  { value: 'm³', label: 'm³ (volumen)' },
  { value: 'm', label: 'm (longitud)' },
  { value: 'un', label: 'un (unidad)' },
  { value: 'kg', label: 'kg' },
  { value: 'l', label: 'l' },
  { value: 'h', label: 'h (hora)' },
  { value: 'bls', label: 'bls (bolsa)' },
] as const

export function CreateItemModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (item: CatalogItem) => void }) {
  const [parentNode, setParentNode] = useState<NbrNode | null>(null)
  const [nbrCode, setNbrCode]       = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeWarning, setCodeWarning] = useState<string | null>(null)

  const [data, setData] = useState({
    description_es: '',
    unit: 'un',
    unit_price: 0,
    fuente_precios: 'CUSTOM',
    fuente_factores: 'CUSTOM',
    relevant_py: true,
    description_pt: ''
  })
  const [loading, setLoading] = useState(false)

  const handleNodeSelect = async (node: NbrNode) => {
    setParentNode(node)
    setCodeWarning(null)

    if (node.is_work_item) {
      // El usuario eligió un ítem existente — sugerir código hermano
      setCodeWarning('Este nodo ya es un ítem. Si querés crear uno similar, el código sugerido es del mismo nivel.')
      const parentCode = node.parent_nbr_code ?? deriveParentCode(node.nbr_code)
      if (parentCode) {
        setCodeLoading(true)
        try {
          const suggested = await getNbrNextItemCode(parentCode)
          setNbrCode(suggested)
        } catch { setNbrCode('') }
        finally { setCodeLoading(false) }
      } else {
        setNbrCode('')
      }
    } else {
      // Nodo de clasificación — sugerir próximo ítem bajo este nodo
      setCodeLoading(true)
      try {
        const suggested = await getNbrNextItemCode(node.nbr_code)
        setNbrCode(suggested)
      } catch { setNbrCode('') }
      finally { setCodeLoading(false) }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nbrCode.trim()) {
      alert('Seleccioná un nodo NBR y verificá el código del nuevo ítem.')
      return
    }
    const facet = nbrCode.trim().split(' ')[0]
    setLoading(true)
    try {
      const item = await createItem({
        nbr_code: nbrCode.trim(),
        facet,
        description_es: data.description_es,
        description_pt: data.description_pt || undefined,
        unit: data.unit,
        unit_price: data.unit_price || undefined,
        fuente_precios: data.fuente_precios,
        fuente_factores: data.fuente_factores,
        relevant_py: data.relevant_py,
        bim_taggable: true,
        is_verified: false,
        verificado_por: null,
        fecha_verificacion: null,
        currency: 'PYG',
      } as Parameters<typeof createItem>[0])
      onSuccess(item)
    } catch (err) {
      console.error(err)
      alert('Error al crear ítem. Verificá que el código NBR no exista ya.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={handleSubmit} style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 8, width: 520, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ margin: 0 }}>Nuevo Ítem (Manual)</h3>

        {/* Picker de nodo NBR */}
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Ubicación en el árbol NBR
          </label>
          <NbrTreePicker selected={parentNode} onSelect={handleNodeSelect} />
        </div>

        {/* Código del nuevo ítem */}
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Código del nuevo ítem
            {codeLoading && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-secondary)' }}>cargando sugerencia…</span>}
          </label>
          {codeWarning && (
            <div style={{ fontSize: 11, color: '#f77f00', marginBottom: 4 }}>⚠ {codeWarning}</div>
          )}
          <input
            required
            value={nbrCode}
            onChange={e => setNbrCode(e.target.value)}
            placeholder="Seleccioná un nodo arriba para generar el código"
            style={{ width: '100%', padding: '5px 8px', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 13 }}
          />
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
            El código se genera automáticamente según el nodo seleccionado. Podés editarlo si necesitás un valor específico.
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Descripción (ES)</label>
          <input required value={data.description_es} onChange={e => setData({ ...data, description_es: e.target.value })} style={{ width: '100%', padding: 4 }} />
        </div>

        {/* Unidad y Precio */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Unidad</label>
            <select required value={data.unit} onChange={e => setData({ ...data, unit: e.target.value })} style={{ width: '100%', padding: 4 }}>
              {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Precio Unitario (₲)</label>
            <input type="number" value={data.unit_price} onChange={e => setData({ ...data, unit_price: Number(e.target.value) })} style={{ width: '100%', padding: 4 }} />
          </div>
        </div>

        {/* Fuentes */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Fuente del Precio</label>
            <input required value={data.fuente_precios} onChange={e => setData({ ...data, fuente_precios: e.target.value })} style={{ width: '100%', padding: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Fuente del Ítem</label>
            <input required value={data.fuente_factores} onChange={e => setData({ ...data, fuente_factores: e.target.value })} style={{ width: '100%', padding: 4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" disabled={loading || !nbrCode.trim()} style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 4, opacity: (!nbrCode.trim() || loading) ? 0.5 : 1 }}>
            {loading ? 'Guardando...' : 'Crear Ítem'}
          </button>
        </div>
      </form>
    </div>
  )
}

function deriveParentCode(nbrCode: string): string | null {
  const parts = nbrCode.split(' ')
  if (parts.length <= 1) return null
  const segments = parts.slice(1)
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i] !== '00' && segments[i] !== '0') {
      if (i === 0) return null
      const parentSegs = [...segments]
      parentSegs[i] = '00'
      return parts[0] + ' ' + parentSegs.join(' ')
    }
  }
  return null
}
