import { expect, type Page } from '@playwright/test'

export const FAKE_SUPABASE_URL = 'http://127.0.0.1:54329'

const FAKE_USER_ID = '00000000-0000-4000-8000-000000000001'
const FAKE_EMAIL = 'e2e@example.com'
const FAKE_PASSWORD = 'e2e-password'

const FAKE_USER = {
  id: FAKE_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: FAKE_EMAIL,
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_anonymous: false,
}

const FAKE_PROGRESS = {
  user_id: FAKE_USER_ID,
  region_id: 'west-java',
  current_level: 2,
  completed_levels: [1],
  research_points: 250,
  unlocked_items: [],
}

export type RpcScenario = 'success' | 'rate_limited' | 'invalid_progress'

export type LeaderboardRow = {
  rank: number | string | null
  username: string | null
  total_points: number | string | null
  missions_completed: number | string | null
  achievements_count: number | string | null
  regions_count: number | string | null
  is_current_user: boolean | null
}

export type AchievementRow = {
  id: string
  title: string
  description: string
  icon: string
  condition_type: string
  condition_value: number
}

export type UserAchievementRow = {
  achievement_id: string
  unlocked_at: string
}

type LeaderboardFixture =
  | LeaderboardRow[]
  | { error: { code?: string; message: string } }

export type SupabaseMockOptions = {
  scenario?: RpcScenario
  signedIn?: boolean
  leaderboard?: LeaderboardFixture
  achievements?: AchievementRow[]
  userAchievements?: UserAchievementRow[]
  signUpSession?: boolean
  signInError?: { message: string }
  signUpError?: { message: string }
  recoverError?: { message: string }
  verifyError?: { message: string }
}

export type SupabaseMock = {
  rpcRequests: Record<string, unknown>[]
  readonly leaderboardRequests: number
  setRpcScenario: (scenario: RpcScenario) => void
  setSignedIn: (value: boolean) => void
  setLeaderboard: (fixture: LeaderboardFixture) => void
  setAchievements: (rows: AchievementRow[]) => void
  setUserAchievements: (rows: UserAchievementRow[]) => void
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-headers':
      'authorization, apikey, content-type, x-client-info, prefer, x-supabase-api-version',
    'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
    vary: 'Origin',
  }
}

export async function mockSupabase(
  page: Page,
  initial: RpcScenario | SupabaseMockOptions = 'success'
): Promise<SupabaseMock> {
  const initialOptions = typeof initial === 'string' ? { scenario: initial } : initial
  let scenario = initialOptions.scenario ?? 'success'
  let signedIn = initialOptions.signedIn ?? false
  let leaderboard: LeaderboardFixture = initialOptions.leaderboard ?? []
  let achievements = initialOptions.achievements ?? []
  let userAchievements = initialOptions.userAchievements ?? []
  let leaderboardRequestCount = 0
  const rpcRequests: Record<string, unknown>[] = []
  const now = Math.floor(Date.now() / 1000)
  const session = {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'e2e-refresh-token',
    user: FAKE_USER,
  }

  await page.route(`${FAKE_SUPABASE_URL}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = corsHeaders(request.headers().origin)

    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers })
      return
    }

    if (url.pathname.endsWith('/auth/v1/token')) {
      if (initialOptions.signInError) {
        await json(400, {
          error: 'invalid_grant',
          error_description: initialOptions.signInError.message,
          message: initialOptions.signInError.message,
        })
        return
      }
      signedIn = true
      await json(200, session)
      return
    }

    if (url.pathname.endsWith('/auth/v1/user')) {
      if (signedIn) {
        await json(200, FAKE_USER)
      } else {
        await json(401, {
          code: 'session_not_found',
          message: 'Session not found',
        })
      }
      return
    }

    if (url.pathname.endsWith('/auth/v1/logout')) {
      signedIn = false
      await route.fulfill({ status: 204, headers })
      return
    }

    if (url.pathname.endsWith('/auth/v1/signup')) {
      if (initialOptions.signUpError) {
        await json(400, {
          error: 'signup_failed',
          error_description: initialOptions.signUpError.message,
          message: initialOptions.signUpError.message,
        })
        return
      }
      if (initialOptions.signUpSession) {
        signedIn = true
      }
      await json(200, {
        user: FAKE_USER,
        session: initialOptions.signUpSession ? session : null,
      })
      return
    }

    if (url.pathname.endsWith('/auth/v1/recover')) {
      if (initialOptions.recoverError) {
        await json(400, {
          error: 'recover_failed',
          error_description: initialOptions.recoverError.message,
          message: initialOptions.recoverError.message,
        })
        return
      }
      await json(200, {})
      return
    }

    if (url.pathname.endsWith('/auth/v1/verify')) {
      if (initialOptions.verifyError) {
        await json(400, {
          error: 'verify_failed',
          error_description: initialOptions.verifyError.message,
          message: initialOptions.verifyError.message,
        })
        return
      }
      await json(200, {})
      return
    }

    if (url.pathname.includes('/auth/v1/')) {
      await json(200, {})
      return
    }

    if (url.pathname.endsWith('/rest/v1/rpc/complete_mission')) {
      const rawBody = request.postData()
      rpcRequests.push(rawBody ? JSON.parse(rawBody) : {})

      if (scenario === 'success') {
        await json(200, FAKE_PROGRESS)
        return
      }

      if (scenario === 'rate_limited') {
        await json(400, {
          code: 'P0001',
          message: 'Mission completion rate limit exceeded; wait 30 seconds',
          details: null,
          hint: null,
        })
        return
      }

      await json(400, {
        code: 'P0001',
        message: 'Mission objective not met: pollution 90 exceeds 20',
        details: null,
        hint: null,
      })
      return
    }

    if (url.pathname.endsWith('/rest/v1/rpc/get_leaderboard')) {
      leaderboardRequestCount += 1
      if (Array.isArray(leaderboard)) {
        await json(200, leaderboard)
      } else {
        await json(400, {
          code: leaderboard.error.code ?? 'P0001',
          message: leaderboard.error.message,
          details: null,
          hint: null,
        })
      }
      return
    }

    if (url.pathname.endsWith('/rest/v1/achievements')) {
      await json(200, achievements)
      return
    }

    if (url.pathname.endsWith('/rest/v1/user_achievements')) {
      if (request.method() === 'GET') {
        await json(200, userAchievements)
      } else {
        await json(201, [])
      }
      return
    }

    if (url.pathname.includes('/rest/v1/')) {
      await json(200, [])
      return
    }

    await json(404, { message: 'Not found in the e2e Supabase mock' })
  })

  return {
    rpcRequests,
    get leaderboardRequests() {
      return leaderboardRequestCount
    },
    setRpcScenario(next) {
      scenario = next
    },
    setSignedIn(value) {
      signedIn = value
    },
    setLeaderboard(fixture) {
      leaderboard = fixture
    },
    setAchievements(rows) {
      achievements = rows
    },
    setUserAchievements(rows) {
      userAchievements = rows
    },
  }
}

export async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(FAKE_EMAIL)
  await page.locator('input[type="password"]').fill(FAKE_PASSWORD)
  await page.getByRole('button', { name: /Masuk/ }).click()
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.locator('body')).toBeVisible()
}
