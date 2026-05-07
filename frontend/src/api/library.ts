import type { LibraryEntryCreate, LibraryEntryRead } from '../types/library'

export async function addToLibrary(
  projectId: string,
  data: LibraryEntryCreate,
): Promise<LibraryEntryRead> {
  const res = await fetch(`/api/projects/${projectId}/library`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (res.status === 409) throw new DuplicateItemError()
  if (!res.ok) throw new Error(`POST library falló: ${res.status}`)
  return res.json()
}

export async function listLibrary(projectId: string): Promise<LibraryEntryRead[]> {
  const res = await fetch(`/api/projects/${projectId}/library`)
  if (!res.ok) throw new Error(`GET library falló: ${res.status}`)
  return res.json()
}

export async function updateLibraryEntry(
  projectId: string,
  entryId: string,
  data: { manual_quantity?: number | null; notes?: string | null },
): Promise<LibraryEntryRead> {
  const res = await fetch(`/api/projects/${projectId}/library/${entryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PATCH library entry falló: ${res.status}`)
  return res.json()
}

export async function removeFromLibrary(projectId: string, entryId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/library/${entryId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`DELETE library entry falló: ${res.status}`)
}

export class DuplicateItemError extends Error {
  constructor() {
    super('El ítem ya está en el proyecto')
    this.name = 'DuplicateItemError'
  }
}
