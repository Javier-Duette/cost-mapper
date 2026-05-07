import { useState, useEffect } from 'react'
import type { CatalogItem } from '../../types/catalog'
import { searchItems } from '../../api/catalog'

export function AddInsumoModal({ onClose, onAdd }: { onClose: () => void, onAdd: (component_id: string, coef: number) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogItem[]>([])
  const [selected, setSelected] = useState<CatalogItem | null>(null)
  const [coef, setCoef] = useState(1)

  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      searchItems({ q: query, limit: 10 }).then(res => setResults(res.items))
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selected) {
      onAdd(selected.id, coef)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--bg-surface)', padding: 24, borderRadius: 8, width: 500,
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <h3 style={{ margin: 0 }}>Añadir Insumo Manual</h3>
        
        {!selected ? (
          <div>
            <input 
              placeholder="Buscar insumo (ej: cemento, clavo)..."
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              style={{ width: '100%', padding: 8, marginBottom: 8 }} 
            />
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 4 }}>
              {results.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelected(item)}
                  style={{ padding: 8, borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.nbr_code}</div>
                  <div>{item.description_es}</div>
                </div>
              ))}
              {query.length >= 3 && results.length === 0 && (
                <div style={{ padding: 8, color: 'var(--text-secondary)' }}>No se encontraron resultados.</div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 4, marginBottom: 16 }}>
              <strong>Insumo Seleccionado:</strong><br />
              {selected.nbr_code} - {selected.description_es}
              <br/>
              <button type="button" onClick={() => setSelected(null)} style={{ marginTop: 8, fontSize: 11, background: 'transparent', color: 'var(--accent)', border: 'none', cursor: 'pointer', padding: 0 }}>Cambiar Selección</button>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Coeficiente / Cantidad</label>
              <input type="number" step="0.0001" required value={coef} onChange={e => setCoef(Number(e.target.value))} style={{ width: '100%', padding: 8 }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" disabled={!selected} style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 4 }}>
            Añadir al APU
          </button>
        </div>
      </form>
    </div>
  )
}
