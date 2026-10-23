import { expect, test, type Page } from '@playwright/test'
import { markOnboardingDone } from './support/ui'

async function expectStartingStats(
  page: Page,
  label: string,
  values: {
    pollution: string
    biodiversity: string
    water: string
    fish: string
    trees: string
    credits: string
    energy: string
    drones?: string
  }
) {
  await expect(page.getByText(`Mode ${label}`)).toBeVisible()
  await expect(page.getByText(values.pollution, { exact: true })).toBeVisible()
  await expect(page.getByText(values.biodiversity, { exact: true })).toBeVisible()
  await expect(page.getByText(values.water, { exact: true })).toBeVisible()
  await expect(page.getByText(values.fish, { exact: true })).toBeVisible()
  await expect(page.getByText(values.trees, { exact: true })).toBeVisible()
  await expect(page.getByText(values.credits, { exact: true })).toBeVisible()
  await expect(page.getByText(values.energy, { exact: true })).toBeVisible()
  if (values.drones) {
    await expect(page.getByText(values.drones, { exact: true })).toBeVisible()
  }
}

test.beforeEach(async ({ page }) => {
  await markOnboardingDone(page)
})

test('difficulty selection changes starting values and the gameplay URL', async ({ page }) => {
  await page.goto('/briefing/west-java/1')
  await expect(page.locator('a[aria-current="true"]')).toContainText('Normal')
  await expectStartingStats(page, 'Normal', {
    pollution: '78%',
    biodiversity: '22%',
    water: '31%',
    fish: '18%',
    trees: '23',
    credits: '2.000',
    energy: '270',
  })

  await page.getByRole('link', { name: /Mudah/ }).click()
  await expect(page).toHaveURL(/difficulty=easy$/)
  await expect(page.locator('a[aria-current="true"]')).toContainText('Mudah')
  await expectStartingStats(page, 'Mudah', {
    pollution: '58%',
    biodiversity: '34%',
    water: '46%',
    fish: '32%',
    trees: '31',
    credits: '2.600',
    energy: '330',
    drones: '4',
  })

  await page.getByRole('link', { name: /Sulit/ }).click()
  await expect(page).toHaveURL(/difficulty=hard$/)
  await expect(page.locator('a[aria-current="true"]')).toContainText('Sulit')
  await expectStartingStats(page, 'Sulit', {
    pollution: '82%',
    biodiversity: '16%',
    water: '24%',
    fish: '13%',
    trees: '20',
    credits: '1.950',
    energy: '230',
    drones: '2',
  })

  await page.getByRole('button', { name: '▶ Mulai Simulasi' }).click()
  await expect(page).toHaveURL(/\/play\/west-java\/1\?difficulty=hard$/)
  await expect(page.getByTestId('env-pollution')).toHaveText('82%')
  await expect(page.getByTestId('env-biodiversity')).toHaveText('16%')
  await expect(page.getByTestId('env-waterQuality')).toHaveText('24%')
  await expect(page.getByTestId('env-fishPopulation')).toHaveText('13%')
  await expect(page.getByTestId('resource-trees')).toHaveText('20/50')
  await expect(page.getByTestId('resource-credits')).toHaveText('1950')
  await expect(page.getByTestId('resource-energy')).toHaveText('230')
  await expect(page.getByTestId('resource-drones')).toHaveText('2/5')
})

test('unknown difficulty values fall back to normal', async ({ page }) => {
  await page.goto('/briefing/west-java/1?difficulty=impossible')
  await expect(page.getByText('Mode Normal')).toBeVisible()
  await expect(page.locator('a[aria-current="true"]')).toContainText('Normal')
  await expect(page.getByText('78%', { exact: true })).toBeVisible()
})
