/* BudgetTable — agrupada por Faceta con subtotales y total */
function Chip({ faceta }) { return <span className={`chip chip--${faceta}`}>{faceta}</span>; }

function BudgetTable({ rows, total, selectedId, onSelect }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: 48 }}>FAC</th>
          <th style={{ width: 130 }}>CÓDIGO NBR</th>
          <th>DESCRIPCIÓN</th>
          <th style={{ width: 60 }}>UND</th>
          <th className="num" style={{ width: 90 }}>CANT.</th>
          <th className="num" style={{ width: 130 }}>P. UNIT (₲)</th>
          <th className="num" style={{ width: 150 }}>SUBTOTAL (₲)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          if (r.type === 'group') {
            return (
              <tr key={'g' + i} className="group-hdr">
                <td colSpan={6}>
                  <span className="chev">▾</span> <Chip faceta={r.faceta} /> &nbsp;{r.label} · {r.count} ítems
                </td>
                <td className="num" style={{ color: '#9D9D9D', fontWeight: 500 }}>
                  {r.subtotal != null ? fmt(r.subtotal) : '—'}
                </td>
              </tr>
            );
          }
          const sel = r.id === selectedId;
          return (
            <tr key={r.id} className={sel ? 'is-selected' : ''} onClick={() => onSelect(r.id)}>
              <td><Chip faceta={r.faceta} /></td>
              <td className="num" style={{ color: sel ? '#fff' : '#CCCCCC' }}>{r.code}</td>
              <td className="desc">{r.desc}<small>{r.meta}</small></td>
              <td>{r.unit}</td>
              <td className="num">{fmt(r.qty)}</td>
              <td className="num">
                {r.price == null
                  ? <span style={{ color: '#FF9800' }}>sin precio</span>
                  : fmt(r.price)}
              </td>
              <td className="num">{r.total == null ? '—' : fmt(r.total)}</td>
            </tr>
          );
        })}
        <tr className="ftr">
          <td colSpan={6} style={{ textAlign: 'right' }}>TOTAL COSTO DIRECTO</td>
          <td className="num">₲ {fmt(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

window.BudgetTable = BudgetTable;
