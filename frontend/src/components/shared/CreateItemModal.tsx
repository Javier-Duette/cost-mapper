import { useState } from 'react'
import type { CatalogItem } from '../../types/catalog'
import { createItem } from '../../api/catalog'

export function CreateItemModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (item: CatalogItem) => void }) {
  const [data, setData] = useState({
    nbr_code: '',
    facet: '2N',
    description_es: '',
    unit: 'un',
    unit_price: 0,
    fuente_precios: 'CUSTOM',
    fuente_factores: 'CUSTOM',
    relevant_py: true,
    description_pt: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const item = await createItem({
        ...data,
        bim_taggable: true, // Assume user created items are taggable
        is_verified: false,
        currency: 'PYG'
      })
      onSuccess(item)
    } catch (err) {
      console.error(err)
      alert("Error al crear ítem")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--bg-surface)', padding: 24, borderRadius: 8, width: 400,
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <h3 style={{ margin: 0 }}>Nuevo Ítem (Manual)</h3>
        
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Código NBR</label>
          <input required value={data.nbr_code} onChange={e => setData({...data, nbr_code: e.target.value})} style={{ width: '100%', padding: 4 }} />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Faceta</label>
          <select value={data.facet} onChange={e => setData({...data, facet: e.target.value})} style={{ width: '100%', padding: 4 }}>
            <option value="3E">3E (Materiales)</option>
            <option value="2C">2C (Mano de Obra)</option>
            <option value="2N">2N (Equipos)</option>
            <option value="4U">4U (Servicios)</option>
            <option value="3R">3R (Insumos Básicos)</option>
            <option value="2Q">2Q (Sistemas Temporales)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Descripción (ES)</label>
          <input required value={data.description_es} onChange={e => setData({...data, description_es: e.target.value})} style={{ width: '100%', padding: 4 }} />
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Unidad</label>
            <input required value={data.unit} onChange={e => setData({...data, unit: e.target.value})} style={{ width: '100%', padding: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Precio Unitario (₲)</label>
            <input type="number" required value={data.unit_price} onChange={e => setData({...data, unit_price: Number(e.target.value)})} style={{ width: '100%', padding: 4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Fuente del Precio</label>
            <input required value={data.fuente_precios} onChange={e => setData({...data, fuente_precios: e.target.value})} style={{ width: '100%', padding: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Fuente del Ítem</label>
            <input required value={data.fuente_factores} onChange={e => setData({...data, fuente_factores: e.target.value})} style={{ width: '100%', padding: 4 }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" disabled={loading} style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 4 }}>
            {loading ? 'Guardando...' : 'Crear Ítem'}
          </button>
        </div>
      </form>
    </div>
  )
}
