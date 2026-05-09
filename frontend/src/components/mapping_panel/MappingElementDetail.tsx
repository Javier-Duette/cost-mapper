import { useCallback, useEffect, useMemo, useState } from 'react'
import { createMappingAssignment, deleteMappingAssignment } from '../../api/mapping'
import { searchItems } from '../../api/catalog'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import type { ToastKind } from '../shared/Toast'
import type { CatalogItem } from '../../types/catalog'
import type { MappingElementRow, ProjectAssignmentRead } from '../../types/mapping'

interface MappingElementDetailProps {
  projectId: string
  row: MappingElementRow | null
  toast: (text: string, kind?: ToastKind) => void
  onRefresh: () => void
}

/** Panel inferior de detalle de un elemento IFC (asignar / quitar). */
export function MappingElementDetail({ projectId, row, toast, onRefresh }: MappingElementDetailProps) {
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)

  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const element = row?.element ?? null
  const assignments = row?.assignments ?? []
  const suggestions = row?.suggestions ?? []

  const canOperate = Boolean(projectId && element)

  useEffect(() => {
    setCatalogQuery('')
    setCatalogItems([])
    setCatalogError(null)
  }, [element?.id])

  const loadCatalog = useCallback(async () => {
    if (!catalogQuery.trim()) {
      setCatalogItems([])
      setCatalogError(null)
      return
    }
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const res = await searchItems({ q: catalogQuery.trim(), limit: 20 })
      setCatalogItems(res.items)
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'Error al buscar catálogo')
    } finally {
      setCatalogLoading(false)
    }
  }, [catalogQuery])

  useEffect(() => {
    const t = setTimeout(() => { void loadCatalog() }, 250)
    return () => clearTimeout(t)
  }, [loadCatalog])

  const assignmentItemIds = useMemo(() => new Set(assignments.map(a => a.item_id)), [assignments])

  const handleAssign = async (itemId: string) => {
    if (!element) return
    if (busyItemId) return
    if (assignmentItemIds.has(itemId)) {
      toast('Ya existe una asignación para este ítem', 'warning')
      return
    }
    setBusyItemId(itemId)
    try {
      await createMappingAssignment(projectId, { ifc_element_id: element.id, item_id: itemId })
      toast('Asignación creada', 'success')
      onRefresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al asignar', 'error')
    } finally {
      setBusyItemId(null)
    }
  }

  const handleRemove = async (a: ProjectAssignmentRead) => {
    if (busyAssignmentId) return
    setBusyAssignmentId(a.id)
    try {
      await deleteMappingAssignment(projectId, a.id)
      toast('Asignación removida', 'success')
      onRefresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al quitar asignación', 'error')
    } finally {
      setBusyAssignmentId(null)
    }
  }

  if (!element) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        Seleccioná un elemento para ver detalle y asignar un ítem.
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Icon name="mapping" size={16} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Elemento</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
            {element.global_id}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 6, columnGap: 12, fontSize: 12 }}>
          <div style={{ color: 'var(--text-secondary)' }}>Tipo</div>
          <div>{element.ifc_type ?? '—'}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Nombre</div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {element.ifc_name ?? '—'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Nivel</div>
          <div>{element.ifc_level ?? '—'}</div>
          <div style={{ color: 'var(--text-secondary)' }}>NBR (IFC)</div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>{element.nbr_classification ?? '—'}</div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-secondary)' }}>Asignaciones</div>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {assignments.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sin asignaciones.</div>
          ) : assignments.map(a => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '6px 10px',
                background: 'var(--bg-surface)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)', minWidth: 120 }}>
                {a.item?.nbr_code ?? a.item_id}
              </div>
              {a.item?.facet ? <Chip faceta={a.item.facet} /> : null}
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                {a.item?.description_es ?? ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.classification_source}</div>
              <button
                className="btn"
                style={{ height: 26, padding: '0 8px', fontSize: 12 }}
                disabled={!canOperate || busyAssignmentId === a.id}
                onClick={() => { void handleRemove(a) }}
              >
                {busyAssignmentId === a.id ? '…' : 'Quitar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Sugerencias</div>
          {suggestions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sin sugerencias.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map(s => (
                <div
                  key={`${element.id}:${s.item_id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    background: 'var(--bg-surface)',
                  }}
                >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 120 }}>
                    {s.nbr_code}
                  </div>
                  {s.facet ? <Chip faceta={s.facet} /> : null}
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {s.description_es}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {Math.round(s.confidence)}%
                  </div>
                  <button
                    className="btn btn--primary"
                    style={{ height: 26, padding: '0 8px', fontSize: 12 }}
                    disabled={!canOperate || busyItemId === s.item_id}
                    onClick={() => { void handleAssign(s.item_id) }}
                  >
                    {busyItemId === s.item_id ? '…' : 'Asignar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Buscar en catálogo</div>
          <div className="input-search" style={{ width: '100%' }}>
            <Icon name="search" size={14} />
            <input
              type="text"
              placeholder="Buscar ítem por código o descripción…"
              value={catalogQuery}
              onChange={e => setCatalogQuery(e.target.value)}
            />
          </div>
          {catalogError && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--error)' }}>⚠ {catalogError}</div>
          )}
          {catalogLoading && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>Buscando…</div>
          )}
          {!catalogLoading && catalogQuery.trim() && catalogItems.length === 0 && !catalogError && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>Sin resultados.</div>
          )}
          {!catalogLoading && catalogItems.length > 0 && (
            <div style={{ marginTop: 8, border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
              {catalogItems.map(item => {
                const disabled = assignmentItemIds.has(item.id)
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 120 }}>
                      {item.nbr_code}
                    </div>
                    <Chip faceta={item.facet} />
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {item.description_es}
                    </div>
                    <button
                      className={`btn${disabled ? '' : ' btn--primary'}`}
                      style={{ height: 26, padding: '0 8px', fontSize: 12 }}
                      disabled={!canOperate || disabled || busyItemId === item.id}
                      onClick={() => { void handleAssign(item.id) }}
                      title={disabled ? 'Ya asignado' : 'Asignar'}
                    >
                      {busyItemId === item.id ? '…' : (disabled ? 'Asignado' : 'Asignar')}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
