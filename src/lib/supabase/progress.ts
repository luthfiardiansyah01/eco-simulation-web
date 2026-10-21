import { createClient } from './client'
import { mapUserProgress, type UserProgressRow } from './mappers'
import type { UserProgress } from '@/types'

export type MissionResultStats = {
  pollutionFinal: number
  biodiversityFinal: number
  treesPlanted: number
  researchPointsEarned: number
}

export type CompleteMissionResult =
  | { ok: true; progress: UserProgress }
  | { ok: false; reason: 'guest' | 'error'; message?: string }

/**
 * Persists a completed mission atomically:
 * - records/updates the mission result,
 * - merges the completed level into the player's region progress,
 * - accumulates research points (never resets them),
 * - only awards points the first time a level is completed.
 */
export async function completeMission(
  regionId: string,
  level: number,
  stats: MissionResultStats
): Promise<CompleteMissionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'guest' }

  const { data, error } = await supabase.rpc('complete_mission', {
    p_region_id: regionId,
    p_level: level,
    p_pollution: stats.pollutionFinal,
    p_biodiversity: stats.biodiversityFinal,
    p_trees: stats.treesPlanted,
    p_research_points: stats.researchPointsEarned,
  })

  if (error) {
    console.error('complete_mission failed', error)
    const message = error.code === 'PGRST202'
      ? 'Fungsi complete_mission belum tersedia. Jalankan migrasi Supabase.'
      : error.message
    return { ok: false, reason: 'error', message }
  }

  const row = (Array.isArray(data) ? data[0] : data) as UserProgressRow | null
  if (!row) {
    return { ok: false, reason: 'error', message: 'Progress tidak dikembalikan oleh server.' }
  }

  return { ok: true, progress: mapUserProgress(row) }
}
