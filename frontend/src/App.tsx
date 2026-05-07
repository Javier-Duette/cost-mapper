import { useState, useMemo, useEffect, useCallback } from 'react'

import { Header } from './components/shared/Header'

import { Sidebar } from './components/shared/Sidebar'

import { SectionHeader } from './components/shared/SectionHeader'

import { DetailPanel } from './components/shared/DetailPanel'

import { CatalogView } from './components/catalog_panel/CatalogView'

import { BudgetView } from './components/budget_panel/BudgetView'

import { MappingView } from './components/mapping_panel/MappingView'

import { ReportsView } from './components/reports_panel/ReportsView'

import { EtlView } from './components/settings_panel/EtlView'
import { SettingsView } from './components/settings_panel/SettingsView'

import { Viewer3D } from './components/ifc_viewer/Viewer3D'

import { Icon } from './components/shared/Icon'

import { ToastContainer, useToast } from './components/shared/Toast'

import { listProjects } from './api/projects'

import { addToLibrary, DuplicateItemError } from './api/library'

import type { CatalogItem, Faceta, Section } from './types/catalog'

import type { Project } from './types/projects'



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

  const { messages: toasts, toast, dismiss } = useToast()



  useEffect(() => {

    listProjects()

      .then(({ items }) => {

        setProjects(items)

        if (items.length > 0) setProject(items[0]!)

      })

      .catch(console.error)

  }, [])



  const handleAddToProject = useCallback(async (item: CatalogItem) => {

    if (!project) return

    try {

      await addToLibrary(project.id, { item_id: item.id })

      toast(`"${item.description_es}" agregado al proyecto`, 'success')

    } catch (e) {

      if (e instanceof DuplicateItemError) {

        toast('El ítem ya está en el proyecto', 'warning')

      } else {

        toast('Error al agregar el ítem', 'error')

      }

    }

  }, [project, toast])



  /* Catalog state */

  const [catFaceta, setCatFaceta]       = useState<Faceta | null>(null)

  const [catSelectedId, setCatSelectedId] = useState<string | null>(null)

  const [catSelectedItem, setCatSelectedItem] = useState<CatalogItem | null>(null)



  /* Budget state */

  const [budgetSelectedId, setBudgetSelectedId] = useState<string | null>(null)

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

              onAddToProject={handleAddToProject}
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



          {section === 'mapping' && <MappingView />}



          {section === 'reports' && <ReportsView onPreviewPdf={() => {}} />}
          {section === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
              <EtlView />
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 32px' }} />
              <SettingsView />
            </div>
          )}



          {section === 'library' && (

            <div className="section__body">

              <div className="empty-state">

                <Icon name="library" size={48} style={{ color: 'var(--bg-surface-raised)' }} />

                <div className="empty-state__title">{SECTION_TITLE[section]}</div>

                <div className="empty-state__sub">Esta secciÃ³n estÃ¡ planificada para una prÃ³xima iteraciÃ³n.</div>

              </div>

            </div>

          )}

        </div>

      </div>



      {section === 'mapping' && (

        <div className="area-viewer">

          <Viewer3D />

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

          <DetailPanel 
              item={section === 'catalog' ? catSelectedItem : null} 
              onUpdate={handleItemUpdate}
            />

        </div>

      )}



      <ToastContainer messages={toasts} onDismiss={dismiss} />

    </div>

  )

}

