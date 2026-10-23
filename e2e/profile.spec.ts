import { expect, test } from '@playwright/test'
import {
  mockSupabase,
  signIn,
  type AchievementRow,
} from './support/supabase'

const achievements: AchievementRow[] = [
  {
    id: 'tree-5',
    title: 'Tree Starter',
    description: 'Plant five trees',
    icon: '🌱',
    condition_type: 'trees_planted',
    condition_value: 5,
  },
  {
    id: 'mission-1',
    title: 'First Mission',
    description: 'Complete your first mission',
    icon: '🏅',
    condition_type: 'missions_completed',
    condition_value: 1,
  },
  {
    id: 'research-250',
    title: 'Researcher',
    description: 'Earn 250 research points',
    icon: '🔬',
    condition_type: 'research_points',
    condition_value: 250,
  },
]

test('signed-in profile shows unlocked and locked achievements', async ({ page }) => {
  await mockSupabase(page, {
    signedIn: true,
    achievements,
    userAchievements: [
      {
        achievement_id: 'tree-5',
        unlocked_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  })
  await signIn(page)
  await page.goto('/profile')

  await expect(page.getByRole('heading', { name: 'e2e' })).toBeVisible()
  await expect(page.getByText('1/3')).toBeVisible()
  await expect(page.getByText('33%').first()).toBeVisible()
  await expect(page.getByText('Recruit')).toBeVisible()
  await expect(page.getByText('Tree Starter')).toBeVisible()
  await expect(page.getByText('First Mission', { exact: true })).toBeVisible()
  await expect(page.getByText('✓ UNLOCK')).toHaveCount(1)
  await expect(page.getByText('🔒')).toHaveCount(2)
  await expect(page.getByText(/🗓/)).toBeVisible()
})

test('guest profile starts at zero and can reach Eco Master', async ({ page }) => {
  const guest = await mockSupabase(page, {
    signedIn: false,
    achievements,
    userAchievements: [],
  })
  await page.goto('/profile')

  await expect(page.getByRole('heading', { name: 'Player' })).toBeVisible()
  await expect(page.getByText('0/3')).toBeVisible()
  await expect(page.getByText('0%').first()).toBeVisible()
  await expect(page.getByText('Recruit')).toBeVisible()

  guest.setAchievements([achievements[0]])
  guest.setUserAchievements([
    { achievement_id: 'tree-5', unlocked_at: '2026-01-01T00:00:00.000Z' },
  ])
  await signIn(page)
  await page.goto('/profile')

  await expect(page.getByRole('heading', { name: 'e2e' })).toBeVisible()
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()
  await expect(page.getByText('100%').first()).toBeVisible()
  await expect(page.getByText('Eco Master')).toBeVisible()
  await expect(page.getByText('✓ UNLOCK')).toHaveCount(1)
})

test('empty achievement catalog shows a zero state', async ({ page }) => {
  await mockSupabase(page, {
    signedIn: true,
    achievements: [],
    userAchievements: [],
  })
  await signIn(page)
  await page.goto('/profile')

  await expect(page.getByText('0/0')).toBeVisible()
  await expect(page.getByText('0%').first()).toBeVisible()
  await expect(page.getByText('Daftar Achievement')).toBeVisible()
})
