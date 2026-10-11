import { createClient } from './client'
import { UserProgress } from '@/types'

export async function getProgress(regionId: string): Promise<UserProgress | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('region_id', regionId)
    .single()

  if (!data) return null
  return {
    userId: data.user_id,
    regionId: data.region_id,
    currentLevel: data.current_level,
    completedLevels: data.completed_levels ?? [],
    researchPoints: data.research_points,
    unlockedItems: data.unlocked_items ?? [],
  }
}

export async function saveProgress(
  regionId: string,
  update: Partial<Pick<UserProgress, 'currentLevel' | 'completedLevels' | 'researchPoints' | 'unlockedItems'>>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('user_progress').upsert({
    user_id: user.id,
    region_id: regionId,
    current_level: update.currentLevel,
    completed_levels: update.completedLevels,
    research_points: update.researchPoints,
    unlocked_items: update.unlockedItems,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,region_id' })
}

export async function saveMissionResult(
  regionId: string,
  level: number,
  result: { pollutionFinal: number; biodiversityFinal: number; treesPlanted: number; researchPointsEarned: number }
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('mission_results').insert({
    user_id: user.id,
    region_id: regionId,
    level,
    pollution_final: result.pollutionFinal,
    biodiversity_final: result.biodiversityFinal,
    trees_planted: result.treesPlanted,
    research_points_earned: result.researchPointsEarned,
  })
}
