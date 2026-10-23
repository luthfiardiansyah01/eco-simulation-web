import { expect, test } from '@playwright/test'
import { openLevelOne } from './support/mission'
import { mockSupabase } from './support/supabase'
import { markOnboardingDone } from './support/ui'

test.beforeEach(async ({ page }) => {
  await markOnboardingDone(page)
  await mockSupabase(page)
})

test('guest can navigate from home to gameplay and back', async ({ page }) => {
  await page.goto('/')
  await page.locator('a[href="/region"]').click()
  await expect(page).toHaveURL(/\/region$/)
  await expect(page.getByRole('heading', { name: 'Mode Petualangan' })).toBeVisible()

  await page.locator('a[href="/mission/west-java"]').click()
  await expect(page).toHaveURL(/\/mission\/west-java$/)
  await expect(page.getByText('Inisiatif Pembersihan Sungai')).toBeVisible()

  await page.locator('a[href="/briefing/west-java/1"]').click()
  await expect(page).toHaveURL(/\/briefing\/west-java\/1$/)
  await expect(page.getByText('Latar Belakang')).toBeVisible()

  await page.getByRole('button', { name: '▶ Mulai Simulasi' }).click()
  await expect(page).toHaveURL(/\/play\/west-java\/1\?difficulty=normal$/)
  await expect(page.getByTestId('action-plant_tree')).toBeVisible()

  await page.locator('a[href="/briefing/west-java/1?difficulty=normal"]').click()
  await expect(page).toHaveURL(/\/briefing\/west-java\/1\?difficulty=normal$/)
  await expect(page.getByText('Objektif Misi')).toBeVisible()
})

test('gameplay exit dialog can resume or leave for the menu', async ({ page }) => {
  await openLevelOne(page)
  const dialog = page.getByRole('dialog', { name: 'Keluar dari Simulasi?' })

  await page.getByTestId('exit-game').click()
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText('Progress misi yang belum selesai tidak akan disimpan.')
  ).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Kembali ke Briefing' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await page.getByTestId('exit-game').click()
  await dialog.getByRole('button', { name: 'Lanjut Bermain' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/play\/west-java\/1/)

  await page.getByTestId('exit-game').click()
  await dialog.getByRole('link', { name: 'Keluar ke Menu' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'VRASS' })).toBeVisible()
})

test('home tutorial can be reopened manually', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Selamat Datang di VRASS!')).not.toBeVisible()

  await page.getByRole('button', { name: '❓ Tutorial' }).click()
  await expect(page.getByText('Selamat Datang di VRASS!')).toBeVisible()
  await expect(page.getByText('1 / 8')).toBeVisible()

  await page.getByRole('button', { name: 'Lanjut →' }).click()
  await expect(page.getByText('Pilih Mode Petualangan')).toBeVisible()

  await page.getByRole('button', { name: '← Kembali' }).click()
  await page.getByRole('button', { name: 'Lewati' }).click()
  await expect(page.getByText('Pilih Mode Petualangan')).not.toBeVisible()
})
