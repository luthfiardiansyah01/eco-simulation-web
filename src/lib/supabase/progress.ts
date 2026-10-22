import { createClient } from './client'
import { mapUserProgress, type UserProgressRow } from './mappers'
import type { UserProgress } from '@/types'

export type MissionResultStats = {
  pollutionFinal: number
  biodiversityFinal: number
  waterQualityFinal: number
  fishPopulationFinal: number
  treesPlanted: number
  dronesDeployed: number
}

export type CompleteMissionResult =
  | { ok: true; progress: UserProgress }
  | {
      ok: false
      reason: 'guest' | 'rate_limited' | 'invalid_progress' | 'error'
      message?: string
    }

/**
 * Persists a completed mission atomically:
 * - records/updates the mission result,
 * - merges the completed level into the player's region progress,
 * - accumulates research points (never resets them),
 * - only awards points the first time a level is completed.
 *
 * The server validates the submitted objectives, derives the reward from its
 * mission catalog, and rate-limits first-time completions.
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
    p_water_quality: stats.waterQualityFinal,
    p_fish_population: stats.fishPopulationFinal,
    p_trees: stats.treesPlanted,
    p_drones: stats.dronesDeployed,
  })

  if (error) {
    console.error('complete_mission failed', error)
    const message = error.message ?? ''

    if (error.code === 'P0001' && /rate limit/i.test(message)) {
      return {
        ok: false,
        reason: 'rate_limited',
        message: 'Batas penyelesaian misi tercapai. Tunggu sebentar sebelum menyelesaikan misi berikutnya.',
      }
    }

    if (error.code === 'P0001' && /objective|not met/i.test(message)) {
      return {
        ok: false,
        reason: 'invalid_progress',
        message: 'Progress misi tidak valid. Reset misi lalu selesaikan semua objektif sebelum menyimpan.',
      }
    }

    const friendlyMessage = error.code === 'PGRST202'
      ? 'Fungsi complete_mission belum tersedia. Jalankan migrasi Supabase.'
      : message
    return { ok: false, reason: 'error', message: friendlyMessage }
  }

  const row = (Array.isArray(data) ? data[0] : data) as UserProgressRow | null
  if (!row) {
    return { ok: false, reason: 'error', message: 'Progress tidak dikembalikan oleh server.' }
  }

  return { ok: true, progress: mapUserProgress(row) }
}
