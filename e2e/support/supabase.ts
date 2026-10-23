import { expect, type Page } from '@playwright/test'

export const FAKE_SUPABASE_URL = 'http://127.0.0.1:54321'

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

export type SupabaseMock = {
  rpcRequests: Record<string, unknown>[]
  setRpcScenario: (scenario: RpcScenario) => void
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-headers':
      'authorization, apikey, content-type, x-client-info, prefer, x-supabase-api-version',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
    vary: 'Origin',
  }
}

export async function mockSupabase(
  page: Page,
  initialScenario: RpcScenario = 'success'
): Promise<SupabaseMock> {
  let scenario = initialScenario
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
      await json(200, session)
      return
    }

    if (url.pathname.endsWith('/auth/v1/user')) {
      await json(200, FAKE_USER)
      return
    }

    if (url.pathname.endsWith('/auth/v1/logout')) {
      await route.fulfill({ status: 204, headers })
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

    if (url.pathname.endsWith('/rest/v1/achievements')) {
      await json(200, [])
      return
    }

    if (url.pathname.endsWith('/rest/v1/user_achievements')) {
      await json(request.method() === 'POST' ? 201 : 200, [])
      return
    }

    if (url.pathname.includes('/rest/v1/')) {
      await json(200, [])
      return
    }

    if (url.pathname.includes('/auth/v1/')) {
      await json(200, {})
      return
    }

    await json(404, { message: 'Not found in the e2e Supabase mock' })
  })

  return {
    rpcRequests,
    setRpcScenario(next) {
      scenario = next
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
