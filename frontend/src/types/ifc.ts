import type { Project } from './projects'

export type IfcElementStatus = 'active' | 'deleted'

/** Resumen del elemento IFC persistido para el proyecto. */
export interface IfcElementSummary {
  id: string
  global_id: string
  ifc_type: string | null
  ifc_name: string | null
  ifc_level: string | null
  nbr_classification: string | null
  geometry_hash: string | null
  status: IfcElementStatus
  last_import_at: string | null
}

/** Respuesta paginada del listado de elementos IFC del proyecto. */
export interface IfcElementsPage {
  items: IfcElementSummary[]
  total: number
  offset: number
  limit: number
}

export interface IfcImportSummary {
  total_elements: number
  with_nbr_classification: number
  without_nbr_classification: number
}

/** Respuesta del upload del IFC del proyecto. */
export interface IfcImportResponse {
  ok: boolean
  project: Project
  import_summary: IfcImportSummary
}

