import { createClient } from './client'
import { Achievement, UserAchievement } from '@/types'

export async function getAllAchievements(): Promise<Achievement[]> {
  const supabase = createClient()
  const { data } = await supabase.from('achievements').select('*')
  return (data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    icon: d.icon,
    conditionType: d.condition_type,
    conditionValue: d.condition_value,
  }))
}

export async function getUserAchievements(): Promise<UserAchievement[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', user.id)

  return (data ?? []).map((d) => ({
    achievementId: d.achievement_id,
    unlockedAt: d.unlocked_at,
  }))
}

export async function unlockAchievement(achievementId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: user.id, achievement_id: achievementId })

  return !error
}

export async function checkAndUnlockAchievements(stats: {
  treesPlanted: number
  pollutionLevel: number
  missionsCompleted: number
  researchPoints: number
}): Promise<Achievement[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [allData, unlockedData] = await Promise.all([
    supabase.from('achievements').select('*'),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
  ])

  const all: Achievement[] = (allData.data ?? []).map((d) => ({
    id: d.id, title: d.title, description: d.description, icon: d.icon,
    conditionType: d.condition_type, conditionValue: d.condition_value,
  }))
  const unlockedIds = new Set((unlockedData.data ?? []).map((d) => d.achievement_id))

  const newlyUnlocked: Achievement[] = []

  for (const a of all) {
    if (unlockedIds.has(a.id)) continue

    let met = false
    if (a.conditionType === 'trees_planted') met = stats.treesPlanted >= a.conditionValue
    else if (a.conditionType === 'pollution_below') met = stats.pollutionLevel <= a.conditionValue
    else if (a.conditionType === 'missions_completed') met = stats.missionsCompleted >= a.conditionValue
    else if (a.conditionType === 'research_points') met = stats.researchPoints >= a.conditionValue

    if (met) {
      const unlocked = await unlockAchievement(a.id)
      if (unlocked) newlyUnlocked.push(a)
    }
  }

  return newlyUnlocked
}
