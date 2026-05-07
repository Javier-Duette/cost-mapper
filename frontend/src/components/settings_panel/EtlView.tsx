import { useState, useEffect } from 'react'

interface EtlStatus {
  total_items: number
  pages: Record<string, { status: string; items_extracted: number; timestamp?: string }>
}

export function EtlView() {
  const [pages, setPages]     = useState('37')
  const [dryRun, setDryRun]   = useState(true)
  const [force, setForce]     = useState(false)
  const [running, setRunning] = useState(false)
  const [output, setOutput]   = useState('')
  const [ok, setOk]           = useState<boolean | null>(null)
  const [status, setStatus]   = useState<EtlStatus | null>(null)

  const loadStatus = () =>
    fetch('/api/etl/status').then(r => r.json()).then(setStatus).catch(() => {})

  useEffect(() => { loadStatus() }, [])

  const run = async () => {
    setRunning(true)
    setOutput('Ejecutando…')
    setOk(null)
    try {
      const res  = await fetch('/api/etl/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pages, dry_run: dryRun, force }),
      })
      const data = await res.json()
      setOutput(data.output ?? '(sin output)')
      setOk(data.ok)
      loadStatus()
    } catch (e) {
      setOutput(`Error de red: ${e}`)
      setOk(false)
    } finally {
      setRunning(false)
    }
  }

  const pageEntries = Object.entries(status?.pages ?? {})
  const done    = pageEntries.filter(([, v]) => v.status === 'done').length
  const partial = pageEntries.filter(([, v]) => v.status === 'partial').length
  const errors  = pageEntries.filter(([, v]) => v.status === 'error').length

  return (
    <div style={{ padding: '24px 32px', maxWidth: 680 }}>
      <div style={{ marginBottom: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
        Extrae tablas del PDF <strong style={{ color: 'var(--text-primary)' }}>TCPO V15</strong> con
        Gemini Vision e inserta los ítems en el catálogo. Usá <em>Dry-run</em> para ver el resultado
        sin modificar la base de datos.
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Ítems en catálogo', value: status?.total_items ?? 0, color: 'var(--text-primary)' },
          { label: 'Páginas OK',        value: done,    color: 'var(--success)' },
          { label: 'Parciales',         value: partial, color: 'var(--warning)' },
          { label: 'Errores',           value: errors,  color: 'var(--error)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, padding: '12px 14px',
            background: 'var(--bg-surface)', borderRadius: 8,
          }}>
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
            disabled={running}
            style={{ width: '100%' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6,
          fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} disabled={running} />
          Dry-run
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6,
          fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} disabled={running} />
          Forzar
        </label>

        <button
          className="btn btn--primary"
          onClick={run}
          disabled={running || !pages.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {running ? 'Ejecutando…' : '▶ Ejecutar'}
        </button>
      </div>

      {/* Output */}
      {output && (
        <pre style={{
          background: 'var(--bg-base)',
          border: `1px solid ${ok === false ? 'var(--error)' : ok === true ? 'var(--success)' : 'var(--border-default)'}`,
          borderRadius: 6, padding: 16,
          fontSize: 12, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          color: 'var(--text-secondary)',
          maxHeight: 380, overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
        }}>
          {output}
        </pre>
      )}
    </div>
  )
}
