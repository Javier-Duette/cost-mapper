import { useCallback, useEffect, useMemo, useState } from 'react'
import { assignMappingGroup, unassignMappingGroup } from '../../api/mapping'
import { searchItems } from '../../api/catalog'
import { Chip } from '../shared/Chip'
import { Icon } from '../shared/Icon'
import type { ToastKind } from '../shared/Toast'
import type { CatalogItem } from '../../types/catalog'
import type { MappingGroupRead } from '../../types/mapping'

interface MappingGroupDetailProps {
  projectId: string
  tab: 'auto' | 'unassigned' | 'manual' | 'conflicts'
  group: MappingGroupRead | null
  toast: (text: string, kind?: ToastKind) => void
  onRefresh: () => void
}

/** Panel de detalle para mapear un grupo (IfcType + tipo) de una sola vez. */
export function MappingGroupDetail({ projectId, tab, group, toast, onRefresh }: MappingGroupDetailProps) {
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [busyUnassign, setBusyUnassign] = useState(false)

  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    setCatalogQuery('')
    setCatalogItems([])
    setCatalogError(null)
  }, [group?.ifc_type, group?.ifc_type_name, tab])

  const canOperate = Boolean(projectId && group && (tab === 'unassigned' || tab === 'manual'))

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

  const title = useMemo(() => {
    if (!group) return null
    return `${group.ifc_type} — ${group.ifc_type_name ?? '—'}`
  }, [group])

  const assignedLabel = useMemo(() => {
    if (!group) return null
    if (group.assigned_is_mixed) return 'Mixto (múltiples ítems)'
    if (group.assigned_item) return `${group.assigned_item.nbr_code} — ${group.assigned_item.description_es}`
    return null
  }, [group])

  const handleAssign = async (itemId: string) => {
    if (!group) return
    if (!canOperate) return
    if (busyItemId) return
    setBusyItemId(itemId)
    try {
      const res = await assignMappingGroup(projectId, {
        ifc_type: group.ifc_type,
        ifc_type_name: group.ifc_type_name,
        item_id: itemId,
        replace_existing: tab === 'manual',
      })
      if (tab === 'manual') {
        toast(`Reasignado a ${res.created} elementos (borradas: ${res.deleted_assignments ?? 0})`, 'success')
      } else {
        toast(`Asignado a ${res.created} elementos (saltados: ${res.skipped_already_assigned})`, 'success')
      }
      onRefresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al asignar grupo', 'error')
    } finally {
      setBusyItemId(null)
    }
  }

  const handleUnassign = async () => {
    if (!group || busyUnassign) return
    setBusyUnassign(true)
    try {
      const res = await unassignMappingGroup(projectId, {
        ifc_type: group.ifc_type,
        ifc_type_name: group.ifc_type_name,
      })
      toast(`Desmapeado: ${res.deleted} asignación${res.deleted !== 1 ? 'es' : ''} eliminada${res.deleted !== 1 ? 's' : ''}`, 'success')
      onRefresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al desmapear grupo', 'error')
    } finally {
      setBusyUnassign(false)
    }
  }

  if (!group) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        Seleccioná un grupo para mapear por familia y tipo.
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="mapping" size={16} />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Grupo</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{group.total_elements}</span> elementos
        </div>
      </div>

      {tab !== 'unassigned' && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {tab === 'manual' && assignedLabel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>Ítem asignado: <strong>{assignedLabel}</strong>. Podés reasignar o desmapear el grupo.</span>
              <button
                className="btn"
                style={{ height: 26, padding: '0 10px', fontSize: 12, color: 'var(--error)', borderColor: 'var(--error)' }}
                disabled={busyUnassign}
                onClick={() => { void handleUnassign() }}
              >
                {busyUnassign ? '…' : 'Desmapear grupo'}
              </button>
            </div>
          ) : (
            <>
              El mapeo manual masivo se hace desde <strong>Sin asignar</strong>.
            </>
          )}
        </div>
      )}

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
            {catalogItems.map(item => (
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
                  className="btn btn--primary"
                  style={{ height: 26, padding: '0 8px', fontSize: 12 }}
                  disabled={!canOperate || busyItemId === item.id}
                  onClick={() => { void handleAssign(item.id) }}
                >
                  {busyItemId === item.id ? '…' : (tab === 'manual' ? 'Reasignar grupo' : 'Asignar al grupo')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
