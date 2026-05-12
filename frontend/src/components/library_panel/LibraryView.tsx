import { useCallback, useEffect, useRef, useState } from 'react'

import { keynotesExportUrl, listLibrary, removeFromLibrary, updateLibraryEntry } from '../../api/library'
import type { LibraryEntryReadWithItem } from '../../types/library'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import type { ToastKind } from '../shared/Toast'

interface LibraryViewProps {
  projectId: string | null
  toast: (text: string, kind?: ToastKind) => void
}

/** Vista de Biblioteca: lista de items seleccionados para el proyecto y exportacion de Keynotes. */
export function LibraryView({ projectId, toast }: LibraryViewProps) {
  const [entries, setEntries] = useState<LibraryEntryReadWithItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingVal, setEditingVal] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const data = await listLibrary(projectId)
      setEntries(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar biblioteca')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (editingId) inputRef.current?.focus()
  }, [editingId])

  const startEdit = (entryId: string, currentQty: number | null) => {
    setEditingId(entryId)
    setEditingVal(currentQty != null ? String(currentQty) : '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingVal('')
  }

  const confirmEdit = async (entryId: string, originalQty: number | null) => {
    if (!projectId) return
    const raw = editingVal.trim().replace(',', '.')
    const qty = raw === '' ? null : Number(raw)

    if (raw !== '' && (isNaN(qty!) || qty! <= 0)) {
      toast('Cantidad invalida — ingresa un numero positivo', 'warning')
      return
    }

    cancelEdit()
    setSavingId(entryId)
    try {
      await updateLibraryEntry(projectId, entryId, { manual_quantity: qty })
      setEntries(prev =>
        prev.map(e => e.id === entryId ? { ...e, manual_quantity: qty } : e),
      )
    } catch {
      setEntries(prev =>
        prev.map(e => e.id === entryId ? { ...e, manual_quantity: originalQty } : e),
      )
      toast('Error al guardar la cantidad', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const handleRemove = async (entryId: string, description: string) => {
    if (!projectId || removingId) return
    if (!confirm(`Remover "${description}" de la biblioteca?`)) return

    setRemovingId(entryId)
    try {
      await removeFromLibrary(projectId, entryId)
      toast('Item removido con exito', 'success')
      setEntries(prev => prev.filter(e => e.id !== entryId))
    } catch {
      toast('Error al remover el item', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  const unverifiedCount = entries.filter(e => !e.is_verified).length

  const handleExportKeynotes = () => {
    if (!projectId) return
    if (unverifiedCount > 0) {
      const reason = window.prompt(
        'Hay items sin verificacion humana. El keynote solo exporta codigo, descripcion y jerarquia. Escribi el motivo para liberar esta excepcion.',
      )
      if (!reason?.trim()) {
        toast('Exportacion cancelada: falta motivo de excepcion', 'warning')
        return
      }
      window.open(keynotesExportUrl(projectId, reason), '_blank')
      return
    }
    window.open(keynotesExportUrl(projectId), '_blank')
  }

  if (!projectId) {
    return (
      <div className="section__body">
        <div className="empty-state">
          <div className="empty-state__title">Sin proyecto activo</div>
          <div className="empty-state__sub">Selecciona un proyecto para ver la biblioteca.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="section__body">
      {unverifiedCount > 0 && (
        <div className="banner" style={{ background: 'var(--error-subtle)', borderColor: 'var(--error)', color: 'var(--error)' }}>
          <Icon name="warning" size={16} />
          <span className="banner__msg">
            <strong>Hay {unverifiedCount} items sin verificacion humana</strong> en la biblioteca.
            La exportacion de entregables esta bloqueada. Keynotes permite excepcion manual porque no exporta precios ni APUs.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0', padding: '0 20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Items en Biblioteca</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Estos items se incluiran en el archivo de Keynotes para Revit.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleExportKeynotes}
          disabled={entries.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: entries.length === 0 ? 0.5 : 1,
            cursor: entries.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Icon name="download" size={18} />
          {unverifiedCount > 0 ? 'Exportar Keynotes con excepcion' : 'Exportar Keynotes (.txt)'}
        </button>
      </div>

      {loading && <div style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando biblioteca...</div>}
      {error && <div style={{ padding: 20, color: 'var(--error)', fontSize: 13 }}>Error: {error}</div>}

      {!loading && !error && entries.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <Icon name="library" size={48} style={{ color: 'var(--bg-surface-raised)' }} />
          <div className="empty-state__title">La biblioteca esta vacia</div>
          <div className="empty-state__sub">
            Agrega items desde el Catalogo para que aparezcan aqui y puedan ser exportados.
          </div>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div style={{ padding: '0 20px 40px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 48 }}>FAC</th>
                <th style={{ width: 170 }}>CODIGO NBR</th>
                <th>DESCRIPCION</th>
                <th style={{ width: 60 }}>UND</th>
                <th className="num" style={{ width: 90 }}>CANT.</th>
                <th style={{ width: 100 }}>AGREGADO</th>
                <th style={{ width: 100, textAlign: 'center' }}>VERIF.</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const isEditing = editingId === e.id
                const isSaving = savingId === e.id
                return (
                  <tr
                    key={e.id}
                    style={!e.is_verified ? { background: 'rgba(244, 67, 54, 0.05)' } : {}}
                    title={!e.is_verified ? 'Item pendiente de verificacion humana' : ''}
                  >
                    <td><Chip faceta={e.facet} /></td>
                    <td className="num">{e.nbr_code}</td>
                    <td className="desc">{e.description_es}</td>
                    <td>{e.unit}</td>
                    <td
                      className="num qty-cell"
                      title="Clic para editar cantidad"
                      onClick={() => {
                        if (!isEditing && !isSaving) startEdit(e.id, e.manual_quantity)
                      }}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          className="qty-input"
                          value={editingVal}
                          disabled={isSaving}
                          onChange={ev => setEditingVal(ev.target.value)}
                          onKeyDown={ev => {
                            if (ev.key === 'Enter') void confirmEdit(e.id, e.manual_quantity)
                            if (ev.key === 'Escape') cancelEdit()
                          }}
                          onBlur={() => void confirmEdit(e.id, e.manual_quantity)}
                          onClick={ev => ev.stopPropagation()}
                        />
                      ) : isSaving ? (
                        <span className="qty-value" style={{ opacity: 0.5 }}>
                          {e.manual_quantity != null ? String(e.manual_quantity) : '—'}
                        </span>
                      ) : e.manual_quantity == null ? (
                        <span className="qty-empty">—</span>
                      ) : (
                        <span className="qty-value">{e.manual_quantity}</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {new Date(e.added_at).toLocaleDateString('es-PY')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {e.is_verified ? (
                        <span style={{ color: 'var(--success)' }}>OK</span>
                      ) : (
                        <span style={{ color: 'var(--error)', fontWeight: 600 }}>NO</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-icon"
                        title="Remover de la biblioteca"
                        onClick={() => handleRemove(e.id, e.description_es)}
                        disabled={removingId === e.id}
                        style={{ color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        {removingId === e.id ? '...' : <Icon name="trash" size={16} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
