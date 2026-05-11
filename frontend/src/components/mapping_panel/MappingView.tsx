import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getProject } from '../../api/projects'
import { uploadIfc } from '../../api/ifc'
import { seedIfcElements } from '../../api/ifc'
import { autoAssignByIfcClassification, listMappingElements } from '../../api/mapping'
import { Icon } from '../shared/Icon'
import { MappingTabs } from './MappingTabs'
import { MappingElementsTable } from './MappingElementsTable'
import { parseIfcElementsWithStepText } from '../../ifc/stepText'
import type { ToastKind } from '../shared/Toast'
import type { Project } from '../../types/projects'
import type { MappingElementRow, MappingElementsPage, MappingTab } from '../../types/mapping'
import type { IfcElementSeed } from '../../types/ifc'

interface MappingViewProps {
  projectId?: string | null
  selectedGlobalId?: string | null
  onSelectGlobalId?: (globalId: string | null) => void
  onSelectedRowChange?: (row: MappingElementRow | null) => void
  onIfcImported?: (project: Project) => void
  onEnableLocalMode?: () => void
  refreshKey?: number
  toast?: (text: string, kind?: ToastKind) => void
}

/** Vista Mapeo IFC (MVP): tabla por tabs + detalle + asignar/quitar. */
export function MappingView({
  projectId = null,
  selectedGlobalId = null,
  onSelectGlobalId,
  onSelectedRowChange,
  onIfcImported,
  onEnableLocalMode,
  refreshKey = 0,
  toast = (text: string) => console.info(text),
}: MappingViewProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)

  const [tab, setTab] = useState<MappingTab>('unassigned')
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(50)

  const [page, setPage] = useState<MappingElementsPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [localSelectedGlobalId, setLocalSelectedGlobalId] = useState<string | null>(null)
  const effectiveSelectedGlobalId = selectedGlobalId ?? localSelectedGlobalId

  const selectedRow = useMemo(() => {
    const gid = effectiveSelectedGlobalId
    if (!gid || !page?.items) return null
    return page.items.find(r => r.element.global_id === gid) ?? null
  }, [effectiveSelectedGlobalId, page?.items])

  useEffect(() => {
    onSelectedRowChange?.(selectedRow)
  }, [selectedRow, onSelectedRowChange])

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setProject(null)
      setProjectError(null)
      return
    }
    setProjectLoading(true)
    setProjectError(null)
    try {
      const p = await getProject(projectId)
      setProject(p)
    } catch (e) {
      setProject(null)
      setProjectError(e instanceof Error ? e.message : 'Error al cargar proyecto')
    } finally {
      setProjectLoading(false)
    }
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const res = await listMappingElements({ projectId, tab, offset, limit, q })
      setPage(res)
    } catch (e) {
      setPage(null)
      setError(e instanceof Error ? e.message : 'Error al cargar mapeo')
    } finally {
      setLoading(false)
    }
  }, [projectId, tab, offset, limit, q])

  useEffect(() => { void loadProject() }, [loadProject])

  useEffect(() => {
    if (!projectId) return
    if (!project?.ifc_file_path) return
    void load()
  }, [projectId, project?.ifc_file_path, refreshKey, load])

  useEffect(() => {
    setOffset(0)
  }, [tab, q, limit, projectId])

  const openFilePicker = () => fileRef.current?.click()

  const seedFromIfcInBrowser = useCallback(async (): Promise<number> => {
    if (!projectId) throw new Error('Sin projectId: no se puede seedear elementos IFC.')

    const fileRes = await fetch(`/api/projects/${projectId}/ifc/file`)
    if (!fileRes.ok) throw new Error(`No se pudo leer el IFC del proyecto (${fileRes.status})`)

    const text = await fileRes.text()
    const parsed = parseIfcElementsWithStepText(text)
    if (parsed.length === 0) throw new Error('No se detectaron elementos con GlobalId al parsear el IFC en el navegador.')

    const elements: IfcElementSeed[] = parsed.map(e => ({
      global_id: e.globalId,
      ifc_type: e.ifcType,
      ifc_name: e.ifcName,
      qualitative_snapshot: {
        ifc_type: e.ifcType,
        ifc_name: e.ifcName,
      },
    }))

    // Enviar en chunks para evitar payload gigante.
    // Para mantener sincronización correcta en reimports, el último chunk incluye `all_global_ids`
    // y hace `full_sync=true` (marca como deleted todo lo que no esté en el set del modelo).
    const allGlobalIds = elements.map(e => e.global_id)
    const chunkSize = 500
    for (let i = 0; i < elements.length; i += chunkSize) {
      const chunk = elements.slice(i, i + chunkSize)
      const isLast = i + chunkSize >= elements.length
      await seedIfcElements(projectId, {
        elements: chunk,
        full_sync: isLast,
        all_global_ids: isLast ? allGlobalIds : undefined,
      })
    }

    // Refrescar project para asegurar ifc_file_path y timestamps en UI
    await loadProject()
    return elements.length
  }, [projectId, loadProject])

  const handleFileSelected = async (file: File | null) => {
    if (!projectId || !file) return
    try {
      const res = await uploadIfc(projectId, file)
      setProject(res.project)
      onIfcImported?.(res.project)

      if (res.import_summary.total_elements === 0) {
        toast('IFC subido. Backend no detectó elementos; usando fallback (parser STEP) para listar y mapear.', 'warning')
        const seeded = await seedFromIfcInBrowser()
        toast(`IFC listo (${seeded.toLocaleString('es-PY')} elementos)`, 'success')
      } else {
        toast(`IFC importado (${res.import_summary.total_elements} elementos)`, 'success')
      }

      const auto = await autoAssignByIfcClassification(projectId)
      if (auto.created > 0) {
        toast(`Auto-asignación: ${auto.created.toLocaleString('es-PY')} elementos (tab "Auto-asignados")`, 'success')
      }

      setOffset(0)
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error al importar IFC', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSelect = (globalId: string) => {
    setLocalSelectedGlobalId(globalId)
    onSelectGlobalId?.(globalId)
  }

  if (!projectId) {
    return (
      <div className="section__body">
        <div className="empty-state">
          <div className="empty-state__title">Sin proyecto activo</div>
          <div className="empty-state__sub">Seleccioná un proyecto para mapear un modelo IFC.</div>
        </div>
      </div>
    )
  }

  if (projectLoading) {
    return <div style={{ padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando proyecto…</div>
  }

  if (projectError) {
    return <div style={{ padding: 20, color: 'var(--error)', fontSize: 13 }}>⚠ {projectError}</div>
  }

  const hasIfc = Boolean(project?.ifc_file_path)

  if (!hasIfc) {
    return (
      <div className="section__body">
        <div className="empty-state">
          <Icon name="mapping" size={48} style={{ color: 'var(--bg-surface-raised)' }} />
          <div className="empty-state__title">Importá un modelo IFC para comenzar</div>
          <div className="empty-state__sub">
            Subí un archivo <strong>.ifc</strong> para habilitar el listado de elementos y sus asignaciones.
          </div>
          <button className="btn btn--primary" onClick={openFilePicker}>
            <Icon name="import" size={14} /> Importar modelo IFC
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".ifc"
            style={{ display: 'none' }}
            onChange={e => { void handleFileSelected(e.target.files?.[0] ?? null) }}
          />
        </div>
      </div>
    )
  }

  const total = page?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + limit < total

  return (
    <div className="section__body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        flexShrink: 0,
        background: 'var(--bg-base)',
      }}>
        <MappingTabs value={tab} onChange={t => setTab(t)} />

        <div className="input-search" style={{ width: 320 }}>
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Buscar por GlobalId, nombre, tipo, NBR…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={() => { void load() }}>
            <Icon name="reset" size={14} /> Actualizar
          </button>
          {onEnableLocalMode && (
            <button className="btn" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={onEnableLocalMode}>
              <Icon name="import" size={14} /> Modo local
            </button>
          )}
          <button className="btn" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={openFilePicker}>
            <Icon name="import" size={14} /> Reimportar IFC
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".ifc"
            style={{ display: 'none' }}
            onChange={e => { void handleFileSelected(e.target.files?.[0] ?? null) }}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{total.toLocaleString('es-PY')}</span>
          <span>filas</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, color: 'var(--error)', fontSize: 13 }}>⚠ {error}</div>
      )}
      {loading && !error && (
        <div style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando…</div>
      )}

      {!loading && !error && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <MappingElementsTable
            rows={page?.items ?? []}
            selectedGlobalId={effectiveSelectedGlobalId}
            onSelect={handleSelect}
          />
        </div>
      )}

      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-default)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn"
          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
          disabled={!canPrev}
          onClick={() => setOffset(o => Math.max(0, o - limit))}
        >
          ← Prev
        </button>
        <button
          className="btn"
          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
          disabled={!canNext}
          onClick={() => setOffset(o => o + limit)}
        >
          Next →
        </button>

        <div style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          Mostrando <span style={{ fontFamily: 'var(--font-mono)' }}>{total === 0 ? 0 : Math.min(total, offset + 1)}</span>–
          <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.min(total, offset + limit)}</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>Page size</span>
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            style={{
              height: 28,
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 4,
              padding: '0 8px',
            }}
          >
            {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
