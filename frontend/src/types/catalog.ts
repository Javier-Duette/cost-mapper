export type Faceta = '3E' | '4U' | '2C' | '2N' | '2Q'

export interface CatalogItem {
  id: string
  nbr_code: string
  description: string
  unit: string
  unit_price: number | null
  faceta: Faceta
  price_source: string
  relevant_py: boolean
}

export interface APUComponent {
  id: string
  component_id: string
  component_code: string
  component_description: string
  component_unit: string
  component_faceta: Faceta
  coefficient: number
  coef_source: string
  unit_price: number | null
  price_source: string
}

export interface CatalogSearchResult {
  items: CatalogItem[]
  total: number
  offset: number
  limit: number
}

export type Section = 'catalog' | 'budget' | 'mapping' | 'library' | 'reports' | 'settings'
