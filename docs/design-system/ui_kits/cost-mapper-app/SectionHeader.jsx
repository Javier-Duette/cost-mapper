/* Top section bar — title + search + faceta filters + toggle */
function SectionHeader({ title, projectName, search, onSearch, facetas, activeFacetas, onToggleFaceta, relevantOnly, onToggleRelevant, missingPrices }) {
  return (
    <div className="section__hdr">
      <div className="section__title">
        {title}
        {projectName && <small>: {projectName}</small>}
      </div>
      <div className="section__controls">
        <div className="input-search">
          <Icon name="search" size={14} />
          <input value={search} placeholder="Buscar por código o descripción…" onChange={e => onSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {facetas.map(f => (
            <span
              key={f}
              className={`chip-toggle ${activeFacetas.includes(f) ? 'is-on--' + f : ''}`}
              onClick={() => onToggleFaceta(f)}
            >
              {f}
            </span>
          ))}
        </div>
        <span className={`switch ${relevantOnly ? 'is-on' : ''}`} onClick={onToggleRelevant}>
          <span className="switch__track" />
          Solo relevantes PY
        </span>
        {missingPrices > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FFC85C', fontSize: 12, padding: '0 8px', background: 'var(--warning-subtle)', height: 26, borderRadius: 4, cursor: 'pointer' }}>
            <Icon name="warning" size={13} /> {missingPrices} sin precio
          </span>
        )}
      </div>
    </div>
  );
}

window.SectionHeader = SectionHeader;
