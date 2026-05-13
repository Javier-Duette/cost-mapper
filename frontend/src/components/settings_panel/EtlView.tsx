import { useState, useEffect } from 'react'

interface EtlStatus {
  total_items: number
  pages: Record<string, { status: string; items_extracted: number; timestamp?: string }>
}

interface EtlItem {
  nbr_code: string
  description_pt?: string
  description_es: string
  unit: string
  components?: { nbr_code: string; quantity: number; unit: string }[]
  _skip?: boolean
}

type Phase = 'idle' | 'previewing' | 'reviewing' | 'committing' | 'done'

export function EtlView() {
  const [pages, setPages]     = useState('37')
  const [force, setForce]     = useState(false)
  const [phase, setPhase]     = useState<Phase>('idle')
  const [items, setItems]     = useState<EtlItem[]>([])
  const [stats, setStats]     = useState<Record<string, number>>({})
  const [commitResult, setCommitResult] = useState<Record<string, number> | null>(null)
  const [error, setError]     = useState('')
  const [status, setStatus]   = useState<EtlStatus | null>(null)

  // Modo clásico (output de texto) para diagnóstico
  const [classicOutput, setClassicOutput] = useState('')
  const [showClassic, setShowClassic]     = useState(false)

  const loadStatus = () =>
    fetch('/api/etl/status').then(r => r.json()).then(setStatus).catch(() => {})

  useEffect(() => { loadStatus() }, [])

  // ── Paso 1: extraer y previsualizar ──────────────────────────────────────
  const handlePreview = async () => {
    setPhase('previewing')
    setError('')
    setItems([])
    setCommitResult(null)
    try {
      const res  = await fetch('/api/etl/preview', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pages, force }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error || 'Error desconocido en la extracción')
        setPhase('idle')
        return
      }
      setItems(data.items.map((it: EtlItem) => ({ ...it, _skip: false })))
      setStats(data.stats ?? {})
      setPhase('reviewing')
    } catch (e) {
      setError(`Error de red: ${e}`)
      setPhase('idle')
    }
  }

  // ── Paso 2: confirmar inserción ──────────────────────────────────────────
  const handleCommit = async () => {
    setPhase('committing')
    setError('')
    try {
      const res  = await fetch('/api/etl/commit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error || 'Error al insertar en DB')
        setPhase('reviewing')
        return
      }
      setCommitResult(data)
      setPhase('done')
      loadStatus()
    } catch (e) {
      setError(`Error de red: ${e}`)
      setPhase('reviewing')
    }
  }

  // ── Modo clásico (dry-run + texto) ───────────────────────────────────────
  const handleClassicRun = async () => {
    setShowClassic(true)
    setClassicOutput('Ejecutando…')
    try {
      const res  = await fetch('/api/etl/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pages, dry_run: true, force }),
      })
      const data = await res.json()
      setClassicOutput(data.output ?? '(sin output)')
    } catch (e) {
      setClassicOutput(`Error de red: ${e}`)
    }
  }

  const updateDesc = (idx: number, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, description_es: val } : it))

  const toggleSkip = (idx: number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, _skip: !it._skip } : it))

  const skipped = items.filter(it => it._skip).length
  const toInsert = items.length - skipped

  // ── Status bar ───────────────────────────────────────────────────────────
  const pageEntries = Object.entries(status?.pages ?? {})
  const done    = pageEntries.filter(([, v]) => v.status === 'done').length
  const partial = pageEntries.filter(([, v]) => v.status === 'partial').length
  const errors  = pageEntries.filter(([, v]) => v.status === 'error').length

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
        Extrae tablas del PDF <strong style={{ color: 'var(--text-primary)' }}>TCPO V15</strong> con
        Gemini Vision. Revisá las traducciones antes de insertar en el catálogo.
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Ítems en catálogo', value: status?.total_items ?? 0, color: 'var(--text-primary)' },
          { label: 'Páginas OK',        value: done,    color: 'var(--success)' },
          { label: 'Parciales',         value: partial, color: 'var(--warning)' },
          { label: 'Errores',           value: errors,  color: 'var(--error)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            PÁGINAS
          </label>
          <input
            className="input"
            value={pages}
            onChange={e => setPages(e.target.value)}
            placeholder="37  ó  37-50  ó  37,40,45"
            disabled={phase === 'previewing' || phase === 'committing'}
            style={{ width: '100%' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6,
          fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={force}
            onChange={e => setForce(e.target.checked)}
            disabled={phase === 'previewing' || phase === 'committing'} />
          Forzar
        </label>

        <button
          className="btn btn--primary"
          onClick={handlePreview}
          disabled={phase === 'previewing' || phase === 'committing' || !pages.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {phase === 'previewing' ? 'Extrayendo…' : '▶ Extraer para revisar'}
        </button>

        <a href="/api/etl/cost-log" download className="btn" style={{ whiteSpace: 'nowrap', textDecoration: 'none' }}>
          CSV costos
        </a>

        <button className="btn" onClick={handleClassicRun}
          disabled={phase === 'previewing' || phase === 'committing'}
          style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 12 }}
          title="Ejecutar en modo texto (diagnóstico)">
          ⚙ Diagnóstico
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 16, background: 'var(--error-bg, #2d1515)',
          border: '1px solid var(--error)', borderRadius: 6, color: 'var(--error)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Resultado post-commit */}
      {phase === 'done' && commitResult && (
        <div style={{ padding: '14px 18px', marginBottom: 20, background: 'var(--bg-surface)',
          border: '1px solid var(--success)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>✓ Insertado correctamente</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {commitResult.inserted} nuevos · {commitResult.updated} actualizados · {commitResult.apu_rows} filas APU
            {commitResult.errors > 0 && <span style={{ color: 'var(--error)' }}> · {commitResult.errors} errores</span>}
          </div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => { setPhase('idle'); setItems([]) }}>
            Nueva extracción
          </button>
        </div>
      )}

      {/* Tabla de revisión */}
      {(phase === 'reviewing' || phase === 'committing') && items.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{items.length}</strong> ítems extraídos
              {skipped > 0 && <> · <span style={{ color: 'var(--warning)' }}>{skipped} archivados</span></>}
              {' · '}<strong style={{ color: 'var(--success)' }}>{toInsert} se insertarán</strong>
              {stats.skipped_in_db > 0 && <> · {stats.skipped_in_db} ya estaban en DB</>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setPhase('idle')} disabled={phase === 'committing'}>
                Cancelar
              </button>
              <button
                className="btn btn--primary"
                onClick={handleCommit}
                disabled={phase === 'committing' || toInsert === 0}
              >
                {phase === 'committing' ? 'Insertando…' : `✓ Confirmar e insertar (${toInsert})`}
              </button>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
                  {['Código NBR', 'Descripción PT (original)', 'Descripción ES (editable)', 'Und.', 'Comps', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left',
                      color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid var(--border-subtle, var(--border-default))',
                    opacity: item._skip ? 0.4 : 1,
                    background: item._skip ? 'var(--bg-surface)' : undefined,
                  }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {item.nbr_code}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', maxWidth: 220 }}>
                      <span title={item.description_pt}>{item.description_pt ?? '—'}</span>
                    </td>
                    <td style={{ padding: '6px 10px', minWidth: 220 }}>
                      <input
                        className="input"
                        value={item.description_es}
                        onChange={e => updateDesc(idx, e.target.value)}
                        disabled={item._skip || phase === 'committing'}
                        style={{ width: '100%', fontSize: 12, padding: '3px 6px' }}
                      />
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {item.unit}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {item.components?.length ?? 0}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => toggleSkip(idx)}
                        disabled={phase === 'committing'}
                        title={item._skip ? 'Incluir en la inserción' : 'Archivar (no insertar)'}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                          color: item._skip ? 'var(--success)' : 'var(--text-secondary)',
                          fontSize: 14,
                        }}
                      >
                        {item._skip ? '↩ Mostrar' : '🗄 Archivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Output clásico (diagnóstico) */}
      {showClassic && classicOutput && (
        <details open style={{ marginTop: 20 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Output de diagnóstico
          </summary>
          <pre style={{
            background: 'var(--bg-base)', border: '1px solid var(--border-default)',
            borderRadius: 6, padding: 16, fontSize: 12, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: 'var(--text-secondary)', maxHeight: 320, overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
          }}>
            {classicOutput}
          </pre>
        </details>
      )}
    </div>
  )
}
