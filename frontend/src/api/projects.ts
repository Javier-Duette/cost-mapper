import type { Project, ProjectCreate, ProjectUpdate } from '../types/projects'

const BASE = '/api/projects'

export async function listProjects(): Promise<{ items: Project[]; total: number }> {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`GET /projects falló: ${res.status}`)
  return res.json()
}

export async function createProject(data: ProjectCreate): Promise<Project> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST /projects falló: ${res.status}`)
  return res.json()
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${BASE}/${id}`)
  if (!res.ok) throw new Error(`GET /projects/${id} falló: ${res.status}`)
  return res.json()
}

export async function updateProject(id: string, data: ProjectUpdate): Promise<Project> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PATCH /projects/${id} falló: ${res.status}`)
  return res.json()
}
