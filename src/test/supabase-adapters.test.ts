import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { mapUserProgress } from '@/lib/supabase/mappers'
import { getLeaderboard } from '@/lib/supabase/leaderboard'
import { completeMission } from '@/lib/supabase/progress'
import {
  checkAndUnlockAchievements,
  getAllAchievements,
  getUserAchievements,
} from '@/lib/supabase/achievements'
import {
  getAllProgressServer,
  getProgressServer,
} from '@/lib/supabase/progress-server'

const browserCreate = vi.mocked(createBrowserClient)
const serverCreate = vi.mocked(createServerClient)

type QueryResult = { data: unknown; error: unknown }

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    upsert: vi.fn(() => Promise.resolve(result)),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

function browserClient(options: {
  user?: unknown
  rpc?: QueryResult
  from?: (table: string) => unknown
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user ?? null } }),
    },
    rpc: vi.fn().mockResolvedValue(options.rpc ?? { data: null, error: null }),
    from: vi.fn(options.from ?? (() => query({ data: [], error: null }))),
  }
}

function serverClient(options: {
  user?: unknown
  from?: (table: string) => unknown
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user ?? null } }),
    },
    from: vi.fn(options.from ?? (() => query({ data: [], error: null }))),
  }
}

const stats = {
  pollutionFinal: 10,
  biodiversityFinal: 70,
  waterQualityFinal: 80,
  fishPopulationFinal: 90,
  treesPlanted: 50,
  dronesDeployed: 5,
}

const progressRow = {
  user_id: 'user-1',
  region_id: 'west-java',
  current_level: 2,
  completed_levels: [1],
  research_points: 250,
  unlocked_items: ['filter'],
}

beforeEach(() => {
  browserCreate.mockReset()
  serverCreate.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('mapUserProgress', () => {
  it('maps snake_case rows and applies null defaults', () => {
    expect(mapUserProgress(progressRow)).toEqual({
      userId: 'user-1',
      regionId: 'west-java',
      currentLevel: 2,
      completedLevels: [1],
      researchPoints: 250,
      unlockedItems: ['filter'],
    })

    expect(
      mapUserProgress({
        user_id: 'user-2',
        region_id: 'east-java',
        current_level: null,
        completed_levels: null,
        research_points: null,
        unlocked_items: null,
      })
    ).toEqual({
      userId: 'user-2',
      regionId: 'east-java',
      currentLevel: 1,
      completedLevels: [],
      researchPoints: 0,
      unlockedItems: [],
    })
  })
})

describe('getLeaderboard', () => {
  it('maps rows and clamps the limit', async () => {
    const client = browserClient({
      rpc: {
        data: [
          {
            rank: '1',
            username: null,
            total_points: '900',
            missions_completed: '4',
            achievements_count: null,
            regions_count: '2',
            is_current_user: true,
          },
          {
            rank: null,
            username: 'Ranger',
            total_points: null,
            missions_completed: null,
            achievements_count: '3',
            regions_count: null,
            is_current_user: null,
          },
        ],
        error: null,
      },
    })
    browserCreate.mockReturnValue(client as never)

    const result = await getLeaderboard(500)

    expect(client.rpc).toHaveBeenCalledWith('get_leaderboard', { p_limit: 100 })
    expect(result).toEqual({
      ok: true,
      entries: [
        {
          rank: 1,
          username: 'Player',
          totalPoints: 900,
          missionsCompleted: 4,
          achievementsCount: 0,
          regionsCount: 2,
          isCurrentUser: true,
        },
        {
          rank: 0,
          username: 'Ranger',
          totalPoints: 0,
          missionsCompleted: 0,
          achievementsCount: 3,
          regionsCount: 0,
          isCurrentUser: false,
        },
      ],
    })

    await getLeaderboard(0)
    expect(client.rpc).toHaveBeenLastCalledWith('get_leaderboard', { p_limit: 1 })
    await getLeaderboard(2.9)
    expect(client.rpc).toHaveBeenLastCalledWith('get_leaderboard', { p_limit: 2 })
    await getLeaderboard()
    expect(client.rpc).toHaveBeenLastCalledWith('get_leaderboard', { p_limit: 50 })
  })

  it.each(['PGRST202', '42883'] as const)(
    'reports a missing migration for %s',
    async (code) => {
    browserCreate.mockReturnValue(
      browserClient({
        rpc: { data: null, error: { code, message: 'nope' } },
      }) as never
    )
    const result = await getLeaderboard()
    expect(result).toEqual({
      ok: false,
      missing: true,
      message:
        'Leaderboard belum aktif di server. Terapkan migration leaderboard terlebih dahulu.',
    })
  })

  it('detects missing functions by message and hides other errors', async () => {
    browserCreate.mockReturnValue(
      browserClient({
        rpc: {
          data: null,
          error: { code: 'XX000', message: 'Could not find the function public.get_leaderboard' },
        },
      }) as never
    )
    expect(await getLeaderboard()).toMatchObject({ ok: false, missing: true })

    browserCreate.mockReturnValue(
      browserClient({
        rpc: { data: null, error: { code: 'XX000', message: 'network down' } },
      }) as never
    )
    expect(await getLeaderboard()).toEqual({
      ok: false,
      missing: false,
      message: 'Gagal memuat leaderboard. Periksa koneksi lalu coba lagi.',
    })
  })

  it('returns an empty list when the RPC has no data', async () => {
    browserCreate.mockReturnValue(
      browserClient({ rpc: { data: null, error: null } }) as never
    )
    expect(await getLeaderboard()).toEqual({ ok: true, entries: [] })
  })
})

describe('completeMission', () => {
  it('returns guest without calling the RPC', async () => {
    const client = browserClient({ user: null })
    browserCreate.mockReturnValue(client as never)

    expect(await completeMission('west-java', 1, stats)).toEqual({
      ok: false,
      reason: 'guest',
    })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('sends mission stats and maps object and array responses', async () => {
    const client = browserClient({
      user: { id: 'user-1' },
      rpc: { data: progressRow, error: null },
    })
    browserCreate.mockReturnValue(client as never)

    expect(await completeMission('west-java', 1, stats)).toEqual({
      ok: true,
      progress: {
        userId: 'user-1',
        regionId: 'west-java',
        currentLevel: 2,
        completedLevels: [1],
        researchPoints: 250,
        unlockedItems: ['filter'],
      },
    })
    expect(client.rpc).toHaveBeenCalledWith('complete_mission', {
      p_region_id: 'west-java',
      p_level: 1,
      p_pollution: 10,
      p_biodiversity: 70,
      p_water_quality: 80,
      p_fish_population: 90,
      p_trees: 50,
      p_drones: 5,
    })

    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        rpc: { data: [progressRow], error: null },
      }) as never
    )
    expect(await completeMission('west-java', 1, stats)).toMatchObject({ ok: true })
  })

  it('maps rate-limit and invalid-progress RPC failures', async () => {
    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        rpc: {
          data: null,
          error: { code: 'P0001', message: 'Mission completion rate limit exceeded' },
        },
      }) as never
    )
    expect(await completeMission('west-java', 1, stats)).toMatchObject({
      ok: false,
      reason: 'rate_limited',
    })

    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        rpc: {
          data: null,
          error: { code: 'P0001', message: 'Mission objective not met: pollution 90' },
        },
      }) as never
    )
    expect(await completeMission('west-java', 1, stats)).toMatchObject({
      ok: false,
      reason: 'invalid_progress',
    })
  })

  it('maps migration, generic, and empty responses', async () => {
    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        rpc: { data: null, error: { code: 'PGRST202', message: 'missing function' } },
      }) as never
    )
    expect(await completeMission('west-java', 1, stats)).toEqual({
      ok: false,
      reason: 'error',
      message: 'Fungsi complete_mission belum tersedia. Jalankan migrasi Supabase.',
    })

    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        rpc: { data: null, error: { code: 'XX000', message: 'network down' } },
      }) as never
    )
    expect(await completeMission('west-java', 1, stats)).toEqual({
      ok: false,
      reason: 'error',
      message: 'network down',
    })

    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        rpc: { data: null, error: null },
      }) as never
    )
    expect(await completeMission('west-java', 1, stats)).toEqual({
      ok: false,
      reason: 'error',
      message: 'Progress tidak dikembalikan oleh server.',
    })
  })
})

describe('achievements', () => {
  const achievementRows = [
    {
      id: 'tree-5',
      title: 'Tree Starter',
      description: 'Plant five trees',
      icon: '🌱',
      condition_type: 'trees_planted',
      condition_value: 5,
    },
    {
      id: 'clean-air',
      title: 'Clean Air',
      description: 'Keep pollution below 20',
      icon: '🌤️',
      condition_type: 'pollution_below',
      condition_value: 20,
    },
    {
      id: 'mission-1',
      title: 'First Mission',
      description: 'Complete a mission',
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

  it('loads and maps achievements, including error fallback', async () => {
    const achievementsQuery = query({ data: achievementRows, error: null })
    browserCreate.mockReturnValue(
      browserClient({ from: () => achievementsQuery }) as never
    )

    expect(await getAllAchievements()).toEqual([
      {
        id: 'tree-5',
        title: 'Tree Starter',
        description: 'Plant five trees',
        icon: '🌱',
        conditionType: 'trees_planted',
        conditionValue: 5,
      },
      expect.objectContaining({ id: 'clean-air' }),
      expect.objectContaining({ id: 'mission-1' }),
      expect.objectContaining({ id: 'research-250' }),
    ])
    expect(achievementsQuery.order).toHaveBeenCalledWith('condition_type')
    expect(achievementsQuery.order).toHaveBeenCalledWith('condition_value', { ascending: true })

    browserCreate.mockReturnValue(
      browserClient({
        from: () => query({ data: null, error: { message: 'db down' } }),
      }) as never
    )
    expect(await getAllAchievements()).toEqual([])
  })

  it('loads user achievements only for signed-in users', async () => {
    browserCreate.mockReturnValue(browserClient({ user: null }) as never)
    expect(await getUserAchievements()).toEqual([])

    const unlockedQuery = query({
      data: [{ achievement_id: 'tree-5', unlocked_at: '2026-01-01T00:00:00.000Z' }],
      error: null,
    })
    const client = browserClient({ user: { id: 'user-1' }, from: () => unlockedQuery })
    browserCreate.mockReturnValue(client as never)

    expect(await getUserAchievements()).toEqual([
      { achievementId: 'tree-5', unlockedAt: '2026-01-01T00:00:00.000Z' },
    ])
    expect(unlockedQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')

    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        from: () => query({ data: null, error: { message: 'db down' } }),
      }) as never
    )
    expect(await getUserAchievements()).toEqual([])
  })

  it('does not evaluate achievements for guests', async () => {
    const client = browserClient({ user: null })
    browserCreate.mockReturnValue(client as never)
    expect(
      await checkAndUnlockAchievements({
        treesPlanted: 10,
        pollutionLevel: 5,
        missionsCompleted: 2,
        researchPoints: 600,
      })
    ).toEqual([])
    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns early when achievement queries fail', async () => {
    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        from: () => query({ data: null, error: { message: 'down' } }),
      }) as never
    )
    expect(
      await checkAndUnlockAchievements({
        treesPlanted: 10,
        pollutionLevel: 5,
        missionsCompleted: 2,
        researchPoints: 600,
      })
    ).toEqual([])
  })

  it('unlocks only newly earned achievements and upserts once', async () => {
    const achievementsQuery = query({ data: achievementRows, error: null })
    const unlockedQuery = query({
      data: [{ achievement_id: 'research-250' }],
      error: null,
    })
    const upsertQuery = query({ data: null, error: null })
    let userAchievementCalls = 0

    const client = browserClient({
      user: { id: 'user-1' },
      from: (table) => {
        if (table === 'achievements') return achievementsQuery
        userAchievementCalls += 1
        return userAchievementCalls === 1 ? unlockedQuery : upsertQuery
      },
    })
    browserCreate.mockReturnValue(client as never)

    const unlocked = await checkAndUnlockAchievements({
      treesPlanted: 10,
      pollutionLevel: 10,
      missionsCompleted: 2,
      researchPoints: 500,
    })

    expect(unlocked.map((item) => item.id)).toEqual([
      'tree-5',
      'clean-air',
      'mission-1',
    ])
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      [
        { user_id: 'user-1', achievement_id: 'tree-5' },
        { user_id: 'user-1', achievement_id: 'clean-air' },
        { user_id: 'user-1', achievement_id: 'mission-1' },
      ],
      { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
    )
  })

  it('returns an empty list when nothing new is earned or the upsert fails', async () => {
    const achievementsQuery = query({ data: achievementRows, error: null })
    const unlockedQuery = query({
      data: achievementRows.map((row) => ({ achievement_id: row.id })),
      error: null,
    })
    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        from: (table) => (table === 'achievements' ? achievementsQuery : unlockedQuery),
      }) as never
    )
    expect(
      await checkAndUnlockAchievements({
        treesPlanted: 10,
        pollutionLevel: 5,
        missionsCompleted: 2,
        researchPoints: 600,
      })
    ).toEqual([])

    const failedUpsert = query({ data: null, error: { message: 'insert failed' } })
    let calls = 0
    browserCreate.mockReturnValue(
      browserClient({
        user: { id: 'user-1' },
        from: (table) => {
          if (table === 'achievements') return achievementsQuery
          calls += 1
          return calls === 1
            ? query({ data: [], error: null })
            : failedUpsert
        },
      }) as never
    )
    expect(
      await checkAndUnlockAchievements({
        treesPlanted: 10,
        pollutionLevel: 5,
        missionsCompleted: 2,
        researchPoints: 600,
      })
    ).toEqual([])
  })
})

describe('server progress', () => {
  it('returns null without a user', async () => {
    serverCreate.mockResolvedValue(serverClient({ user: null }) as never)
    expect(await getProgressServer('west-java')).toBeNull()
  })

  it('maps a single progress row and handles an empty result', async () => {
    const progressQuery = query({ data: progressRow, error: null })
    serverCreate.mockResolvedValue(
      serverClient({ user: { id: 'user-1' }, from: () => progressQuery }) as never
    )
    expect(await getProgressServer('west-java')).toMatchObject({
      userId: 'user-1',
      completedLevels: [1],
    })
    expect(progressQuery.eq).toHaveBeenCalledWith('region_id', 'west-java')
    expect(progressQuery.single).toHaveBeenCalled()

    serverCreate.mockResolvedValue(
      serverClient({
        user: { id: 'user-1' },
        from: () => query({ data: null, error: null }),
      }) as never
    )
    expect(await getProgressServer('west-java')).toBeNull()
  })

  it('returns all progress rows for signed-in users', async () => {
    serverCreate.mockResolvedValue(serverClient({ user: null }) as never)
    expect(await getAllProgressServer()).toEqual([])

    serverCreate.mockResolvedValue(
      serverClient({
        user: { id: 'user-1' },
        from: () => query({ data: [progressRow], error: null }),
      }) as never
    )
    expect(await getAllProgressServer()).toEqual([
      {
        userId: 'user-1',
        regionId: 'west-java',
        currentLevel: 2,
        completedLevels: [1],
        researchPoints: 250,
        unlockedItems: ['filter'],
      },
    ])
  })
})
