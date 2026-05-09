import { useState, useMemo, useEffect, useCallback } from 'react'

import { Header } from './components/shared/Header'

import { Sidebar } from './components/shared/Sidebar'

import { SectionHeader } from './components/shared/SectionHeader'

import { DetailPanel } from './components/shared/DetailPanel'

import { CatalogView } from './components/catalog_panel/CatalogView'

import { BudgetView } from './components/budget_panel/BudgetView'

import { MappingView } from './components/mapping_panel/MappingView'
import { MappingElementDetail } from './components/mapping_panel/MappingElementDetail'

import { ReportsView } from './components/reports_panel/ReportsView'
import { LibraryView } from './components/library_panel/LibraryView'

import { EtlView } from './components/settings_panel/EtlView'
import { SettingsView } from './components/settings_panel/SettingsView'

import { Viewer3D } from './components/ifc_viewer/Viewer3D'

import { ToastContainer, useToast } from './components/shared/Toast'

import { listProjects } from './api/projects'

import { addToLibrary, listLibrary, removeFromLibrary, DuplicateItemError } from './api/library'

import type { CatalogItem, Faceta, Section } from './types/catalog'
import type { LibraryEntryReadWithItem } from './types/library'

import type { Project } from './types/projects'
import type { MappingElementRow } from './types/mapping'



const SECTION_TITLE: Record<Section, string> = {

  catalog:  'Catálogo de Ítems',

  budget:   'Presupuesto',

  mapping:  'Mapeo IFC',

  library:  'Biblioteca',

  reports:  'Informes',

  settings: 'Configuración',

}



export default function App() {

  const [projects, setProjects]         = useState<Project[]>([])

  const [project, setProject]           = useState<Project | null>(null)

  const [section, setSection]           = useState<Section>('budget')

  const [search, setSearch]             = useState('')

  const [activeFacetas, setActiveFacetas] = useState<Faceta[]>([])

  const [relevantOnly, setRelevantOnly] = useState(true)

  const [libraryEntries, setLibraryEntries] = useState<LibraryEntryReadWithItem[]>([])
  const [libraryItemIds, setLibraryItemIds] = useState<Set<string>>(new Set())
  const hasUnverified = useMemo(() => libraryEntries.some(e => !e.is_verified), [libraryEntries])
  const { messages: toasts, toast, dismiss } = useToast()



  const loadLibrary = useCallback(async (projectId: string) => {
    try {
      const entries = await listLibrary(projectId)
      setLibraryEntries(entries)
      setLibraryItemIds(new Set(entries.map(e => e.item_id)))
    } catch (e) {
      console.error('Error loading library ids', e)
    }
  }, [])

  useEffect(() => {
    listProjects()
      .then(({ items }) => {
        setProjects(items)
        if (items.length > 0) {
          const first = items[0]!
          setProject(first)
          void loadLibrary(first.id)
        }
      })
      .catch(console.error)
  }, [loadLibrary])

  useEffect(() => {
    if (project) void loadLibrary(project.id)
  }, [project, loadLibrary])



  const handleAddToProject = useCallback(async (item: CatalogItem) => {
    if (!project) return
    try {
      await addToLibrary(project.id, { item_id: item.id })
      void loadLibrary(project.id)
      toast(`"${item.description_es}" agregado al proyecto`, 'success')
    } catch (e) {
      if (e instanceof DuplicateItemError) {
        toast('El ítem ya está en el proyecto', 'warning')
      } else {
        toast('Error al agregar el ítem', 'error')
      }
    }
  }, [project, toast])

  const handleRemoveFromProject = useCallback(async (item: CatalogItem) => {
    if (!project) return
    try {
      // Necesitamos el entry_id, pero en CatalogView solo tenemos el item_id.
      // Opción A: Buscar en el estado local de library si tuviéramos las entries completas.
      // Opción B: El backend debería soportar borrar por project_id + item_id.
      // Por ahora, como no queremos cambiar el backend, listamos la biblioteca para encontrar el ID.
      const entries = await listLibrary(project.id)
      const entry = entries.find(e => e.item_id === item.id)
      if (entry) {
        await removeFromLibrary(project.id, entry.id)
        void loadLibrary(project.id)
        toast(`"${item.description_es}" removido del proyecto`, 'success')
      }
    } catch (e) {
      toast('Error al remover el ítem', 'error')
    }
  }, [project, toast])



  /* Catalog state */

  const [catFaceta, setCatFaceta]       = useState<Faceta | null>(null)

  const [catSelectedId, setCatSelectedId] = useState<string | null>(null)

  const [catSelectedItem, setCatSelectedItem] = useState<CatalogItem | null>(null)



  /* Budget state */

  const [budgetSelectedId, setBudgetSelectedId] = useState<string | null>(null)

  /* Mapping state (shared table <-> viewer) */
  const [mappingSelectedGlobalId, setMappingSelectedGlobalId] = useState<string | null>(null)
  const [mappingSelectedRow, setMappingSelectedRow] = useState<MappingElementRow | null>(null)
  const [mappingRefreshKey, setMappingRefreshKey] = useState(0)

  /* Resizing panel */

  const [panelHeight, setPanelHeight] = useState(280)
  const [refreshCounter, setRefreshCounter] = useState(0)

  const handleDragStart = (e: React.MouseEvent) => {

    e.preventDefault()

    const startY = e.clientY

    const startHeight = panelHeight

    const onMouseMove = (moveEvent: MouseEvent) => {

      const delta = startY - moveEvent.clientY

      setPanelHeight(Math.max(100, Math.min(800, startHeight + delta)))

    }

    const onMouseUp = () => {

      document.removeEventListener('mousemove', onMouseMove)

      document.removeEventListener('mouseup', onMouseUp)

    }

    document.addEventListener('mousemove', onMouseMove)

    document.addEventListener('mouseup', onMouseUp)

  }



  const toggleFaceta = (f: Faceta) =>

    setActiveFacetas(a => a.includes(f) ? a.filter(x => x !== f) : [...a, f])



  const layoutClass = useMemo(() => {

    if (section === 'mapping') return 'layout-with-viewer-panel'

    if (section === 'catalog') return 'layout-with-panel'

    return ''

  }, [section])



  const showFacetas = section === 'catalog' || section === 'budget'



  const handleItemUpdate = (updated: CatalogItem) => {
    setCatSelectedItem(updated)
    setRefreshCounter(prev => prev + 1)
  }

  const handleCatSelect = (id: string, item: CatalogItem) => {

    setCatSelectedId(id)

    setCatSelectedItem(item)

  }



  return (

    <div className={`app ${layoutClass}`} style={{ '--detail-expanded': `${panelHeight}px` } as React.CSSProperties}>

      <div className="area-header">

        {project && (

          <Header project={project} projects={projects} onChangeProject={setProject} />

        )}

      </div>



      <div className="area-sidebar">

        <Sidebar active={section} onChange={(s) => { setSection(s); setSearch('') }} />

      </div>



      <div className="area-main">

        <div className="section">

          <SectionHeader

            title={SECTION_TITLE[section]}

            subtitle={section === 'budget' ? (project?.name ?? '') : undefined}

            search={search}

            onSearch={setSearch}

            activeFacetas={activeFacetas}

            onToggleFaceta={toggleFaceta}

            relevantOnly={relevantOnly}

            onToggleRelevant={() => setRelevantOnly(v => !v)}

            showFacetas={showFacetas}

          />



          {section === 'catalog' && (

            <CatalogView
              search={search}
              activeFaceta={catFaceta}
              onSelectFaceta={setCatFaceta}
              relevantOnly={relevantOnly}
              selectedId={catSelectedId}
              onSelect={(id, item) => handleCatSelect(id, item)}
              projectId={project?.id ?? null}
              libraryItemIds={libraryItemIds}
              onAddToProject={handleAddToProject}
              onRemoveFromProject={handleRemoveFromProject}
              refreshKey={refreshCounter}
            />

          )}



          {section === 'budget' && (

            <BudgetView

              projectId={project?.id ?? null}

              search={search}

              selectedId={budgetSelectedId}

              onSelect={setBudgetSelectedId}

              toast={toast}

            />

          )}



          {section === 'mapping' && (
            <MappingView
              projectId={project?.id ?? null}
              selectedGlobalId={mappingSelectedGlobalId}
              onSelectGlobalId={setMappingSelectedGlobalId}
              onSelectedRowChange={setMappingSelectedRow}
              onIfcImported={(p) => setProject(p)}
              refreshKey={mappingRefreshKey}
              toast={toast}
            />
          )}



          {section === 'reports' && <ReportsView onPreviewPdf={() => {}} hasUnverified={hasUnverified} />}
          {section === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
              <EtlView />
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 32px' }} />
              <SettingsView />
            </div>
          )}



          {section === 'library' && (
            <LibraryView projectId={project?.id ?? null} toast={toast} />
          )}

        </div>

      </div>



      {section === 'mapping' && (

        <div className="area-viewer">

          <Viewer3D
            projectId={project?.id ?? null}
            selectedGlobalId={mappingSelectedGlobalId}
            onSelectGlobalId={setMappingSelectedGlobalId}
          />

        </div>

      )}



      {(section === 'mapping' || section === 'catalog') && (

        <div className="area-panel" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

          <div 

            onMouseDown={handleDragStart}

            style={{ 

              position: 'absolute', top: -3, left: 0, right: 0, height: 6, 

              cursor: 'row-resize', zIndex: 10, background: 'transparent'

            }}

            title="Arrastrar para redimensionar"

          />

          {section === 'catalog' ? (
            <DetailPanel item={catSelectedItem} onUpdate={handleItemUpdate} />
          ) : (
            <MappingElementDetail
              projectId={project?.id ?? ''}
              row={mappingSelectedRow}
              toast={toast}
              onRefresh={() => setMappingRefreshKey(k => k + 1)}
            />
          )}

        </div>

      )}



      <ToastContainer messages={toasts} onDismiss={dismiss} />

    </div>

  )

}

