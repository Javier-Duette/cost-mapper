import type { APUComponentRead, CatalogItem, CatalogSearchResult } from '../types/catalog'

const BASE = '/api/catalog'

/** Busca ítems con filtros opcionales. */
export async function searchItems(params: {
  q?: string
  facet?: string
  relevant_py?: boolean
  include_archived?: boolean
  offset?: number
  limit?: number
}): Promise<CatalogSearchResult> {
  const url = new URL(BASE + '/items', window.location.origin)
  if (params.q)                      url.searchParams.set('q', params.q)
  if (params.facet)                  url.searchParams.set('facet', params.facet)
  if (params.relevant_py != null)    url.searchParams.set('relevant_py', String(params.relevant_py))
  if (params.include_archived)       url.searchParams.set('include_archived', 'true')
  if (params.offset != null)         url.searchParams.set('offset', String(params.offset))
  if (params.limit  != null)         url.searchParams.set('limit',  String(params.limit))

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
export async function getItemAPU(id: string): Promise<APUComponentRead[]> {
  const res = await fetch(`${BASE}/items/${id}/apu`)
  if (!res.ok) throw new Error(`GET /items/${id}/apu falló: ${res.status}`)
  return res.json() as Promise<APUComponentRead[]>
}

/** Actualiza un ítem del catálogo (precio, descripción, fuente). */
export async function updateItem(id: string, data: Partial<CatalogItem>, user?: string): Promise<CatalogItem> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (user) headers['X-User'] = user

  const res = await fetch(`${BASE}/items/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(`PUT /items/${id} falló: ${res.status}`)
  return res.json() as Promise<CatalogItem>
}

/** Actualiza un componente APU (coeficiente, fuente de coeficiente). */
export async function updateAPUComponent(apuId: string, data: { quantity?: number; source?: string }): Promise<void> {
  const res = await fetch(`${BASE}/apu/${apuId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(`PATCH /apu/${apuId} falló: ${res.status}`)
}

/** Crea un nuevo ítem en el catálogo. */
export async function createItem(data: Omit<CatalogItem, 'id' | 'uuid_status' | 'created_at' | 'updated_at' | 'creado_por' | 'modificado_por' | 'parent_nbr_code' | 'oficial' | 'is_work_item'>): Promise<CatalogItem> {
  const res = await fetch(`${BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(`POST /items falló: ` + res.status)
  return res.json() as Promise<CatalogItem>
}

/** Añade un insumo al APU de un ítem. */
export async function addAPUComponent(itemId: string, data: { component_id: string; quantity: number; unit: string; source: string }): Promise<void> {
  const res = await fetch(`${BASE}/items/${itemId}/apu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(`POST /items/${itemId}/apu falló: ` + res.status)
}

/** Lista los ítems padre que tienen este componente en su APU. */
export async function getItemUsedIn(componentId: string): Promise<CatalogItem[]> {
  const res = await fetch(`${BASE}/items/${componentId}/used-in`)
  if (!res.ok) throw new Error(`GET /items/${componentId}/used-in falló: ${res.status}`)
  return res.json() as Promise<CatalogItem[]>
}

/** Quita un insumo del APU de su ítem padre. */
export async function deleteAPUComponent(apuId: string): Promise<void> {
  const res = await fetch(`${BASE}/apu/${apuId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE /apu/${apuId} falló: ${res.status}`)
}

/** Archiva un ítem (lo oculta del catálogo sin eliminarlo). */
export async function archiveItem(id: string): Promise<CatalogItem> {
  const res = await fetch(`${BASE}/items/${id}/archive`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`PATCH /items/${id}/archive falló: ${res.status}`)
  return res.json() as Promise<CatalogItem>
}

/** Restaura la visibilidad de un ítem archivado. */
export async function unarchiveItem(id: string): Promise<CatalogItem> {
  const res = await fetch(`${BASE}/items/${id}/unarchive`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`PATCH /items/${id}/unarchive falló: ${res.status}`)
  return res.json() as Promise<CatalogItem>
}

/** Elimina un ítem del catálogo (si no está referenciado). */
export async function deleteItem(id: string, user?: string): Promise<void> {
  const headers: Record<string, string> = {}
  if (user) headers['X-User'] = user
  const res = await fetch(`${BASE}/items/${id}`, { method: 'DELETE', headers })
  if (!res.ok) {
    let detail = `${res.status}`
    try {
      const json = await res.json()
      if (json?.detail?.message) detail = json.detail.message
    } catch {
      // ignore
    }
    throw new Error(`DELETE /items/${id} falló: ${detail}`)
  }
}
