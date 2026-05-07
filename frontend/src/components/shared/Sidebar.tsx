import { Icon } from './Icon'
import type { Section } from '../../types/catalog'

const NAV: { id: Section; icon: string; label: string }[] = [
  { id: 'catalog',  icon: 'catalog',  label: 'Catálogo' },
  { id: 'budget',   icon: 'budget',   label: 'Presupuesto' },
  { id: 'mapping',  icon: 'mapping',  label: 'Mapeo IFC' },
  { id: 'library',  icon: 'library',  label: 'Biblioteca' },
  { id: 'reports',  icon: 'reports',  label: 'Informes' },
]

interface SidebarProps {
  active: Section
  onChange: (s: Section) => void
}

/** Sidebar de navegación con iconos y tooltip al hover. */
export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <nav className="sidebar">
      {NAV.map(n => (
        <button
          key={n.id}
          className={`sb-btn${active === n.id ? ' is-active' : ''}`}
          onClick={() => onChange(n.id)}
          title={n.label}
        >
          <Icon name={n.icon} size={22} />
          <span className="sb-tip">{n.label}</span>
        </button>
      ))}
      <div className="sb-spacer" />
      <button
        className={`sb-btn${active === 'settings' ? ' is-active' : ''}`}
        onClick={() => onChange('settings')}
      >
        <Icon name="settings" size={22} />
        <span className="sb-tip">Ajustes</span>
      </button>
    </nav>
  )
}
