import { expect, test } from '@playwright/test'
import { completeLevelOne, openLevelOne } from './support/mission'
import { mockSupabase, signIn } from './support/supabase'

test('signed-in completion saves all final metrics', async ({ page }) => {
  const supabase = await mockSupabase(page)

  await signIn(page)
  await openLevelOne(page)
  await completeLevelOne(page)

  await expect(page.getByTestId('mission-complete')).toBeVisible()
  await expect(page.getByText('✓ Progress tersimpan!')).toBeVisible()
  await expect(page.getByTestId('save-error')).toBeHidden()

  expect(supabase.rpcRequests).toHaveLength(1)
  expect(supabase.rpcRequests[0]).toEqual({
    p_region_id: 'west-java',
    p_level: 1,
    p_pollution: 18,
    p_biodiversity: 76,
    p_water_quality: 47,
    p_fish_population: 64,
    p_trees: 50,
    p_drones: 3,
  })
})

test('rate-limited completion shows retry/reset and retries successfully', async ({ page }) => {
  const supabase = await mockSupabase(page, 'rate_limited')

  await signIn(page)
  await openLevelOne(page)
  await completeLevelOne(page)

  await expect(page.getByTestId('mission-complete')).toBeVisible()
  await expect(page.getByTestId('save-error')).toContainText(
    'Batas penyelesaian misi tercapai'
  )
  await expect(page.getByRole('button', { name: /Coba Simpan Lagi/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Reset Misi/ })).toBeVisible()
  expect(supabase.rpcRequests).toHaveLength(1)

  supabase.setRpcScenario('success')
  await page.getByRole('button', { name: /Coba Simpan Lagi/ }).click()

  await expect(page.getByText('✓ Progress tersimpan!')).toBeVisible()
  await expect(page.getByTestId('save-error')).toBeHidden()
  expect(supabase.rpcRequests).toHaveLength(2)
})
