import type { Page } from '@playwright/test'

export async function markOnboardingDone(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('ecosim_onboarding_done', '1')
  })
}

export async function gotoApp(page: Page, path: string) {
  const response = await page.goto(path)
  await page.locator('body').waitFor()
  return response
}
