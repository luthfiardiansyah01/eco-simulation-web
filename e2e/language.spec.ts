import { expect, test } from '@playwright/test'
import { mockSupabase } from './support/supabase'
import { gotoApp, markOnboardingDone } from './support/ui'

test.beforeEach(async ({ page }) => {
  await markOnboardingDone(page)
  await mockSupabase(page)
})

test('language selection localizes server pages and the gameplay client', async ({
  page,
}) => {
  await gotoApp(page, '/region')
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.getByRole('heading', { name: 'Mode Petualangan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jawa Barat' })).toBeVisible()

  await gotoApp(page, '/mission/west-java')
  await expect(page.getByText('Inisiatif Pembersihan Sungai')).toBeVisible()

  await gotoApp(page, '/settings')
  await page.getByRole('button', { name: /English/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await gotoApp(page, '/')
  await expect(page.getByRole('link', { name: /Adventure Mode/ })).toBeVisible()
  await expect(page.getByText('Classic Free Roam')).toBeVisible()

  await gotoApp(page, '/region')
  await expect(page.getByRole('heading', { name: 'Adventure Mode' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'West Java' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Central Java' })).toBeVisible()

  await gotoApp(page, '/mission/west-java')
  await expect(page.getByText('River Cleanup Initiative')).toBeVisible()

  await gotoApp(page, '/briefing/west-java/1')
  await expect(
    page.getByRole('heading', { name: 'River Cleanup Initiative' })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Background' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mission Objectives' })).toBeVisible()

  await gotoApp(page, '/play/west-java/1?difficulty=normal')
  await expect(page.getByTestId('action-clean_waste')).toBeVisible()
  await expect(page.getByText('Environment', { exact: true })).toBeVisible()

  await gotoApp(page, '/privacy')
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()

  await gotoApp(page, '/settings')
  await page.getByRole('button', { name: /Bahasa Indonesia/ }).click()
  await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')

  await gotoApp(page, '/')
  await expect(page.getByRole('link', { name: /Mode Petualangan/ })).toBeVisible()
  await expect(page.getByText('Jelajah Bebas Klasik')).toBeVisible()

  await gotoApp(page, '/region')
  await expect(page.getByRole('heading', { name: 'Mode Petualangan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jawa Barat' })).toBeVisible()
})
