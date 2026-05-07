import { Icon } from './Icon'
import type { Faceta } from '../../types/catalog'

const FACETAS: Faceta[] = ['3E', '4U', '2C', '2N', '2Q']

interface SectionHeaderProps {
  title: string
  subtitle?: string
  search: string
  onSearch: (v: string) => void
  activeFacetas: Faceta[]
  onToggleFaceta: (f: Faceta) => void
  relevantOnly: boolean
  onToggleRelevant: () => void
  showFacetas?: boolean
}

/** Barra de controles sobre cada vista: título, búsqueda, filtros de faceta. */
export function SectionHeader({
  title, subtitle, search, onSearch,
  activeFacetas, onToggleFaceta,
  relevantOnly, onToggleRelevant,
  showFacetas = true,
}: SectionHeaderProps) {
  return (
    <div className="section__hdr">
      <div className="section__title">
        {title}
        {subtitle && <small>{subtitle}</small>}
      </div>

      <div className="section__controls">
        <div className="input-search">
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Buscar por código o descripción…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        {showFacetas && FACETAS.map(f => (
          <button
            key={f}
            className={`chip-toggle${activeFacetas.includes(f) ? ` is-on--${f}` : ''}`}
            onClick={() => onToggleFaceta(f)}
          >
            {f}
          </button>
        ))}

        <label className={`switch${relevantOnly ? ' is-on' : ''}`} onClick={onToggleRelevant}>
          <div className="switch__track" />
          <span>Solo PY</span>
        </label>
      </div>
    </div>
  )
}
