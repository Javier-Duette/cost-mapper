import type { AutoAssignSummary, CreateAssignmentInput, MappingElementsPage, MappingTab, ProjectAssignmentRead } from '../types/mapping'

/**
 * Lista filas del mapper (elemento + asignaciones + sugerencias).
 * Endpoint: GET /api/projects/{projectId}/mapping/elements
 */
export async function listMappingElements(params: {
  projectId: string
  tab: MappingTab
  offset?: number
  limit?: number
  q?: string
}): Promise<MappingElementsPage> {
  const url = new URL(`/api/projects/${params.projectId}/mapping/elements`, window.location.origin)
  url.searchParams.set('tab', params.tab)
  if (params.offset != null) url.searchParams.set('offset', String(params.offset))
  if (params.limit != null) url.searchParams.set('limit', String(params.limit))
  if (params.q?.trim()) url.searchParams.set('q', params.q.trim())

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`GET /projects/${params.projectId}/mapping/elements falló: ${res.status}`)
  return res.json() as Promise<MappingElementsPage>
}

/**
 * Crea asignación user (evita duplicado por regla de backend).
 * Endpoint: POST /api/projects/{projectId}/mapping/assignments
 */
export async function createMappingAssignment(projectId: string, data: CreateAssignmentInput): Promise<ProjectAssignmentRead> {
  const res = await fetch(`/api/projects/${projectId}/mapping/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST /projects/${projectId}/mapping/assignments falló: ${res.status}`)
  return res.json() as Promise<ProjectAssignmentRead>
}

/** Endpoint: DELETE /api/projects/{projectId}/mapping/assignments/{assignmentId} */
export async function deleteMappingAssignment(projectId: string, assignmentId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/mapping/assignments/${assignmentId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE /projects/${projectId}/mapping/assignments/${assignmentId} falló: ${res.status}`)
}

/** Endpoint: POST /api/projects/{projectId}/mapping/assignments:auto */
export async function autoAssignByIfcClassification(projectId: string): Promise<AutoAssignSummary> {
  const res = await fetch(`/api/projects/${projectId}/mapping/assignments:auto`, { method: 'POST' })
  if (!res.ok) throw new Error(`POST /projects/${projectId}/mapping/assignments:auto falló: ${res.status}`)
  return res.json() as Promise<AutoAssignSummary>
}
