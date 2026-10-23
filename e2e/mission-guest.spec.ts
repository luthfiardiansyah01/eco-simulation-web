import { expect, test } from '@playwright/test'
import { completeLevelOne, openLevelOne } from './support/mission'

test('guest can complete level 1 and is prompted to sign in', async ({ page }) => {
  await openLevelOne(page)
  await completeLevelOne(page)

  await expect(page.getByTestId('mission-complete')).toBeVisible()
  await expect(page.getByTestId('mission-progress')).toHaveText('100%')
  await expect(page.getByText('⚠ Masuk untuk menyimpan progress')).toBeVisible()
})
