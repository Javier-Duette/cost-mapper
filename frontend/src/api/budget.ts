import type { BudgetSummary, IfcBudgetSummary } from '../types/budget'

export async function getBudget(projectId: string): Promise<BudgetSummary> {
  const res = await fetch(`/api/projects/${projectId}/budget`)
  if (!res.ok) throw new Error(`GET /budget falló: ${res.status}`)
  return res.json()
}

export async function getBudgetIfc(projectId: string): Promise<IfcBudgetSummary> {
  const res = await fetch(`/api/projects/${projectId}/budget:ifc`)
  if (!res.ok) throw new Error(`GET /budget:ifc falló: ${res.status}`)
  return res.json()
}
