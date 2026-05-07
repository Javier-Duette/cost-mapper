/* ReportsView — list of report cards with one highlighted "Presupuesto PDF" export */
function ReportsView({ onPreviewPdf }) {
  const reports = [
    { id: 'r1', icon: 'budget', title: 'Presupuesto detallado', sub: 'Documento PDF (A4) con tabla agrupada por faceta NBR · 24 págs.', primary: true, action: 'Vista previa' },
    { id: 'r2', icon: 'reports', title: 'Resumen ejecutivo',    sub: 'PDF de 2 páginas — totales por faceta y curva ABC.', action: 'Generar PDF' },
    { id: 'r3', icon: 'export',  title: 'Planilla de insumos',  sub: 'Excel (.xlsx) con todos los insumos consolidados.', action: 'Generar XLSX' },
    { id: 'r4', icon: 'mapping', title: 'Reporte de mapeo IFC', sub: 'Listado de elementos con/sin asignar.', action: 'Generar PDF' },
    { id: 'r5', icon: 'library', title: 'Backup del proyecto',  sub: 'Archivo .cmproj con todos los datos.', action: 'Descargar' },
  ];
  return (
    <div className="reports">
      {reports.map(r => (
        <div key={r.id} className={`report-card ${r.primary ? 'is-primary' : ''}`}>
          <div className="report-card__icon"><Icon name={r.icon} size={20} /></div>
          <div className="report-card__body">
            <div className="report-card__title">{r.title}</div>
            <div className="report-card__sub">{r.sub}</div>
          </div>
          <button
            className={`kit-btn ${r.primary ? 'kit-btn--primary' : 'kit-btn--ghost'}`}
            onClick={r.primary ? onPreviewPdf : undefined}
          >
            {r.action}
          </button>
        </div>
      ))}
    </div>
  );
}

window.ReportsView = ReportsView;
