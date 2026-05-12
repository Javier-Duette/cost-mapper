export interface BudgetRow {
  entry_id: string
  item_id: string
  nbr_code: string
  facet: string
  description_es: string
  unit: string
  unit_price: number | null
  currency: string | null
  fuente_precios: string | null
  manual_quantity: number | null
  subtotal: number | null
}

export interface BudgetSummary {
  project_id: string
  rows: BudgetRow[]
  total: number
  items_count: number
  items_without_price: number
  items_without_quantity: number
}

export interface IfcBudgetRow {
  item_id: string
  nbr_code: string
  facet: string
  description_es: string
  unit: string
  unit_price: number | null
  currency: string | null
  fuente_precios: string | null
  computed_quantity: number | null
  elements_count: number
  subtotal: number | null
}

export interface IfcBudgetSummary {
  project_id: string
  rows: IfcBudgetRow[]
  total: number
  items_count: number
  items_without_price: number
  items_without_quantity: number
}
