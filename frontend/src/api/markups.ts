import type { ProjectMarkup, ProjectMarkupCreate, ProjectMarkupUpdate } from '../types/budget'

const base = (projectId: string) => `/api/projects/${projectId}/markups`

export async function listMarkups(projectId: string): Promise<ProjectMarkup[]> {
  const res = await fetch(base(projectId))
  if (!res.ok) throw new Error(`GET markups falló: ${res.status}`)
  return res.json() as Promise<ProjectMarkup[]>
}

export async function createMarkup(projectId: string, data: ProjectMarkupCreate): Promise<ProjectMarkup> {
  const res = await fetch(base(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST markup falló: ${res.status}`)
  return res.json() as Promise<ProjectMarkup>
}

export async function updateMarkup(projectId: string, markupId: string, data: ProjectMarkupUpdate): Promise<ProjectMarkup> {
  const res = await fetch(`${base(projectId)}/${markupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PUT markup falló: ${res.status}`)
  return res.json() as Promise<ProjectMarkup>
}

export async function deleteMarkup(projectId: string, markupId: string): Promise<void> {
  const res = await fetch(`${base(projectId)}/${markupId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE markup falló: ${res.status}`)
}

export async function seedDefaultMarkups(projectId: string): Promise<ProjectMarkup[]> {
  const res = await fetch(`${base(projectId)}/defaults`, { method: 'POST' })
  if (!res.ok) throw new Error(`POST markups/defaults falló: ${res.status}`)
  return res.json() as Promise<ProjectMarkup[]>
}
