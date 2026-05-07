import type { Faceta } from '../../types/catalog'

interface ChipProps {
  faceta: Faceta | string
  className?: string
}

/** Badge de faceta NBR 15965. */
export function Chip({ faceta, className }: ChipProps) {
  return (
    <span className={`chip chip--${faceta}${className ? ' ' + className : ''}`}>
      {faceta}
    </span>
  )
}

interface SourceBadgeProps {
  source: string
}

/** Badge de fuente de precio/coeficiente (TCPO / Custom). */
export function SourceBadge({ source }: SourceBadgeProps) {
  const cls = source === 'Custom' ? 'src--custom' : 'src--tcpo'
  return <span className={`src ${cls}`}>{source}</span>
}
