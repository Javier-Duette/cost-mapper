import type { MappingGroupRead } from '../../types/mapping'

interface MappingGroupsTableProps {
  rows: MappingGroupRead[]
  selectedKey: string | null
  onSelect: (group: MappingGroupRead) => void
}

function groupKey(g: MappingGroupRead): string {
  return `${g.ifc_type}||${g.ifc_type_name ?? ''}`
}

/** Tabla de grupos (IfcType + tipo) para mapeo manual masivo. */
export function MappingGroupsTable({ rows, selectedKey, onSelect }: MappingGroupsTableProps) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: 140 }}>IFC</th>
          <th>TIPO (familia + tipo)</th>
          <th style={{ width: 260 }}>ITEM</th>
          <th className="num" style={{ width: 90 }}>CANT.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const key = groupKey(r)
          const sel = selectedKey === key
          return (
            <tr
              key={key}
              className={sel ? 'is-selected' : ''}
              onClick={() => onSelect(r)}
              title={r.ifc_type_name ?? r.ifc_type}
            >
              <td className="num">{r.ifc_type}</td>
              <td className="desc">{r.ifc_type_name ?? '—'}</td>
              <td
                className="desc"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}
                title={r.assigned_item ? `${r.assigned_item.nbr_code} — ${r.assigned_item.description_es}` : undefined}
              >
                {r.assigned_is_mixed
                  ? 'Mixto'
                  : r.assigned_item
                    ? `${r.assigned_item.nbr_code} — ${r.assigned_item.description_es}`
                    : '—'}
              </td>
              <td className="num">{r.total_elements}</td>
            </tr>
          )
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
              Sin resultados para este tab.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
