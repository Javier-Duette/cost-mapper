import { Icon } from '../shared/Icon'

interface ReportsViewProps {
  onPreviewPdf: () => void
}

/** Vista de Informes — lista de formatos de exportación disponibles. */
export function ReportsView({ onPreviewPdf }: ReportsViewProps) {
  return (
    <div className="section__body">
      <div className="reports">
        <div className="report-card is-primary">
          <div className="report-card__icon"><Icon name="reports" size={20} /></div>
          <div className="report-card__body">
            <div className="report-card__title">Presupuesto detallado (PDF)</div>
            <div className="report-card__sub">APUs completos · agrupado por faceta NBR · totales por sección</div>
          </div>
          <button className="btn btn--primary" onClick={onPreviewPdf}>
            <Icon name="export" size={14} /> Exportar PDF
          </button>
        </div>

        <div className="report-card">
          <div className="report-card__icon"><Icon name="budget" size={20} /></div>
          <div className="report-card__body">
            <div className="report-card__title">Planilla de presupuesto (Excel)</div>
            <div className="report-card__sub">Tabla editable con fórmulas · compatible con LibreOffice Calc</div>
          </div>
          <button className="btn" disabled>
            <Icon name="export" size={14} /> Exportar Excel
            <span style={{ fontSize: 10, color: 'var(--text-disabled)', marginLeft: 4 }}>próximamente</span>
          </button>
        </div>

        <div className="report-card">
          <div className="report-card__icon"><Icon name="mapping" size={20} /></div>
          <div className="report-card__body">
            <div className="report-card__title">Informe de Mapeo IFC</div>
            <div className="report-card__sub">Elementos mapeados · sin mapear · conflictos de clasificación</div>
          </div>
          <button className="btn" disabled>
            <Icon name="export" size={14} /> Exportar
            <span style={{ fontSize: 10, color: 'var(--text-disabled)', marginLeft: 4 }}>próximamente</span>
          </button>
        </div>
      </div>
    </div>
  )
}
