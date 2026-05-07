import { Icon } from '../shared/Icon'

/** Vista Mapeo IFC — placeholder hasta implementar módulos ifc_importer y mapper. */
export function MappingView() {
  return (
    <div className="section__body">
      <div className="empty-state">
        <Icon name="mapping" size={48} style={{ color: 'var(--bg-surface-raised)' }} />
        <div className="empty-state__title">Importá un modelo IFC para comenzar</div>
        <div className="empty-state__sub">
          El módulo de mapeo estará disponible una vez implementados los módulos
          <strong> ifc_importer</strong> y <strong>mapper</strong> del backend.
        </div>
        <button className="btn btn--primary">
          <Icon name="import" size={14} /> Importar modelo IFC
        </button>
      </div>
    </div>
  )
}
