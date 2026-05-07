/* MappingPanel — IFC mapping list with status badges and selection */
const IFC_ELEMENTS = [
  { id: 'm1', code: 'IfcWall:142', label: 'Muro EXT — Eje A 1-4', material: 'Ladrillo cerámico 15cm', mapped: true,  budgetCode: '3E.04.07.001', selected: true },
  { id: 'm2', code: 'IfcWall:143', label: 'Muro EXT — Eje A 4-7', material: 'Ladrillo cerámico 15cm', mapped: true,  budgetCode: '3E.04.07.001' },
  { id: 'm3', code: 'IfcWall:158', label: 'Muro INT — Baño 01',   material: 'Ladrillo cerámico 11cm', mapped: false },
  { id: 'm4', code: 'IfcSlab:061', label: 'Losa N+2.80',           material: 'H°A° 12cm fck=21',       mapped: true,  budgetCode: '3E.04.07.005' },
  { id: 'm5', code: 'IfcSlab:062', label: 'Losa N+5.60',           material: 'H°A° 12cm fck=21',       mapped: false },
  { id: 'm6', code: 'IfcWindow:21',label: 'V01 — 1.20×1.40',       material: 'Aluminio + DVH',         mapped: false, conflict: true },
  { id: 'm7', code: 'IfcDoor:08',  label: 'P03 — Puerta interior', material: 'MDF + marco metálico',   mapped: true,  budgetCode: '3E.08.02.014' },
];

function MappingPanel({ selectedId, onSelect }) {
  return (
    <div className="map-list">
      <div className="map-list__hdr">
        <span>Elementos del modelo IFC</span>
        <span className="map-list__count">7 de 247</span>
      </div>
      <div className="map-list__rows">
        {IFC_ELEMENTS.map(el => {
          const sel = selectedId === el.id;
          const status = el.conflict ? 'conflict' : (el.mapped ? 'mapped' : 'unmapped');
          return (
            <div key={el.id} className={`map-row ${sel ? 'is-selected' : ''}`} onClick={() => onSelect(el.id)}>
              <span className={`map-status map-status--${status}`}>
                <Icon name={status === 'mapped' ? 'check' : status === 'conflict' ? 'warning' : 'add'} size={11} />
              </span>
              <div className="map-row__main">
                <div className="map-row__line1">
                  <span className="map-row__code">{el.code}</span>
                  <span>{el.label}</span>
                </div>
                <div className="map-row__line2">{el.material}</div>
              </div>
              <div className="map-row__right">
                {el.mapped ? (
                  <span className="map-row__budget">{el.budgetCode}</span>
                ) : (
                  <span className="map-row__action">Asignar →</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.MappingPanel = MappingPanel;
window.IFC_ELEMENTS = IFC_ELEMENTS;
