import type { CatalogItem } from './catalog'
import type { IfcElementSummary } from './ifc'

export type MappingTab = 'auto' | 'unassigned' | 'manual' | 'conflicts'

export type ClassificationSource = 'ifc_classification' | 'user'

/** Asignación persistida GlobalId → ítem de catálogo (vía ifc_element_id). */
export interface ProjectAssignmentRead {
  id: string
  ifc_element_id: string
  item_id: string
  classification_source: ClassificationSource
  created_at?: string
  item?: Pick<CatalogItem, 'id' | 'nbr_code' | 'facet' | 'description_es' | 'unit'>
}

export interface MappingSuggestion {
  item_id: string
  nbr_code: string
  facet?: string | null
  description_es: string
  unit: string
  confidence: number
}

export interface MappingElementRow {
  element: IfcElementSummary
  assignments: ProjectAssignmentRead[]
  suggestions: MappingSuggestion[]
}

export interface MappingElementsPage {
  items: MappingElementRow[]
  total: number
  offset: number
  limit: number
}

export interface CreateAssignmentInput {
  ifc_element_id: string
  item_id: string
}

export interface AutoAssignSummary {
  created: number
  skipped_user: number
  skipped_existing: number
  no_match: number
}

export interface MappingGroupRead {
  ifc_type: string
  ifc_type_name: string | null
  total_elements: number
  assigned_item?: Pick<CatalogItem, 'id' | 'nbr_code' | 'facet' | 'description_es' | 'unit'> | null
  assigned_is_mixed?: boolean
}

export interface MappingGroupsPage {
  items: MappingGroupRead[]
  total: number
  offset: number
  limit: number
}

export interface GroupAssignInput {
  ifc_type: string
  ifc_type_name?: string | null
  item_id: string
}

export interface GroupAssignSummary {
  created: number
  skipped_already_assigned: number
}
