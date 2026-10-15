import { createClient } from './server'
import { UserProgress } from '@/types'

export async function getProgressServer(regionId: string): Promise<UserProgress | null> {
  const supabase = await createClient()
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

export async function getAllProgressServer(): Promise<UserProgress[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)

  return (data ?? []).map((d) => ({
    userId: d.user_id,
    regionId: d.region_id,
    currentLevel: d.current_level,
    completedLevels: d.completed_levels ?? [],
    researchPoints: d.research_points,
    unlockedItems: d.unlocked_items ?? [],
  }))
}
