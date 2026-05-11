import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IFC_WITH_CLASSIFICATION = path.join(__dirname, 'fixtures', 'nbr_3E_05_20_wall.ifc')

const BACKEND_BASE_URL = process.env.E2E_BACKEND_BASE_URL ?? 'http://localhost:8002'

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

async function createCatalogItemExactNbr() {
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
  await api.dispose()
}

async function selectProjectByName(page: Page, projectName: string) {
  await page.locator('.proj-select').click()
  await page.locator('.proj-popover__item .pn', { hasText: projectName }).click()
}

test('modo completo: auto-asignación por match exacto NBR al importar IFC', async ({ page }) => {
  const projectName = `E2E AutoAssign ${Date.now()}`
  await createCatalogItemExactNbr()
  await createProject(projectName)

  await page.goto('/')
  await expect(page.getByText('Cost-Mapper')).toBeVisible()
  await selectProjectByName(page, projectName)

  await page.locator('button[title="Mapeo IFC"]').click()
  await expect(page.getByText('Importá un modelo IFC para comenzar')).toBeVisible()

  await page.locator('.empty-state input[type="file"][accept=".ifc"]').setInputFiles(IFC_WITH_CLASSIFICATION)

  await expect(page.getByText(/Auto-asignación:/)).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: 'Auto-asignados' }).click()
  await expect(page.getByText('Sin resultados para este tab.')).toHaveCount(0)

  const row = page.locator('table.tbl tbody tr').first()
  await expect(row.locator('td').nth(4)).toHaveText('3E 05 20')
  await expect(row.locator('td').nth(5)).toHaveText('1')
})

test('modo local: Limpiar permite re-seleccionar el mismo IFC', async ({ page }) => {
  const projectName = `E2E LocalMode ${Date.now()}`
  await createProject(projectName)

  await page.goto('/')
  await expect(page.getByText('Cost-Mapper')).toBeVisible()
  await selectProjectByName(page, projectName)

  await page.locator('button[title="Mapeo IFC"]').click()
  await page.locator('.empty-state input[type="file"][accept=".ifc"]').setInputFiles(IFC_WITH_CLASSIFICATION)

  await expect(page.getByRole('button', { name: 'Modo local' })).toBeVisible()
  await page.getByRole('button', { name: 'Modo local' }).click()

  await page.locator('input[type="file"][accept=".ifc"]').setInputFiles(IFC_WITH_CLASSIFICATION)
  await expect(page.getByText('IFC local seleccionado:')).toBeVisible()

  await page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(page.getByText('Seleccioná un archivo')).toBeVisible()

  await page.locator('input[type="file"][accept=".ifc"]').setInputFiles(IFC_WITH_CLASSIFICATION)
  await expect(page.getByText('IFC local seleccionado:')).toBeVisible()
})
