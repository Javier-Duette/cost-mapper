import { useState, useEffect } from 'react'
import { getUsers, getSources, UserSetting, SourceSetting } from '../../api/settings'

interface AuditModalProps {
  title: string
  message: string
  confirmText: string
  onClose: () => void
  onConfirm: (username: string, source: string) => void
  warning?: boolean
  initialSource?: string
}

export function AuditModal({ title, message, confirmText, onClose, onConfirm, warning = true, initialSource = 'CUSTOM' }: AuditModalProps) {
  const [username, setUsername] = useState('')
  const [source, setSource] = useState(initialSource)
  const [users, setUsers] = useState<UserSetting[]>([])
  const [sources, setSources] = useState<SourceSetting[]>([])

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error)
    getSources().then(setSources).catch(console.error)
  }, [])
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <form 
        onSubmit={e => { e.preventDefault(); onConfirm(username, source) }} 
        style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 8, width: 420, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      >
        <h3 style={{ margin: 0, color: warning ? 'var(--warning)' : 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {warning ? '⚠️' : 'ℹ️'} {title}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {message}
        </p>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Tu Nombre / Identificación</label>
          <select 
            required 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            style={{ width: '100%', padding: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4 }}
          >
            <option value="">Seleccionar Usuario...</option>
            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Fuente del Precio / Justificación</label>
          <select 
            required 
            value={source} 
            onChange={e => setSource(e.target.value)} 
            style={{ width: '100%', padding: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4 }}
          >
            <option value="">Seleccionar Fuente...</option>
            {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 4 }}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={!username} 
            style={{ 
              padding: '8px 16px', 
              background: warning ? 'var(--warning)' : 'var(--accent)', 
              border: 'none', 
              color: '#fff', 
              cursor: 'pointer', 
              borderRadius: 4,
              fontWeight: 500
            }}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </div>
  )
}
