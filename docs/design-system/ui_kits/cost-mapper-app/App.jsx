/* App — per-section dedicated layouts.
   Budget = table-only (no viewer, no panel).
   Catálogo = table + APU panel (no viewer).
   Mapeo IFC = viewer + IFC list + APU panel.
   Library / Reports / Settings = main only. */
function App() {
  const [project, setProject] = React.useState(MOCK_PROJECTS[0]);
  const [section, setSection] = React.useState('budget');
  const [selectedId, setSelectedId] = React.useState('r2');
  const [search, setSearch] = React.useState('');
  const [activeFacetas, setActiveFacetas] = React.useState([]);
  const [relevantOnly, setRelevantOnly] = React.useState(true);
  const [catSelected, setCatSelected] = React.useState('c2');
  const [catFaceta, setCatFaceta] = React.useState(null);
  const [mapSelected, setMapSelected] = React.useState('m1');
  const [pdfPreview, setPdfPreview] = React.useState(false);
  const [modal, setModal] = React.useState(null);

  const selectedBudgetItem = React.useMemo(
    () => BUDGET_ROWS.find(r => r.id === selectedId),
    [selectedId]
  );
  const selectedCatItem = React.useMemo(
    () => CATALOG_ROWS.find(r => r.id === catSelected),
    [catSelected]
  );

  const toggleFaceta = (f) =>
    setActiveFacetas(a => a.includes(f) ? a.filter(x => x !== f) : [...a, f]);

  const handleConfirmPriceChange = (r) =>
    setModal({
      title: 'Modificación global de precio',
      body: `Estás modificando el precio de <strong>${r.desc} (${r.code})</strong>. Este cambio se aplicará a <strong>todos los ítems</strong> que usen este insumo, alterando múltiples APUs del proyecto.`,
      confirmLabel: 'Confirmar modificación',
    });

  const sectionTitle = {
    catalog:  'Catálogo de Ítems',
    budget:   'Presupuesto',
    mapping:  'Mapeo IFC',
    library:  'Biblioteca',
    reports:  'Informes',
    settings: 'Ajustes del proyecto',
  }[section];

  const layoutClass =
    section === 'mapping'  ? 'layout-with-viewer-panel' :
    section === 'catalog'  ? 'layout-with-panel' : '';

  return (
    <div className={`app ${layoutClass}`}>
      <div className="area-header">
        <Header project={project} projects={MOCK_PROJECTS} onChangeProject={setProject} />
      </div>
      <div className="area-sidebar">
        <Sidebar active={section} onChange={setSection} />
      </div>

      <div className="area-main">
        <div className="section">
          <SectionHeader
            title={sectionTitle}
            projectName={section === 'budget' ? project.name : null}
            search={search}
            onSearch={setSearch}
            facetas={FACETAS}
            activeFacetas={activeFacetas}
            onToggleFaceta={toggleFaceta}
            relevantOnly={relevantOnly}
            onToggleRelevant={() => setRelevantOnly(v => !v)}
            missingPrices={section === 'budget' ? 12 : 0}
          />

          {section === 'budget' && (
            <>
              <div className="banner">
                <Icon name="warning" size={16} />
                <span className="banner__msg">
                  Tu presupuesto contiene <strong>12 ítems sin precio</strong>. Algunos cálculos están incompletos.
                </span>
                <button>Completar precios</button>
              </div>
              <div className="kpi-strip">
                <div className="kpi"><div className="kpi__lbl">Costo directo</div><div className="kpi__val">₲ {fmt(BUDGET_TOTAL)}</div></div>
                <div className="kpi"><div className="kpi__lbl">Ítems totales</div><div className="kpi__val">38</div></div>
                <div className="kpi"><div className="kpi__lbl">Sin precio</div><div className="kpi__val kpi__val--warn">12</div></div>
                <div className="kpi"><div className="kpi__lbl">Última modif.</div><div className="kpi__val">hoy 14:32</div></div>
              </div>
              <div className="section__body">
                <BudgetTable
                  rows={BUDGET_ROWS}
                  total={BUDGET_TOTAL}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </>
          )}

          {section === 'catalog' && (
            <div className="section__body" style={{ overflow: 'hidden' }}>
              <CatalogView
                selectedId={catSelected}
                onSelect={setCatSelected}
                activeFaceta={catFaceta}
                onSelectFaceta={setCatFaceta}
              />
            </div>
          )}

          {section === 'mapping' && (
            <div className="section__body" style={{ overflow: 'hidden' }}>
              <MappingPanel selectedId={mapSelected} onSelect={setMapSelected} />
            </div>
          )}

          {section === 'reports' && (
            <div className="section__body">
              <ReportsView onPreviewPdf={() => setPdfPreview(true)} />
            </div>
          )}

          {(section === 'library' || section === 'settings') && (
            <div className="section__body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quaternary)', fontSize: 13, padding: 40 }}>
              <div style={{ textAlign: 'center', maxWidth: 360 }}>
                <Icon name={section === 'library' ? 'library' : 'settings'} size={56} style={{ color: 'var(--bg-surface-raised)', marginBottom: 14 }} />
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  Sección {sectionTitle}
                </div>
                <div>Esta vista vive en el design system pero no está mockeada en este UI kit.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {section === 'mapping' && (
        <div className="area-viewer">
          <Viewer3D hasModel={true} />
        </div>
      )}

      {(section === 'mapping' || section === 'catalog') && (
        <div className="area-panel">
          <DetailPanel
            item={section === 'catalog' ? selectedCatItem : selectedBudgetItem}
            onPin={() => {}}
            onConfirmPriceChange={handleConfirmPriceChange}
          />
        </div>
      )}

      {modal && (
        <ConfirmModal
          {...modal}
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}

      {pdfPreview && (
        <PdfPreviewModal onClose={() => setPdfPreview(false)} />
      )}
    </div>
  );
}

window.App = App;
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
