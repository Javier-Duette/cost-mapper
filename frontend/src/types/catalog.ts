/** Facetas NBR 15965 principales (BIM-relevantes en construcción). */
export type Faceta = '3E' | '3R' | '4U' | '2C' | '2N' | '2Q'

/** Respuesta del endpoint GET /api/catalog/items/:id y listados. */
export interface CatalogItem {
  id: string
  uuid_status: string
  nbr_code: string
  facet: string          // puede ser '3E', '2C', '0M', etc.
  description_es: string
  description_pt: string | null
  unit: string
  unit_price: number
  currency: string
  fuente_precios: string
  fuente_factores: string
  bim_taggable: boolean
  relevant_py: boolean
  oficial: boolean
  is_verified: boolean
  verificado_por: string | null
  fecha_verificacion: string | null
  is_work_item: boolean
  parent_nbr_code: string | null
  creado_por: string
  modificado_por: string | null
  created_at: string
  updated_at: string
}

/** Fila del desglose APU (endpoint GET /api/catalog/items/:id/apu). */
export interface APUComponentRead {
  apu_component_id: string
  component_id: string
  clase: string      // facet del componente (2N, 2Q, 2C)
  codigo: string     // nbr_code del componente
  descripcion: string
  unidad: string
  coef: number
  precio: number
  currency: string
  fuente_precio: string
  fuente_coef: string
  creado_por: string | null
  modificado_por: string | null
  created_at: string | null
  updated_at: string | null
}

/** Respuesta paginada del endpoint GET /api/catalog/items. */
export interface CatalogSearchResult {
  items: CatalogItem[]
  total: number
  offset: number
  limit: number
}

export type Section = 'catalog' | 'budget' | 'mapping' | 'library' | 'reports' | 'settings'
