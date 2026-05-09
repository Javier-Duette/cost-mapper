import type { IfcElementsPage, IfcImportResponse } from '../types/ifc'

/**
 * Sube el IFC del proyecto (multipart/form-data, campo `file`).
 * Endpoint: POST /api/projects/{projectId}/ifc
 */
export async function uploadIfc(projectId: string, file: File): Promise<IfcImportResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`/api/projects/${projectId}/ifc`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`POST /projects/${projectId}/ifc falló: ${res.status}`)
  return res.json() as Promise<IfcImportResponse>
}

/** URL del IFC actual del proyecto para el visor (GET /api/projects/{id}/ifc/file). */
export function ifcFileUrl(projectId: string): string {
  return `/api/projects/${projectId}/ifc/file`
}

/**
 * Lista elementos IFC del proyecto (paginado).
 * Endpoint: GET /api/projects/{projectId}/ifc/elements
 */
export async function listIfcElements(params: {
  projectId: string
  offset?: number
  limit?: number
  q?: string
  status?: 'active' | 'deleted' | 'all'
}): Promise<IfcElementsPage> {
  const url = new URL(`/api/projects/${params.projectId}/ifc/elements`, window.location.origin)
  if (params.offset != null) url.searchParams.set('offset', String(params.offset))
  if (params.limit != null) url.searchParams.set('limit', String(params.limit))
  if (params.q) url.searchParams.set('q', params.q)
  if (params.status) url.searchParams.set('status', params.status)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`GET /projects/${params.projectId}/ifc/elements falló: ${res.status}`)
  return res.json() as Promise<IfcElementsPage>
}

