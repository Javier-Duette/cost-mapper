import { useEffect, useState } from 'react'

import { getUsers, type UserSetting } from '../../api/settings'

export function VerifyModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: (username: string) => void }) {
  const [username, setUsername] = useState('')
  const [users, setUsers] = useState<UserSetting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="scrim">
      <form onSubmit={e => { e.preventDefault(); onConfirm(username) }} className="modal" style={{ width: 440 }}>
        <div className="modal__hdr">
          <h3 className="modal__title">Confirmar Verificacion</h3>
        </div>
        <div className="modal__body">
          <p style={{ marginBottom: 16 }}>
            Al marcar este item como verificado, confirmas que los insumos, coeficientes y fuentes
            fueron revisados y son correctos para su uso en presupuestos de proyectos.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Verificado por
            </label>
            {loading ? (
              <div style={{ padding: 8, fontSize: 12 }}>Cargando usuarios...</div>
            ) : users.length === 0 ? (
              <div style={{ padding: 12, border: '1px solid var(--error-subtle)', borderRadius: 4, background: 'var(--error-subtle)', color: 'var(--error)', fontSize: 12 }}>
                No hay usuarios activos definidos. Agrega uno en <strong>Configuracion</strong>.
              </div>
            ) : (
              <select
                required
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                style={{ width: '100%', height: 36 }}
              >
                <option value="">Seleccionar usuario</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" onClick={onClose} className="btn btn--ghost">Cancelar</button>
          <button type="submit" disabled={!username} className="btn btn--primary" style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }}>
            Aprobar item
          </button>
        </div>
      </form>
    </div>
  )
}
