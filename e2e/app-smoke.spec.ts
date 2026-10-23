import { expect, test } from '@playwright/test'
import { mockSupabase } from './support/supabase'
import { gotoApp, markOnboardingDone } from './support/ui'

test.beforeEach(async ({ page }) => {
  await markOnboardingDone(page)
  await mockSupabase(page)
})

test('home, region, mission, briefing, and gameplay pages render', async ({ page }) => {
  await gotoApp(page, '/')
  await expect(page.getByRole('heading', { name: 'VRASS' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Mode Petualangan/ })).toBeVisible()
  await expect(page.getByText('Jelajah Bebas Klasik')).toBeVisible()
  await expect(page.getByRole('link', { name: /Leaderboard/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Pengaturan/ })).toBeVisible()

  await gotoApp(page, '/region')
  await expect(page.getByRole('heading', { name: 'Mode Petualangan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jawa Barat' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jawa Tengah' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jawa Timur' })).toBeVisible()
  await expect(page.getByText('0/10 misi').first()).toBeVisible()
  await expect(page.getByRole('button', { name: '🔒 Terkunci' })).toHaveCount(2)

  await gotoApp(page, '/mission/west-java')
  await expect(page.getByRole('heading', { name: 'Jawa Barat' })).toBeVisible()
  await expect(page.getByText('Inisiatif Pembersihan Sungai')).toBeVisible()
  await expect(page.getByText(/Masuk untuk menyimpan progress/)).toBeVisible()
  await expect(page.getByText('TERKUNCI')).toHaveCount(9)

  await gotoApp(page, '/briefing/west-java/1')
  await expect(
    page.getByRole('heading', { name: 'Inisiatif Pembersihan Sungai' })
  ).toBeVisible()
  await expect(page.getByText('Objektif Misi')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hadiah' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tingkat kesulitan' })).toBeVisible()
  await expect(page.locator('a[aria-current="true"]')).toContainText('Normal')
  await expect(page.getByRole('link', { name: /Mulai Simulasi/ })).toBeVisible()

  await gotoApp(page, '/play/west-java/1?difficulty=normal')
  await expect(page.getByTestId('action-clean_waste')).toBeVisible()
  await expect(page.getByTestId('env-pollution')).toHaveText('78%')
  await expect(page.getByTestId('mission-progress')).toHaveText('35%')
})

test('legal, auth, leaderboard, profile, and settings pages render', async ({ page }) => {
  await gotoApp(page, '/privacy')
  await expect(page.getByRole('heading', { name: 'Kebijakan Privasi' })).toBeVisible()
  await expect(
    page.getByText('VRASS — Virtual River Awareness Simulation System', {
      exact: true,
    })
  ).toBeVisible()

  await gotoApp(page, '/login')
  await expect(page.getByText('Masuk untuk melanjutkan')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lupa password?' })).toBeVisible()

  await gotoApp(page, '/forgot-password')
  await expect(page.getByText('Pulihkan akses ke akunmu')).toBeVisible()

  await gotoApp(page, '/settings')
  await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Notifikasi' })).toBeVisible()

  await gotoApp(page, '/leaderboard')
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()
  await expect(page.getByText('Belum ada peneliti di leaderboard')).toBeVisible()

  await gotoApp(page, '/profile')
  await expect(page.getByRole('heading', { name: 'Player' })).toBeVisible()
  await expect(page.getByText('0/0')).toBeVisible()
  await expect(page.getByText('Daftar Pencapaian')).toBeVisible()
})

test('unknown routes and unknown missions return 404', async ({ page }) => {
  const missing = await gotoApp(page, '/halaman-yang-tidak-ada')
  expect(missing?.status()).toBe(404)

  // Dynamic app-router notFound() responses are streamed after the shell in
  // dev, so their HTTP status can be 200 even though the 404 UI is rendered.
  await gotoApp(page, '/mission/not-a-region')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()

  await gotoApp(page, '/briefing/west-java/999')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()

  await gotoApp(page, '/play/west-java/999')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})

test('auth routes redirect failures and display query messages', async ({ page }) => {
  await page.goto('/auth/callback')
  await page.waitForURL('**/login?error=auth_callback_failed')
  await expect(
    page.getByText(/Konfirmasi email gagal atau tautan sudah kedaluwarsa/)
  ).toBeVisible()

  await page.goto('/auth/confirm')
  await page.waitForURL('**/login?error=auth_callback_failed')
  await expect(
    page.getByText(/Konfirmasi email gagal atau tautan sudah kedaluwarsa/)
  ).toBeVisible()

  await page.goto('/login?message=password_updated')
  await expect(page.getByRole('status')).toContainText('Password berhasil diperbarui')

  await page.goto('/forgot-password?error=invalid_code')
  await expect(page.getByText(/Tautan atau kode reset tidak valid/)).toBeVisible()

  await page.goto('/forgot-password?error=session_missing')
  await expect(page.getByText(/Sesi reset tidak ditemukan/)).toBeVisible()
})
