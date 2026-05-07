import type { APUComponent, CatalogItem, CatalogSearchResult } from '../types/catalog'

const BASE = '/api/catalog'

/** Busca ítems con filtros opcionales. */
export async function searchItems(params: {
  q?: string
  facet?: string
  relevant_py?: boolean
  offset?: number
  limit?: number
}): Promise<CatalogSearchResult> {
  const url = new URL(BASE + '/items', window.location.origin)
  if (params.q)           url.searchParams.set('q', params.q)
  if (params.facet)       url.searchParams.set('facet', params.facet)
  if (params.relevant_py != null) url.searchParams.set('relevant_py', String(params.relevant_py))
  if (params.offset != null) url.searchParams.set('offset', String(params.offset))
  if (params.limit  != null) url.searchParams.set('limit',  String(params.limit))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`GET /items falló: ${res.status}`)
  return res.json() as Promise<CatalogSearchResult>
}

/** Obtiene el detalle de un ítem por id. */
export async function getItem(id: string): Promise<CatalogItem> {
  const res = await fetch(`${BASE}/items/${id}`)
  if (!res.ok) throw new Error(`GET /items/${id} falló: ${res.status}`)
  return res.json() as Promise<CatalogItem>
}

/** Obtiene el desglose APU de un ítem. */
export async function getItemAPU(id: string): Promise<APUComponent[]> {
  const res = await fetch(`${BASE}/items/${id}/apu`)
  if (!res.ok) throw new Error(`GET /items/${id}/apu falló: ${res.status}`)
  return res.json() as Promise<APUComponent[]>
}
