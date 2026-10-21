import type { UserProgress } from '@/types'

export type UserProgressRow = {
  user_id: string
  region_id: string
  current_level: number | null
  completed_levels: number[] | null
  research_points: number | null
  unlocked_items: string[] | null
}

export function mapUserProgress(row: UserProgressRow): UserProgress {
  return {
    userId: row.user_id,
    regionId: row.region_id,
    currentLevel: row.current_level ?? 1,
    completedLevels: row.completed_levels ?? [],
    researchPoints: row.research_points ?? 0,
    unlockedItems: row.unlocked_items ?? [],
  }
}
