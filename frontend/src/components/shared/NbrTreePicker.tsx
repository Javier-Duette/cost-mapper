/**
 * NbrTreePicker — selector de nodo NBR 15965.
 *
 * Dos modos en tabs:
 *   "Buscar"  — campo de búsqueda por texto/descripción + filtro de faceta.
 *   "Navegar" — árbol jerárquico expandible por faceta (lazy-load por faceta completa).
 *
 * Al seleccionar un nodo muestra un breadcrumb que explica cada segmento del código.
 * Usado en CreateItemModal para ubicar el nodo padre correcto (ADR-001 Capa 3).
 */

import { useState, useEffect, useRef } from 'react'
import type { NbrNode } from '../../api/catalog'
import { searchNbrTree, getNbrTree, getNbrAncestors } from '../../api/catalog'

const FACETS: { value: string; label: string; color: string }[] = [
  { value: '1S', label: '1S · Servicios',         color: '#7c6fcd' },
  { value: '2C', label: '2C · Materiales',         color: '#3a86ff' },
  { value: '2N', label: '2N · Mano de obra',       color: '#06d6a0' },
  { value: '2Q', label: '2Q · Equipos',            color: '#ffd166' },
  { value: '3E', label: '3E · Elementos',          color: '#ef476f' },
  { value: '3R', label: '3R · Ayudas de obra',     color: '#f77f00' },
  { value: '4U', label: '4U · Recursos diversos',  color: '#9b5de5' },
]

const FACET_COLOR: Record<string, string> = Object.fromEntries(
  FACETS.map(f => [f.value, f.color])
)

interface Props {
  selected: NbrNode | null
  onSelect: (node: NbrNode) => void
}

// ── Derivación de jerarquía (mismo algoritmo que el backend) ─────────────────

function deriveParentCode(nbrCode: string): string | null {
  const parts = nbrCode.split(' ')
  if (parts.length <= 1) return null
  const segments = parts.slice(1)
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i] !== '00' && segments[i] !== '0') {
      if (i === 0) return null
      const parentSegs = [...segments]
      parentSegs[i] = '00'
      return parts[0] + ' ' + parentSegs.join(' ')
    }
  }
  return null
}

function buildTree(nodes: NbrNode[]): Map<string | null, NbrNode[]> {
  const map = new Map<string | null, NbrNode[]>()
  for (const node of nodes) {
    const parentCode = node.parent_nbr_code ?? deriveParentCode(node.nbr_code)
    const key = parentCode  // null para raíces
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(node)
  }
  return map
}

// ── Tab Navegar ───────────────────────────────────────────────────────────────

function TreeNode({
  node,
  childrenMap,
  selected,
  onSelect,
  depth,
}: {
  node: NbrNode
  childrenMap: Map<string | null, NbrNode[]>
  selected: NbrNode | null
  onSelect: (n: NbrNode) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(false)
  const children = childrenMap.get(node.nbr_code) ?? []
  const hasChildren = children.length > 0
  const isSelected = selected?.nbr_code === node.nbr_code
  const color = FACET_COLOR[node.facet] ?? 'var(--text-secondary)'

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'baseline', gap: 6,
          padding: `4px 8px 4px ${8 + depth * 16}px`,
          cursor: 'pointer',
          background: isSelected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
          borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onClick={() => {
          onSelect(node)
          if (hasChildren) setExpanded(e => !e)
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 12, flexShrink: 0, userSelect: 'none' }}>
          {hasChildren ? (expanded ? '▾' : '▸') : '·'}
        </span>
        <code style={{ fontSize: 11, color, flexShrink: 0, fontWeight: 600, minWidth: 70 }}>
          {node.nbr_code}
        </code>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.description_es || node.description_pt || '—'}
        </span>
        {node.is_work_item && (
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>ítem</span>
        )}
      </div>
      {expanded && hasChildren && children.map(child => (
        <TreeNode
          key={child.nbr_code}
          node={child}
          childrenMap={childrenMap}
          selected={selected}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function NbrTreePicker({ selected, onSelect }: Props) {
  const [tab, setTab]           = useState<'buscar' | 'navegar'>('buscar')

  // Tab buscar
  const [query, setQuery]       = useState('')
  const [facet, setFacet]       = useState<string | null>(null)
  const [results, setResults]   = useState<NbrNode[]>([])
  const [loading, setLoading]   = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tab navegar
  const [navFacet, setNavFacet]       = useState<string | null>(null)
  const [treeNodes, setTreeNodes]     = useState<NbrNode[]>([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [childrenMap, setChildrenMap] = useState<Map<string | null, NbrNode[]>>(new Map())

  // Breadcrumb
  const [ancestors, setAncestors]     = useState<NbrNode[]>([])

  // ── Búsqueda con debounce ────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() && !facet) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const nodes = await searchNbrTree({ q: query.trim() || undefined, facet: facet || undefined, limit: 80 })
        setResults(nodes)
      } catch { /* silencioso */ } finally { setLoading(false) }
    }, 280)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, facet])

  // ── Cargar árbol cuando se elige una faceta en "Navegar" ─────────────────
  useEffect(() => {
    if (!navFacet) return
    setTreeLoading(true)
    setTreeNodes([])
    getNbrTree(navFacet)
      .then(nodes => {
        setTreeNodes(nodes)
        setChildrenMap(buildTree(nodes))
      })
      .catch(() => {/* silencioso */})
      .finally(() => setTreeLoading(false))
  }, [navFacet])

  // ── Breadcrumb: carga ancestros cuando cambia la selección ───────────────
  useEffect(() => {
    if (!selected) { setAncestors([]); return }
    getNbrAncestors(selected.nbr_code)
      .then(setAncestors)
      .catch(() => setAncestors([]))
  }, [selected?.nbr_code])

  const handleFacetClick = (f: string) => setFacet(prev => prev === f ? null : f)

  // Nodos raíz del árbol (sin padre)
  const rootNodes = childrenMap.get(null) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)' }}>
        {(['buscar', 'navegar'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '5px 14px', fontSize: 12, cursor: 'pointer',
              border: 'none', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: tab === t ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {t === 'buscar' ? '🔍 Buscar' : '🌳 Navegar'}
          </button>
        ))}
      </div>

      {/* ── Tab: Buscar ───────────────────────────────────────────────────── */}
      {tab === 'buscar' && (
        <>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none', fontSize: 14 }}>🔍</span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar nodo NBR (ej: revestimiento, cemento, albañil…)"
              style={{ width: '100%', padding: '6px 8px 6px 28px', boxSizing: 'border-box', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 4, fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FACETS.map(f => (
              <button key={f.value} type="button" onClick={() => handleFacetClick(f.value)} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer', border: `1px solid ${f.color}`, background: facet === f.value ? f.color : 'transparent', color: facet === f.value ? '#fff' : f.color, transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
            {facet && (
              <button type="button" onClick={() => setFacet(null)} style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)' }}>
                ✕ limpiar
              </button>
            )}
          </div>

          {(query.trim() || facet) && (
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-surface)' }}>
              {loading && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>Buscando…</div>}
              {!loading && results.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>Sin resultados. Probá con otro término o faceta.</div>}
              {!loading && results.map((node, i) => {
                const isSelected = selected?.nbr_code === node.nbr_code
                const color = FACET_COLOR[node.facet] ?? 'var(--text-secondary)'
                return (
                  <button key={`${node.nbr_code}-${i}`} type="button" onClick={() => onSelect(node)} style={{ display: 'flex', alignItems: 'baseline', gap: 10, width: '100%', padding: '6px 12px', textAlign: 'left', cursor: 'pointer', background: isSelected ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <code style={{ fontSize: 11, color, flexShrink: 0, fontWeight: 600, minWidth: 90 }}>{node.nbr_code}</code>
                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.description_es || node.description_pt || '—'}</span>
                    {node.is_work_item && <span style={{ fontSize: 10, color: 'var(--text-secondary)', flexShrink: 0 }}>ítem</span>}
                  </button>
                )
              })}
            </div>
          )}

          {!query.trim() && !facet && !selected && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
              Escribí el nombre del material, servicio o trabajo para encontrar su código NBR. Podés filtrar por faceta usando los botones de arriba.
            </p>
          )}
        </>
      )}

      {/* ── Tab: Navegar ──────────────────────────────────────────────────── */}
      {tab === 'navegar' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FACETS.map(f => (
              <button key={f.value} type="button" onClick={() => setNavFacet(f.value)} style={{ padding: '4px 12px', borderRadius: 12, fontSize: 11, cursor: 'pointer', border: `1px solid ${f.color}`, background: navFacet === f.value ? f.color : 'transparent', color: navFacet === f.value ? '#fff' : f.color, transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
          </div>

          {!navFacet && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
              Elegí una faceta para cargar su árbol de clasificación.
            </p>
          )}

          {treeLoading && <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>Cargando árbol…</div>}

          {navFacet && !treeLoading && treeNodes.length > 0 && (
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-surface)' }}>
              {rootNodes.length === 0 && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  No se encontraron nodos raíz para esta faceta.
                </div>
              )}
              {rootNodes.map(node => (
                <TreeNode
                  key={node.nbr_code}
                  node={node}
                  childrenMap={childrenMap}
                  selected={selected}
                  onSelect={onSelect}
                  depth={0}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Nodo seleccionado ──────────────────────────────────────────────── */}
      {selected && (
        <div style={{ padding: '8px 10px', borderRadius: 4, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>✓ Seleccionado:</span>
            <code style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{selected.nbr_code}</code>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected.description_es || selected.description_pt || '—'}
            </span>
          </div>

          {/* Breadcrumb de segmentos */}
          {ancestors.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 2 }}>
              {ancestors.map((anc, i) => {
                const color = FACET_COLOR[anc.facet] ?? 'var(--text-secondary)'
                return (
                  <span key={anc.nbr_code} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {i > 0 && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>›</span>}
                    <span style={{ fontSize: 10, background: 'var(--bg-surface)', border: `1px solid ${color}`, color, borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                      <strong>{anc.nbr_code.split(' ').pop()}</strong>
                      {anc.description_es ? ` · ${anc.description_es}` : ''}
                    </span>
                  </span>
                )
              })}
              <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>›</span>
              <span style={{ fontSize: 10, background: 'var(--bg-surface)', border: `1px solid var(--accent)`, color: 'var(--accent)', borderRadius: 3, padding: '1px 5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <strong>{selected.nbr_code.split(' ').pop()}</strong>
                {selected.description_es ? ` · ${selected.description_es}` : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
