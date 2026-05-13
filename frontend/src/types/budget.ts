export interface MarkupLine {
  id: string
  name: string
  category: string  // 'overhead' | 'profit' | 'tax' | 'contingency'
  base: number      // monto sobre el que se calculo
  rate: number | null  // porcentaje (ej: 12.0), null si es fixed
  amount: number    // monto resultante
}

export interface ProjectMarkup {
  id: string
  project_id: string
  name: string
  markup_type: string  // 'percentage' | 'fixed'
  category: string
  percentage: number | null
  fixed_amount: number | null
  apply_to: string  // 'direct_cost' | 'cumulative'
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProjectMarkupCreate {
  name: string
  markup_type?: string
  category?: string
  percentage?: number | null
  fixed_amount?: number | null
  apply_to?: string
  sort_order?: number
  is_active?: boolean
}

export interface ProjectMarkupUpdate {
  name?: string
  markup_type?: string
  category?: string
  percentage?: number | null
  fixed_amount?: number | null
  apply_to?: string
  sort_order?: number
  is_active?: boolean
}

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
  total: number          // costo directo
  items_count: number
  items_without_price: number
  items_without_quantity: number
  markups: MarkupLine[]
  grand_total: number    // total con markups
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
  markups: MarkupLine[]
  grand_total: number
}
