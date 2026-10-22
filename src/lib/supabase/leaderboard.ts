import { createClient } from './client'
import type { LeaderboardEntry } from '@/types'

type LeaderboardRow = {
  rank: number | string | null
  username: string | null
  total_points: number | string | null
  missions_completed: number | string | null
  achievements_count: number | string | null
  regions_count: number | string | null
  is_current_user: boolean | null
}

export type LeaderboardResult =
  | { ok: true; entries: LeaderboardEntry[] }
  | { ok: false; missing: boolean; message: string }

function mapEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    rank: Number(row.rank ?? 0),
    username: row.username ?? 'Player',
    totalPoints: Number(row.total_points ?? 0),
    missionsCompleted: Number(row.missions_completed ?? 0),
    achievementsCount: Number(row.achievements_count ?? 0),
    regionsCount: Number(row.regions_count ?? 0),
    isCurrentUser: row.is_current_user === true,
  }
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardResult> {
  const supabase = createClient()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)

  const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: safeLimit })

  if (error) {
    console.error('Failed to load leaderboard', error)
    const missing =
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      /could not find the function/i.test(error.message)

    return {
      ok: false,
      missing,
      message: missing
        ? 'Leaderboard belum aktif di server. Terapkan migration leaderboard terlebih dahulu.'
        : 'Gagal memuat leaderboard. Periksa koneksi lalu coba lagi.',
    }
  }

  return { ok: true, entries: ((data ?? []) as LeaderboardRow[]).map(mapEntry) }
}
