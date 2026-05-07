export interface Project {
  id: string
  name: string
  description: string | null
  location: string | null
  type: string
  currency: string
  ifc_file_path: string | null
  ifc_imported_at: string | null
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  description?: string | null
  location?: string | null
  type?: string
  currency?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string | null
  location?: string | null
  type?: string
  currency?: string
}
