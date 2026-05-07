/* Sidebar — 6 icon nav with active pill + tooltip on hover */
const SIDEBAR_NAV = [
  { id: 'catalog',   icon: 'catalog',  label: 'Catálogo' },
  { id: 'budget',    icon: 'budget',   label: 'Presupuesto' },
  { id: 'mapping',   icon: 'mapping',  label: 'Mapeo IFC' },
  { id: 'library',   icon: 'library',  label: 'Biblioteca' },
  { id: 'reports',   icon: 'reports',  label: 'Informes' },
];

function Sidebar({ active, onChange }) {
  return (
    <nav className="sidebar">
      {SIDEBAR_NAV.map(n => (
        <div
          key={n.id}
          className={`sb-btn ${active === n.id ? 'is-active' : ''}`}
          onClick={() => onChange(n.id)}
        >
          <Icon name={n.icon} size={22} />
          <span className="sb-tip">{n.label}</span>
        </div>
      ))}
      <div className="sb-spacer" />
      <div
        className={`sb-btn ${active === 'settings' ? 'is-active' : ''}`}
        onClick={() => onChange('settings')}
      >
        <Icon name="settings" size={22} />
        <span className="sb-tip">Ajustes</span>
      </div>
    </nav>
  );
}

window.Sidebar = Sidebar;
