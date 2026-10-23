import { expect, test } from '@playwright/test'
import { mockSupabase } from './support/supabase'

test('login shows Supabase errors without leaving the page', async ({ page }) => {
  await mockSupabase(page, {
    signInError: { message: 'Invalid login credentials' },
  })
  await page.goto('/login')

  await page.locator('input[type="email"]').fill('e2e@example.com')
  await page.locator('input[type="password"]').fill('wrong-password')
  await page.getByRole('button', { name: '▶ Masuk' }).click()

  await expect(page.getByText(/Invalid login credentials/)).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('sign-up asks for email confirmation when no session is issued', async ({
  page,
}) => {
  await mockSupabase(page, { signUpSession: false })
  await page.goto('/login')

  await page.getByRole('button', { name: 'Daftar' }).click()
  await expect(page.getByText('Buat akun baru')).toBeVisible()
  await page.locator('input[type="email"]').fill('new-ranger@example.com')
  await page.locator('input[type="password"]').fill('new-password')
  await page.getByRole('button', { name: '🌱 Buat Akun' }).click()

  await expect(page.getByRole('status')).toContainText('Akun dibuat. Cek email kamu')
  await expect(page.getByRole('button', { name: '▶ Masuk' })).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('forgot-password requests a code and can go back to the email step', async ({
  page,
}) => {
  await mockSupabase(page)
  await page.goto('/forgot-password')

  await page.locator('input[type="email"]').fill('E2E@Example.com')
  await page.getByRole('button', { name: /Kirim Kode Verifikasi/ }).click()

  await expect(page.getByText('Masukkan kode verifikasi')).toBeVisible()
  await expect(page.getByRole('status')).toContainText(
    'Kode verifikasi 6 digit telah dikirim'
  )
  await expect(page.getByText('e2e@example.com', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Kirim ulang dalam \d+ detik/ })
  ).toBeDisabled()

  await page.getByRole('button', { name: 'Ubah email' }).click()
  await expect(page.getByText('Pulihkan akses ke akunmu')).toBeVisible()
  await expect(page.getByPlaceholder('000000')).not.toBeVisible()
})

test('forgot-password surfaces friendly request and verification errors', async ({
  page,
}) => {
  const supabase = await mockSupabase(page, {
    recoverError: { message: 'Email rate limit exceeded' },
  })
  await page.goto('/forgot-password')

  await page.locator('input[type="email"]').fill('e2e@example.com')
  await page.getByRole('button', { name: /Kirim Kode Verifikasi/ }).click()
  await expect(
    page.getByText(/Terlalu banyak percobaan\. Tunggu sebentar lalu coba lagi\./)
  ).toBeVisible()

  supabase.setSignedIn(false)
  await page.goto('/forgot-password')
  await mockSupabase(page, {
    verifyError: { message: 'Token has expired' },
  })
  await page.locator('input[type="email"]').fill('e2e@example.com')
  await page.getByRole('button', { name: /Kirim Kode Verifikasi/ }).click()
  await page.getByPlaceholder('000000').fill('123456')
  await page.getByRole('button', { name: /Verifikasi Kode/ }).click()

  await expect(
    page.getByText(/Kode tidak valid atau sudah kedaluwarsa\. Coba kirim ulang kode\./)
  ).toBeVisible()
})

test('recovery page explains missing, expired, and cross-browser links', async ({
  page,
}) => {
  await mockSupabase(page, { signedIn: false })

  await page.goto('/auth/recovery')
  await expect(
    page.getByRole('heading', { name: 'Tautan reset tidak dapat digunakan' })
  ).toBeVisible()
  await expect(
    page.getByText(/Tautan reset tidak memuat token yang valid/)
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Minta Kode Baru' })).toHaveAttribute(
    'href',
    '/forgot-password'
  )
  await expect(page.getByRole('link', { name: '← Kembali ke Masuk' })).toHaveAttribute(
    'href',
    '/login'
  )

  await page.goto('/auth/recovery?error=invalid_grant')
  await expect(
    page.getByText(/Tautan reset tidak valid atau sudah kedaluwarsa/)
  ).toBeVisible()

  await page.goto('/auth/recovery?error=code%20verifier')
  await expect(
    page.getByText(/Tautan reset harus dibuka di browser yang sama/)
  ).toBeVisible()
})
