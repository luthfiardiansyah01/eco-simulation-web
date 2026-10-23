import { expect, test } from '@playwright/test'
import { buildFilter, cleanWaste, openLevelOne, plantTree } from './support/mission'

test('stuck mission shows Misi Gagal and resets to the starting state', async ({ page }) => {
  await openLevelOne(page)

  // Spend the budget on filters first. Once fish reaches its target, the filter
  // action is disabled, leaving too few credits to plant the remaining trees.
  await buildFilter(page, 9, 18)
  await cleanWaste(page, 12, 78)
  await plantTree(page, 1, 23)

  await expect(page.getByTestId('mission-failed')).toBeVisible()
  await expect(page.getByText('Misi Gagal')).toBeVisible()
  await expect(page.getByTestId('resource-credits')).toHaveText('20')
  await expect(page.getByTestId('resource-trees')).toHaveText('24/50')

  await page.getByRole('button', { name: /Reset Misi/ }).click()

  await expect(page.getByTestId('mission-failed')).toBeHidden()
  await expect(page.getByTestId('env-pollution')).toHaveText('78%')
  await expect(page.getByTestId('env-fishPopulation')).toHaveText('18%')
  await expect(page.getByTestId('resource-credits')).toHaveText('2000')
  await expect(page.getByTestId('resource-trees')).toHaveText('23/50')
  await expect(page.getByTestId('mission-progress')).toHaveText('35%')
})
