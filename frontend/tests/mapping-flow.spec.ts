import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IFC_WITH_CLASSIFICATION = path.join(__dirname, 'fixtures', 'nbr_3E_05_20_wall.ifc')
const IFC_UNCLASSIFIED_TWO_WALLS = path.join(__dirname, 'fixtures', 'unclassified_two_walls.ifc')

const BACKEND_BASE_URL = process.env.E2E_BACKEND_BASE_URL ?? 'http://127.0.0.1:8002'

const createdItemIds: string[] = []

async function createProject(name: string) {
  const api = await playwrightRequest.newContext({ baseURL: BACKEND_BASE_URL })
  const res = await api.post('/api/projects', {
    data: { name, location: 'Asunción', type: 'residencial', currency: 'PYG' },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data as { id: string; name: string }
}

async function createCatalogItemExactNbr(): Promise<string> {
  const api = await playwrightRequest.newContext({ baseURL: BACKEND_BASE_URL })
  const res = await api.post('/api/catalog/items', {
    data: {
      nbr_code: '3E 05 20',
      facet: '3E',
      description_es: 'Item test auto-asignación',
      unit: 'm²',
    },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data.id as string
}

async function createCatalogItemForGroupAssign(): Promise<string> {
  const api = await playwrightRequest.newContext({ baseURL: BACKEND_BASE_URL })
  const res = await api.post('/api/catalog/items', {
    data: {
      nbr_code: '3E 99 99',
      facet: '3E',
      description_es: 'Item test asignación por grupo',
      unit: 'm²',
    },
  })
  expect(res.ok()).toBeTruthy()
  const data = await res.json()
  await api.dispose()
  return data.id as string
}

async function deleteCatalogItem(id: string) {
  const api = await playwrightRequest.newContext({ baseURL: BACKEND_BASE_URL })
  await api.delete(`/api/catalog/items/${id}`)
  await api.dispose()
}

test.afterAll(async () => {
  for (const id of createdItemIds) {
    await deleteCatalogItem(id)
  }
})

async function selectProjectByName(page: Page, projectName: string) {
  await page.locator('.proj-select').click()
  await page.locator('.proj-popover__item .pn', { hasText: projectName }).click()
}

test('modo completo: auto-asignación por match exacto NBR al importar IFC', async ({ page }) => {
  const projectName = `E2E AutoAssign ${Date.now()}`
  createdItemIds.push(await createCatalogItemExactNbr())
  await createProject(projectName)

  await page.goto('/')
  await expect(page.locator('.hdr__brand')).toBeVisible({ timeout: 30_000 })
  await selectProjectByName(page, projectName)

  await page.locator('button[title="Mapeo IFC"]').click()
  await expect(page.getByText('Importá un modelo IFC para comenzar')).toBeVisible()

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Importar modelo IFC' }).click(),
  ])
  const autoAssignDone = page.waitForResponse(async (resp) => {
    if (!resp.url().includes('/mapping/assignments:auto')) return false
    if (resp.request().method() !== 'POST') return false
    if (resp.status() !== 200) return false
    try {
      const json = await resp.json()
      return typeof json?.created === 'number' && json.created >= 1
    } catch {
      return false
    }
  })
  await fileChooser.setFiles(IFC_WITH_CLASSIFICATION)
  await autoAssignDone

  await page.getByRole('button', { name: 'Auto-asignados' }).click()
  const row = page.locator('table.tbl tbody tr').first()
  await expect(row.locator('td').nth(0)).toHaveText('IfcWall', { timeout: 30_000 })
  await expect(row.locator('td').nth(3)).toHaveText('1')
})

test('modo completo: asignación manual masiva por grupo (IfcType + tipo)', async ({ page }) => {
  const projectName = `E2E GroupAssign ${Date.now()}`
  createdItemIds.push(await createCatalogItemForGroupAssign())
  await createProject(projectName)

  await page.goto('/')
  await expect(page.locator('.hdr__brand')).toBeVisible({ timeout: 30_000 })
  await selectProjectByName(page, projectName)

  await page.locator('button[title="Mapeo IFC"]').click()
  await expect(page.getByText('Importá un modelo IFC para comenzar')).toBeVisible()

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Importar modelo IFC' }).click(),
  ])
  await fileChooser.setFiles(IFC_UNCLASSIFIED_TWO_WALLS)

  // Click primer grupo (debe estar en "Sin asignar" porque no hay ítem exacto 3E 05 20 en catálogo)
  const firstGroupRow = page.locator('table.tbl tbody tr').first()
  await expect(firstGroupRow.locator('td').nth(0)).toHaveText('IfcWall', { timeout: 30_000 })
  await firstGroupRow.click()

  // Buscar ítem y asignar al grupo
  const catalogSearchDone = page.waitForResponse(async (resp) => {
    if (!resp.url().includes('/api/catalog/items')) return false
    if (resp.request().method() !== 'GET') return false
    if (resp.status() !== 200) return false
    try {
      const json = await resp.json()
      return Array.isArray(json?.items) && json.items.length >= 1
    } catch {
      return false
    }
  })
  await page.locator('.area-panel .input-search input').fill('3E 99 99')
  await catalogSearchDone

  const assignBtn = page.locator('.area-panel button.btn--primary').filter({ hasText: 'Asignar al grupo' }).first()
  await expect(assignBtn).toBeEnabled({ timeout: 30_000 })

  const groupAssignDone = page.waitForResponse(async (resp) => {
    if (!resp.url().includes('/mapping/groups:assign')) return false
    if (resp.request().method() !== 'POST') return false
    if (resp.status() !== 200) return false
    try {
      const json = await resp.json()
      return typeof json?.created === 'number' && json.created >= 1
    } catch {
      return false
    }
  })
  await assignBtn.click()
  await groupAssignDone

  // El grupo desaparece de "Sin asignar"
  await expect(page.getByText('Sin resultados para este tab.')).toBeVisible({ timeout: 30_000 })

  // Se ve en "Asignados (manual)" con el ítem asignado
  await page.getByRole('button', { name: 'Asignados (manual)' }).click()
  const manualRow = page.locator('table.tbl tbody tr').first()
  await expect(manualRow.locator('td').nth(0)).toHaveText('IfcWall', { timeout: 30_000 })
  await expect(manualRow.locator('td').nth(2)).toHaveText('3E 99 99')
})
