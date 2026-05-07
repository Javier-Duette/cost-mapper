/* DetailPanel — bottom sheet APU sub-table.
   Columns per spec: FAC · CÓDIGO · INSUMO · UND · COEF. · FUENTE COEF. · P. UNIT ($) · FUENTE PRECIO */
function DetailPanel({ item, onPin, onConfirmPriceChange }) {
  if (!item) {
    return (
      <div className="dpanel">
        <div className="dpanel__strip" style={{ color: 'var(--text-tertiary)' }}>
          Seleccioná un ítem en la tabla para ver su análisis de precio unitario (APU).
        </div>
      </div>
    );
  }

  return (
    <div className="dpanel">
      <div className="dpanel__strip">
        <div className="dpanel__strip-center">
          <span className={`chip chip--${item.faceta}`}>{item.faceta}</span>
          <span className="codetag">{item.code}</span>
          <span>{item.desc}</span>
          <span style={{ color: 'var(--text-quaternary)' }}>·</span>
          <span className="dpanel__strip-meta">28 insumos · ₲ {fmt(item.price)}/{item.unit}</span>
        </div>
        <div className="dpanel__strip-tools" onClick={e => e.stopPropagation()}>
          <span title="Fijar panel" onClick={onPin}><Icon name="pin" size={14} /></span>
        </div>
      </div>

      <div className="dpanel__body">
        <table className="apu-tbl">
          <thead>
            <tr>
              <th style={{ width: 42 }}>FAC</th>
              <th style={{ width: 120 }}>CÓDIGO</th>
              <th>INSUMO</th>
              <th style={{ width: 50 }}>UND</th>
              <th className="num" style={{ width: 80 }}>COEF.</th>
              <th style={{ width: 110 }}>FUENTE COEF.</th>
              <th className="num" style={{ width: 110 }}>P. UNIT (₲)</th>
              <th style={{ width: 110 }}>FUENTE PRECIO</th>
            </tr>
          </thead>
          <tbody>
            {APU_ROWS.map((r, i) => {
              if (r.type === 'group') {
                return <tr key={'g' + i} className="group-hdr"><td colSpan={8}>{r.label}</td></tr>;
              }
              return (
                <tr key={r.id} style={r.editing ? { background: 'rgba(0,120,212,0.08)' } : null}>
                  <td><span className={`chip chip--${r.faceta}`}>{r.faceta}</span></td>
                  <td className="num">{r.code}</td>
                  <td>{r.desc}</td>
                  <td>{r.unit}</td>
                  <td className="num">{r.coef.toLocaleString('es-PY')}</td>
                  <td><span className={`src src--${r.coefSource === 'Custom' ? 'custom' : 'tcpo'}`}>{r.coefSource}</span></td>
                  <td className="num">
                    {r.editing ? (
                      <span className="editing">
                        <input defaultValue={fmt(r.price)} onKeyDown={e => { if (e.key === 'Enter') onConfirmPriceChange(r); }} autoFocus />
                      </span>
                    ) : (
                      <span className="editable">{fmt(r.price)}</span>
                    )}
                  </td>
                  <td><span className={`src src--${r.priceSource === 'Custom' ? 'custom' : 'tcpo'}`}>{r.priceSource}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.DetailPanel = DetailPanel;
