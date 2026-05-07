import type { BudgetSummary } from '../types/budget'

export async function getBudget(projectId: string): Promise<BudgetSummary> {
  const res = await fetch(`/api/projects/${projectId}/budget`)
  if (!res.ok) throw new Error(`GET /budget falló: ${res.status}`)
  return res.json()
}
