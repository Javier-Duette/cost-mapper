import type { MappingElementRow } from '../../types/mapping'

interface MappingElementsTableProps {
  rows: MappingElementRow[]
  selectedGlobalId: string | null
  onSelect: (globalId: string) => void
}

/** Tabla de elementos IFC para el mapper (selección por GlobalId). */
export function MappingElementsTable({ rows, selectedGlobalId, onSelect }: MappingElementsTableProps) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: 150 }}>GLOBALID</th>
          <th style={{ width: 120 }}>TIPO</th>
          <th>NOMBRE</th>
          <th style={{ width: 120 }}>NIVEL</th>
          <th style={{ width: 170 }}>NBR</th>
          <th className="num" style={{ width: 80 }}>ASIG.</th>
          <th className="num" style={{ width: 80 }}>SUG.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const sel = selectedGlobalId === r.element.global_id
          return (
            <tr
              key={r.element.id}
              className={sel ? 'is-selected' : ''}
              onClick={() => onSelect(r.element.global_id)}
              title={r.element.global_id}
            >
              <td className="num">{r.element.global_id}</td>
              <td>{r.element.ifc_type ?? '—'}</td>
              <td className="desc">
                {r.element.ifc_name ?? '—'}
                {r.element.status === 'deleted' && (
                  <small style={{ color: 'var(--warning)' }}>Marcado como deleted en reimport</small>
                )}
              </td>
              <td>{r.element.ifc_level ?? '—'}</td>
              <td className="num">{r.element.nbr_classification ?? '—'}</td>
              <td className="num">{r.assignments.length}</td>
              <td className="num">{r.suggestions.length}</td>
            </tr>
          )
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
              Sin resultados para este tab.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

