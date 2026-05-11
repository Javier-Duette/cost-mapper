import type { MappingTab } from '../../types/mapping'

const LABEL: Record<MappingTab, string> = {
  auto: 'Auto-asignados',
  unassigned: 'Sin asignar',
  manual: 'Asignados (manual)',
  conflicts: 'Conflictos',
}

interface MappingTabsProps {
  value: MappingTab
  onChange: (v: MappingTab) => void
  counts?: Partial<Record<MappingTab, number>>
}

/** Tabs del panel de mapeo (auto / sin asignar / conflictos). */
export function MappingTabs({ value, onChange, counts }: MappingTabsProps) {
  const tabs: MappingTab[] = ['auto', 'unassigned', 'manual', 'conflicts']
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {tabs.map(t => {
        const active = t === value
        const count = counts?.[t]
        return (
          <button
            key={t}
            className={`btn${active ? ' btn--primary' : ''}`}
            onClick={() => onChange(t)}
            style={{ height: 28, padding: '0 10px', fontSize: 12 }}
            title={LABEL[t]}
          >
            {LABEL[t]}
            {typeof count === 'number' ? (
              <span style={{ marginLeft: 8, opacity: active ? 0.95 : 0.75, fontFamily: 'var(--font-mono)' }}>
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
