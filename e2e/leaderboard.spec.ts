import { expect, test } from '@playwright/test'
import {
  mockSupabase,
  signIn,
  type LeaderboardRow,
} from './support/supabase'

const rows: LeaderboardRow[] = [
  {
    rank: 1,
    username: 'Ranger One',
    total_points: 1250,
    missions_completed: 5,
    achievements_count: 3,
    regions_count: 2,
    is_current_user: false,
  },
  {
    rank: 2,
    username: null,
    total_points: 900,
    missions_completed: 3,
    achievements_count: 1,
    regions_count: 1,
    is_current_user: false,
  },
  {
    rank: 4,
    username: 'Ranger Three',
    total_points: 600,
    missions_completed: 2,
    achievements_count: 1,
    regions_count: 1,
    is_current_user: false,
  },
]

test('guest sees the public ranking and a sign-in prompt', async ({ page }) => {
  const supabase = await mockSupabase(page, { leaderboard: rows })
  await page.goto('/leaderboard')

  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible()
  await expect(page.getByText('Kamu bermain sebagai tamu')).toBeVisible()
  await expect(page.getByText('Ranger One')).toBeVisible()
  await expect(page.getByText('1.250')).toBeVisible()
  await expect(page.getByText('Player', { exact: true })).toBeVisible()
  await expect(page.getByText('#4')).toBeVisible()
  await expect(page.getByText('KAMU', { exact: true })).not.toBeVisible()
  expect(supabase.leaderboardRequests).toBeGreaterThanOrEqual(1)
})

test('signed-in user sees their position and gap separator', async ({ page }) => {
  const currentUserRows: LeaderboardRow[] = [
    rows[0],
    {
      rank: 2,
      username: 'e2e',
      total_points: 800,
      missions_completed: 2,
      achievements_count: 1,
      regions_count: 1,
      is_current_user: true,
    },
    rows[2],
  ]
  await mockSupabase(page, { signedIn: true, leaderboard: currentUserRows })
  await signIn(page)
  await page.goto('/leaderboard')

  await expect(page.getByText('Kamu bermain sebagai tamu')).not.toBeVisible()
  await expect(page.getByText('Posisi kamu').first()).toBeVisible()
  await expect(page.getByText('#2').first()).toBeVisible()
  await expect(page.getByText('KAMU', { exact: true })).toBeVisible()
  await expect(page.getByText('•••')).toBeVisible()
})

test('leaderboard error can be retried and empty state is shown', async ({ page }) => {
  const supabase = await mockSupabase(page, {
    leaderboard: {
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.get_leaderboard',
      },
    },
  })
  await page.goto('/leaderboard')

  await expect(page.getByText('Leaderboard tidak tersedia')).toBeVisible()
  await expect(
    page.getByText(/Leaderboard belum aktif di server/)
  ).toBeVisible()

  supabase.setLeaderboard(rows)
  await page.getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.getByText('Ranger One')).toBeVisible()
  expect(supabase.leaderboardRequests).toBeGreaterThanOrEqual(2)

  await page.getByRole('button', { name: '↻ Segarkan' }).click()
  await expect(page.getByText('Ranger One')).toBeVisible()
  expect(supabase.leaderboardRequests).toBeGreaterThanOrEqual(3)

  supabase.setLeaderboard([])
  await page.getByRole('button', { name: '↻ Segarkan' }).click()
  await expect(page.getByText('Belum ada peneliti di leaderboard')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Masuk untuk bergabung' })
  ).toBeVisible()
})
