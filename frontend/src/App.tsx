import { useState, useMemo } from 'react'
import { Header } from './components/shared/Header'
import { Sidebar } from './components/shared/Sidebar'
import { SectionHeader } from './components/shared/SectionHeader'
import { DetailPanel } from './components/shared/DetailPanel'
import { CatalogView } from './components/catalog_panel/CatalogView'
import { BudgetView } from './components/budget_panel/BudgetView'
import { MappingView } from './components/mapping_panel/MappingView'
import { ReportsView } from './components/reports_panel/ReportsView'
import { Viewer3D } from './components/ifc_viewer/Viewer3D'
import { Icon } from './components/shared/Icon'
import type { CatalogItem, Faceta, Section } from './types/catalog'

const MOCK_PROJECTS = [
  { id: 'p1', name: 'Edificio Residencial Asunción', location: 'Asunción, Paraguay' },
  { id: 'p2', name: 'Centro Comercial CDE',          location: 'Ciudad del Este, Paraguay' },
]

const SECTION_TITLE: Record<Section, string> = {
  catalog:  'Catálogo de Ítems',
  budget:   'Presupuesto',
  mapping:  'Mapeo IFC',
  library:  'Biblioteca',
  reports:  'Informes',
  settings: 'Ajustes del proyecto',
}

export default function App() {
  const [project, setProject]           = useState(MOCK_PROJECTS[0]!)
  const [section, setSection]           = useState<Section>('budget')
  const [search, setSearch]             = useState('')
  const [activeFacetas, setActiveFacetas] = useState<Faceta[]>([])
  const [relevantOnly, setRelevantOnly] = useState(true)

  /* Catalog state */
  const [catFaceta, setCatFaceta]       = useState<Faceta | null>(null)
  const [catSelectedId, setCatSelectedId] = useState<string | null>(null)
  const [catSelectedItem, setCatSelectedItem] = useState<CatalogItem | null>(null)

  /* Budget state */
  const [budgetSelectedId, setBudgetSelectedId] = useState<string | null>(null)

  const toggleFaceta = (f: Faceta) =>
    setActiveFacetas(a => a.includes(f) ? a.filter(x => x !== f) : [...a, f])

  const layoutClass = useMemo(() => {
    if (section === 'mapping') return 'layout-with-viewer-panel'
    if (section === 'catalog') return 'layout-with-panel'
    return ''
  }, [section])

  const showFacetas = section === 'catalog' || section === 'budget'

  const handleCatSelect = (id: string, item: CatalogItem) => {
    setCatSelectedId(id)
    setCatSelectedItem(item)
  }

  return (
    <div className={`app ${layoutClass}`}>
      <div className="area-header">
        <Header project={project} projects={MOCK_PROJECTS} onChangeProject={setProject} />
      </div>

      <div className="area-sidebar">
        <Sidebar active={section} onChange={(s) => { setSection(s); setSearch('') }} />
      </div>

      <div className="area-main">
        <div className="section">
          <SectionHeader
            title={SECTION_TITLE[section]}
            subtitle={section === 'budget' ? project.name : undefined}
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
              selectedId={catSelectedId}
              onSelect={(id, item) => handleCatSelect(id, item)}
            />
          )}

          {section === 'budget' && (
            <BudgetView
              search={search}
              selectedId={budgetSelectedId}
              onSelect={setBudgetSelectedId}
            />
          )}

          {section === 'mapping' && <MappingView />}

          {section === 'reports' && <ReportsView onPreviewPdf={() => {}} />}

          {(section === 'library' || section === 'settings') && (
            <div className="section__body">
              <div className="empty-state">
                <Icon
                  name={section === 'library' ? 'library' : 'settings'}
                  size={48}
                  style={{ color: 'var(--bg-surface-raised)' }}
                />
                <div className="empty-state__title">{SECTION_TITLE[section]}</div>
                <div className="empty-state__sub">Esta sección está planificada para una próxima iteración.</div>
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
        <div className="area-panel">
          <DetailPanel item={section === 'catalog' ? catSelectedItem : null} />
        </div>
      )}
    </div>
  )
}
