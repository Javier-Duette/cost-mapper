import { useEffect, useMemo, useRef, useState } from 'react'

import { parseIfcElementsWithStepText, type StepParsedElement } from '../../ifc/stepText'
import { Icon } from '../shared/Icon'

interface MappingViewerOnlyProps {
  ifcFile: File | null
  onIfcFileChange: (file: File | null) => void
  onEnableFullMode?: () => void
}

/**
 * Vista mínima de lectura IFC: permite cargar un IFC local y listar sus elementos (parser STEP),
 * sin depender del backend.
 */
export function MappingViewerOnly({ ifcFile, onIfcFileChange, onEnableFullMode }: MappingViewerOnlyProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elements, setElements] = useState<StepParsedElement[]>([])

  useEffect(() => {
    setQ('')
    setError(null)
    setElements([])

    if (!ifcFile) return

    let alive = true
    setLoading(true)

    void (async () => {
      try {
        const text = await ifcFile.text()
        const parsed = parseIfcElementsWithStepText(text)
        if (!alive) return

        if (parsed.length === 0) throw new Error('No se detectaron elementos con GlobalId en el IFC.')
        setElements(parsed)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Error al leer el IFC.')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [ifcFile])

  const openFilePicker = () => {
    if (fileRef.current) fileRef.current.value = ''
    fileRef.current?.click()
  }

  const clearIfcFile = () => {
    if (fileRef.current) fileRef.current.value = ''
    onIfcFileChange(null)
  }

  const sizeLabel = (() => {
    if (!ifcFile) return null
    const kb = ifcFile.size / 1024
    if (kb < 1024) return `${kb.toFixed(0)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  })()

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return elements
    return elements.filter(e => {
      if (e.globalId.toLowerCase().includes(query)) return true
      if (e.ifcType.toLowerCase().includes(query)) return true
      if ((e.ifcName ?? '').toLowerCase().includes(query)) return true
      return false
    })
  }, [elements, q])

  return (
    <div className="section__body" style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn btn--primary" onClick={openFilePicker}>
          <Icon name="import" size={14} /> Cargar IFC local
        </button>
        {onEnableFullMode && (
          <button className="btn" onClick={onEnableFullMode} title="Vuelve al panel completo (requiere backend)">
            <Icon name="mapping" size={14} /> Modo completo
          </button>
        )}
        {ifcFile && (
          <button className="btn" onClick={clearIfcFile} title="Limpia el IFC local">
            <Icon name="reset" size={14} /> Limpiar
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".ifc"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0] ?? null
            onIfcFileChange(file)
            e.currentTarget.value = ''
          }}
        />
      </div>

      <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.35, flexShrink: 0 }}>
        {ifcFile ? (
          <div>
            IFC local seleccionado: <strong>{ifcFile.name}</strong>
            {sizeLabel ? <span style={{ opacity: 0.8 }}> ({sizeLabel})</span> : null}
          </div>
        ) : (
          <div>
            Seleccioná un archivo <strong>.ifc</strong> local para leer sus elementos.
          </div>
        )}
      </div>

      {ifcFile && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          <div className="input-search" style={{ width: 360 }}>
            <Icon name="search" size={14} />
            <input
              type="text"
              placeholder="Buscar por GlobalId, tipo o nombre…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {loading ? 'Leyendo…' : (
              <>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{filtered.length.toLocaleString('es-PY')}</span> elementos
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 10, border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--error)', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {!loading && !error && ifcFile && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>GLOBALID</th>
                <th style={{ width: 120 }}>TIPO</th>
                <th>NOMBRE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={`${e.globalId}:${e.expressId}`} title={e.globalId}>
                  <td className="num">{e.globalId}</td>
                  <td>{e.ifcType}</td>
                  <td className="desc">{e.ifcName ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
