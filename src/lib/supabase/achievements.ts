import { createClient } from './client'
import type { Achievement, AchievementCondition, UserAchievement } from '@/types'

type AchievementRow = {
  id: string
  title: string
  description: string
  icon: string
  condition_type: AchievementCondition
  condition_value: number
}

function mapAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    conditionType: row.condition_type,
    conditionValue: row.condition_value,
  }
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('condition_type')
    .order('condition_value', { ascending: true })

  if (error) {
    console.error('Failed to load achievements', error)
    return []
  }
  return ((data ?? []) as AchievementRow[]).map(mapAchievement)
}

export async function getUserAchievements(): Promise<UserAchievement[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', user.id)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('Failed to load user achievements', error)
    return []
  }

  return (data ?? []).map((d) => ({
    achievementId: d.achievement_id,
    unlockedAt: d.unlocked_at,
  }))
}

export type AchievementStats = {
  treesPlanted: number
  pollutionLevel: number
  missionsCompleted: number
  researchPoints: number
}

function isConditionMet(achievement: Achievement, stats: AchievementStats): boolean {
  switch (achievement.conditionType) {
    case 'trees_planted':
      return stats.treesPlanted >= achievement.conditionValue
    case 'pollution_below':
      return stats.pollutionLevel <= achievement.conditionValue
    case 'missions_completed':
      return stats.missionsCompleted >= achievement.conditionValue
    case 'research_points':
      return stats.researchPoints >= achievement.conditionValue
    default:
      return false
  }
}

/**
 * Evaluates every locked achievement against the player's cumulative stats
 * and inserts all newly earned rows in one request.
 */
export async function checkAndUnlockAchievements(stats: AchievementStats): Promise<Achievement[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [allResult, unlockedResult] = await Promise.all([
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
  ])

  if (allResult.error) {
    console.error('Failed to evaluate achievements', allResult.error)
    return []
  }
  if (unlockedResult.error) {
    console.error('Failed to load unlocked achievements', unlockedResult.error)
    return []
  }

  const unlockedIds = new Set((unlockedResult.data ?? []).map((d) => d.achievement_id))
  const newlyUnlocked = ((allResult.data ?? []) as AchievementRow[])
    .map(mapAchievement)
    .filter((achievement) => !unlockedIds.has(achievement.id) && isConditionMet(achievement, stats))

  if (newlyUnlocked.length === 0) return []

  const { error } = await supabase
    .from('user_achievements')
    .upsert(
      newlyUnlocked.map((achievement) => ({
        user_id: user.id,
        achievement_id: achievement.id,
      })),
      { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('Failed to unlock achievements', error)
    return []
  }

  return newlyUnlocked
}
