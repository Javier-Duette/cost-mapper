import { Icon } from '../shared/Icon'

interface ReportsViewProps {
  onPreviewPdf: () => void
  hasUnverified?: boolean
}

/** Vista de Informes: lista de formatos de exportacion disponibles. */
export function ReportsView({ onPreviewPdf, hasUnverified }: ReportsViewProps) {
  return (
    <div className="section__body">
      {hasUnverified && (
        <div className="banner" style={{ margin: '16px 24px', background: 'var(--error-subtle)', borderColor: 'var(--error)', color: 'var(--error)' }}>
          <Icon name="warning" size={16} />
          <span className="banner__msg">
            <strong>Exportacion bloqueada</strong>: se detectaron items en el presupuesto que no han sido verificados por un humano.
            Revisa la <strong>Biblioteca</strong> para completar las verificaciones.
          </span>
        </div>
      )}
      <div className="reports">
        <div className={`report-card ${!hasUnverified ? 'is-primary' : ''}`} style={hasUnverified ? { opacity: 0.7 } : {}}>
          <div className="report-card__icon"><Icon name="reports" size={20} /></div>
          <div className="report-card__body">
            <div className="report-card__title">Presupuesto detallado (PDF)</div>
            <div className="report-card__sub">APUs completos · agrupado por faceta NBR · totales por seccion</div>
          </div>
          <button className="btn btn--primary" onClick={onPreviewPdf} disabled={hasUnverified}>
            <Icon name="export" size={14} /> {hasUnverified ? 'Bloqueado' : 'Exportar PDF'}
          </button>
        </div>

        <div className="report-card">
          <div className="report-card__icon"><Icon name="budget" size={20} /></div>
          <div className="report-card__body">
            <div className="report-card__title">Planilla de presupuesto (Excel)</div>
            <div className="report-card__sub">Tabla editable con formulas · compatible con LibreOffice Calc</div>
          </div>
          <button className="btn" disabled>
            <Icon name="export" size={14} /> Exportar Excel
            <span style={{ fontSize: 10, color: 'var(--text-disabled)', marginLeft: 4 }}>proximamente</span>
          </button>
        </div>

        <div className="report-card">
          <div className="report-card__icon"><Icon name="mapping" size={20} /></div>
          <div className="report-card__body">
            <div className="report-card__title">Informe de Mapeo IFC</div>
            <div className="report-card__sub">Elementos mapeados · sin mapear · conflictos de clasificacion</div>
          </div>
          <button className="btn" disabled>
            <Icon name="export" size={14} /> Exportar
            <span style={{ fontSize: 10, color: 'var(--text-disabled)', marginLeft: 4 }}>proximamente</span>
          </button>
        </div>
      </div>
    </div>
  )
}
