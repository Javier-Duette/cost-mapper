export interface UserSetting {
  id: number
  name: string
  active: boolean
}

export interface SourceSetting {
  id: number
  name: string
  type: string
  active: boolean
}

export async function getUsers(): Promise<UserSetting[]> {
  const res = await fetch('/api/settings/users')
  if (!res.ok) throw new Error('GET /settings/users failed')
  return res.json()
}

export async function getSources(): Promise<SourceSetting[]> {
  const res = await fetch('/api/settings/sources')
  if (!res.ok) throw new Error('GET /settings/sources failed')
  return res.json()
}

export async function createUser(name: string): Promise<UserSetting> {
  const res = await fetch('/api/settings/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, active: true })
  })
  return res.json()
}

export async function createSource(name: string, type: string = 'price'): Promise<SourceSetting> {
  const res = await fetch('/api/settings/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type, active: true })
  })
  return res.json()
}

export async function updateUser(id: number, data: Partial<UserSetting>): Promise<UserSetting> {
  const res = await fetch(`/api/settings/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteUser(id: number): Promise<void> {
  await fetch(`/api/settings/users/${id}`, { method: 'DELETE' })
}

export async function updateSource(id: number, data: Partial<SourceSetting>): Promise<SourceSetting> {
  const res = await fetch(`/api/settings/sources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteSource(id: number): Promise<void> {
  await fetch(`/api/settings/sources/${id}`, { method: 'DELETE' })
}
