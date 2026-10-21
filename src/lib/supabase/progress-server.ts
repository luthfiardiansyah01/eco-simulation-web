import { createClient } from './server'
import { mapUserProgress, type UserProgressRow } from './mappers'
import type { UserProgress } from '@/types'

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
  return mapUserProgress(data as UserProgressRow)
}

export async function getAllProgressServer(): Promise<UserProgress[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)

  return ((data ?? []) as UserProgressRow[]).map(mapUserProgress)
}
