import { useState } from 'react'

export function VerifyModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: (username: string) => void }) {
  const [username, setUsername] = useState('')
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={e => { e.preventDefault(); onConfirm(username) }} style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 8, width: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ margin: 0, color: 'var(--warning)' }}>⚠️ Confirmar Verificación</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Al marcar este ítem como verificado, estás confirmando que los insumos, coeficientes y fuentes
          han sido revisados y son correctos para su uso en los presupuestos de proyectos.
        </p>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)' }}>Verificado por (Nombre)</label>
          <input required autoFocus value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} placeholder="Ej: Ing. Juan Pérez" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" disabled={!username} style={{ padding: '6px 12px', background: 'var(--warning)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 4 }}>
            Aprobar Ítem
          </button>
        </div>
      </form>
    </div>
  )
}
