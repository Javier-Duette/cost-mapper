export interface LibraryEntryCreate {
  item_id: string
  notes?: string | null
  manual_quantity?: number | null
}

export interface LibraryEntryRead {
  id: string
  project_id: string
  item_id: string
  notes: string | null
  manual_quantity: number | null
  added_at: string
}

export interface LibraryEntryReadWithItem extends LibraryEntryRead {
  nbr_code: string
  facet: string
  description_es: string
  unit: string
  is_verified: boolean
}
