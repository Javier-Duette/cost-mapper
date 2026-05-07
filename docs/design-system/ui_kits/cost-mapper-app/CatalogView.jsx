/* CatalogList — flat browseable catalog of NBR items with faceta tree on the left */
const CATALOG_ROWS = [
  { id: 'c1', faceta: '3E', code: '3E.04.07.001', desc: 'Muro de mampostería 15cm — ladrillo cerámico hueco', unit: 'm²', price: 485000, source: 'TCPO v15' },
  { id: 'c2', faceta: '3E', code: '3E.04.07.005', desc: 'Losa H°A° 12cm — fck=21 MPa',                        unit: 'm²', price: 920000, source: 'TCPO v15' },
  { id: 'c3', faceta: '3E', code: '3E.05.02.012', desc: 'Revoque interior fino — mortero 1:4',                unit: 'm²', price: 125000, source: 'TCPO v15' },
  { id: 'c4', faceta: '3E', code: '3E.06.01.020', desc: 'Pintura latex interior — dos manos',                 unit: 'm²', price: 49000,  source: 'Custom' },
  { id: 'c5', faceta: '2C', code: '2C.06.01.118', desc: 'Ladrillo cerámico hueco 15×20×30',                   unit: 'un', price: 2450,   source: 'TCPO v15' },
  { id: 'c6', faceta: '2C', code: '2C.03.01.045', desc: 'Cemento Portland CP-II — bolsa 50kg',                unit: 'bls', price: 62000, source: 'TCPO v15' },
  { id: 'c7', faceta: '2N', code: '2N.01.02.005', desc: 'Albañil oficial',                                    unit: 'hr', price: 68000,  source: 'Custom' },
  { id: 'c8', faceta: '2N', code: '2N.01.02.012', desc: 'Ayudante de albañil',                                unit: 'hr', price: 42000,  source: 'TCPO v15' },
];

const CATALOG_TREE = [
  { id: '3E', label: '3E · Resultados de construcción', count: 412 },
  { id: '4U', label: '4U · Servicios de obra',          count: 86 },
  { id: '2C', label: '2C · Componentes / Materiales',   count: 1184 },
  { id: '2N', label: '2N · Mano de obra',               count: 92 },
  { id: '2Q', label: '2Q · Equipos',                    count: 138 },
];

function CatalogView({ selectedId, onSelect, activeFaceta, onSelectFaceta }) {
  return (
    <div className="cat">
      <aside className="cat__tree">
        <div className="cat__tree-hdr">FACETAS NBR 15965</div>
        {CATALOG_TREE.map(n => (
          <div key={n.id}
            className={`cat__tree-item ${activeFaceta === n.id ? 'is-active' : ''}`}
            onClick={() => onSelectFaceta(n.id === activeFaceta ? null : n.id)}
          >
            <span className={`chip chip--${n.id}`}>{n.id}</span>
            <span className="cat__tree-label">{n.label.replace(`${n.id} · `, '')}</span>
            <span className="cat__tree-count">{n.count}</span>
          </div>
        ))}
      </aside>
      <div className="cat__list">
        <table className="tbl tbl--catalog">
          <thead>
            <tr>
              <th style={{ width: 48 }}>FAC</th>
              <th style={{ width: 130 }}>CÓDIGO NBR</th>
              <th>DESCRIPCIÓN</th>
              <th style={{ width: 60 }}>UND</th>
              <th className="num" style={{ width: 130 }}>P. UNIT (₲)</th>
              <th style={{ width: 110 }}>FUENTE</th>
            </tr>
          </thead>
          <tbody>
            {CATALOG_ROWS
              .filter(r => !activeFaceta || r.faceta === activeFaceta)
              .map(r => {
                const sel = selectedId === r.id;
                return (
                  <tr key={r.id} className={sel ? 'is-selected' : ''} onClick={() => onSelect(r.id)}>
                    <td><span className={`chip chip--${r.faceta}`}>{r.faceta}</span></td>
                    <td className="num" style={{ color: sel ? '#fff' : 'var(--text-secondary)' }}>{r.code}</td>
                    <td className="desc">{r.desc}</td>
                    <td>{r.unit}</td>
                    <td className="num">{fmt(r.price)}</td>
                    <td><span className={`src src--${r.source === 'Custom' ? 'custom' : 'tcpo'}`}>{r.source}</span></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.CatalogView = CatalogView;
window.CATALOG_ROWS = CATALOG_ROWS;
