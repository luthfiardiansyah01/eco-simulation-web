import { expect, test } from '@playwright/test'

test('settings shows the default appearance, audio, language, and notifications', async ({
  page,
}) => {
  await page.goto('/settings')

  await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Gelap/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(
    page.getByRole('button', { name: /Bahasa Indonesia/ })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#volume')).toHaveValue('70')
  await expect(page.locator('#volume')).toHaveAttribute('aria-valuetext', '70%')
  await expect(page.getByRole('switch', { name: 'Notifikasi' })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await expect(page.getByText('Aktif', { exact: true })).toBeVisible()
})

test('appearance and language choices persist across reloads', async ({ page }) => {
  await page.goto('/settings')

  await page.getByRole('button', { name: /Terang/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(
    page.getByRole('button', { name: /Terang/ })
  ).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /English/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByText('Manage appearance, audio, language, and notifications')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('button', { name: /English/ })
  ).toHaveAttribute('aria-pressed', 'true')

  expect(await page.evaluate(() => localStorage.getItem('ecosim_theme'))).toBe('light')
  expect(await page.evaluate(() => localStorage.getItem('ecosim_language'))).toBe('en')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(
    page.getByRole('button', { name: /Light/ })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: /English/ })
  ).toHaveAttribute('aria-pressed', 'true')
})

test('volume, mute, and notification controls update the device preferences', async ({
  page,
}) => {
  await page.goto('/settings')

  await page.locator('#volume').evaluate((element) => {
    const input = element as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set
    setter?.call(input, '40')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.locator('#volume')).toHaveValue('40')
  await expect(page.locator('#volume')).toHaveAttribute('aria-valuetext', '40%')
  expect(await page.evaluate(() => localStorage.getItem('ecosim_volume'))).toBe('40')

  await page.getByRole('button', { name: '🔊 Bisukan semua suara' }).click()
  await expect(
    page.getByRole('button', { name: '🔇 Aktifkan suara' })
  ).toBeVisible()
  await expect(page.getByText('Suara sedang dibisukan.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Uji suara/ })).toBeDisabled()
  expect(await page.evaluate(() => localStorage.getItem('ecosim_sound_muted'))).toBe('1')

  await page.getByRole('button', { name: '🔇 Aktifkan suara' }).click()
  await expect(
    page.getByRole('button', { name: '🔊 Bisukan semua suara' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /Uji suara/ })).toBeEnabled()
  expect(await page.evaluate(() => localStorage.getItem('ecosim_sound_muted'))).toBe('0')

  const toggle = page.getByRole('switch', { name: 'Notifikasi' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('Nonaktif', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Tampilkan notifikasi uji/ })
  ).toBeDisabled()
  expect(await page.evaluate(() => localStorage.getItem('ecosim_notifications'))).toBe('0')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Aktif', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Notifikasi pengaturan')
  expect(await page.evaluate(() => localStorage.getItem('ecosim_notifications'))).toBe('1')
})
