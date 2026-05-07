import { useState, useEffect } from 'react'
import { getUsers, getSources, createUser, createSource, updateUser, updateSource, deleteUser, deleteSource, UserSetting, SourceSetting } from '../../api/settings'
import { Icon } from '../shared/Icon'
import { InlineEdit } from '../shared/InlineEdit'

export function SettingsView() {
  const [users, setUsers] = useState<UserSetting[]>([])
  const [sources, setSources] = useState<SourceSetting[]>([])
  const [newUserName, setNewUserName] = useState('')
  const [newSourceName, setNewSourceName] = useState('')

  const load = () => {
    getUsers().then(setUsers).catch(console.error)
    getSources().then(setSources).catch(console.error)
  }

  useEffect(() => { load() }, [])

  const handleAddUser = async () => {
    if (!newUserName) return
    await createUser(newUserName)
    setNewUserName('')
    load()
  }

  const handleAddSource = async () => {
    if (!newSourceName) return
    await createSource(newSourceName)
    setNewSourceName('')
    load()
  }

  const handleUpdateUser = async (id: number, name: string) => {
    await updateUser(id, { name })
    load()
  }

  const handleUpdateSource = async (id: number, name: string) => {
    await updateSource(id, { name })
    load()
  }

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return
    await deleteUser(id)
    load()
  }

  const handleDeleteSource = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar esta fuente?')) return
    await deleteSource(id)
    load()
  }

  return (
    <div style={{ padding: 32, display: 'flex', flexWrap: 'wrap', gap: 40, background: 'var(--bg-main)', minHeight: '100%' }}>
      <div style={{ flex: '1 1 400px', maxWidth: 600 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Icon name="catalog" size={24} /> Usuarios de Verificación
        </h2>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)', padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input 
              value={newUserName} 
              onChange={e => setNewUserName(e.target.value)}
              placeholder="Nombre del nuevo usuario..."
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4 }}
            />
            <button onClick={handleAddUser} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Añadir</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {users.map((u: UserSetting) => (
              <div key={u.id} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <InlineEdit value={u.name} onSave={(v: string) => handleUpdateUser(u.id, v)}>
                  <span style={{ cursor: 'pointer' }}>{u.name}</span>
                </InlineEdit>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--success)' }}>Activo</span>
                  <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}>
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: '1 1 400px', maxWidth: 600 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Icon name="library" size={24} /> Fuentes de Precios
        </h2>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)', padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input 
              value={newSourceName} 
              onChange={e => setNewSourceName(e.target.value)}
              placeholder="Nombre de la nueva fuente..."
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4 }}
            />
            <button onClick={handleAddSource} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Añadir</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sources.map((s: SourceSetting) => (
              <div key={s.id} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <InlineEdit value={s.name} onSave={(v: string) => handleUpdateSource(s.id, v)}>
                  <span style={{ cursor: 'pointer' }}>{s.name}</span>
                </InlineEdit>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{s.type}</span>
                  <button onClick={() => handleDeleteSource(s.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 4 }}>
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
