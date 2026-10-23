// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

type CookieOptions = {
  cookies: {
    getAll: () => unknown[]
    setAll: (
      cookies: { name: string; value: string; options?: Record<string, unknown> }[],
      headers: Record<string, string>
    ) => void
  }
}

async function loadProxy(url = '', key = '') {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', key)
  return import('@/proxy')
}

beforeEach(() => {
  mocks.createServerClient.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('session-refresh proxy', () => {
  it('passes requests through when Supabase is not configured', async () => {
    const { proxy } = await loadProxy()
    const response = await proxy(new NextRequest('https://app.example.com/region'))

    expect(response.status).toBe(200)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      'Supabase environment variables are missing; session refresh is disabled.'
    )
  })

  it('verifies claims and keeps public pages available', async () => {
    const getClaims = vi.fn().mockResolvedValue({ data: { claims: {} } })
    mocks.createServerClient.mockReturnValue({
      auth: { getClaims },
    } as never)

    const { proxy } = await loadProxy('https://supabase.example', 'anon-key')
    const response = await proxy(new NextRequest('https://app.example.com/region'))

    expect(response.status).toBe(200)
    expect(mocks.createServerClient).toHaveBeenCalledWith(
      'https://supabase.example',
      'anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
    expect(getClaims).toHaveBeenCalled()
  })

  it('does not block public pages when session verification fails', async () => {
    const getClaims = vi.fn().mockRejectedValue(new Error('offline'))
    mocks.createServerClient.mockReturnValue({
      auth: { getClaims },
    } as never)

    const { proxy } = await loadProxy('https://supabase.example', 'anon-key')
    const response = await proxy(new NextRequest('https://app.example.com/region'))

    expect(response.status).toBe(200)
    expect(console.error).toHaveBeenCalledWith(
      'Supabase session refresh failed:',
      expect.any(Error)
    )
  })

  it('forwards refreshed cookies and cache headers to the response', async () => {
    let options: CookieOptions | undefined
    const getClaims = vi.fn().mockImplementation(async () => {
      options?.cookies.setAll(
        [{ name: 'sb-session', value: 'token', options: { path: '/' } }],
        { 'cache-control': 'no-store' }
      )
      return { data: { claims: {} } }
    })
    mocks.createServerClient.mockImplementation((_url, _key, clientOptions) => {
      options = clientOptions as CookieOptions
      return { auth: { getClaims } }
    })

    const { proxy } = await loadProxy('https://supabase.example', 'anon-key')
    const request = new NextRequest('https://app.example.com/region', {
      headers: { cookie: 'existing=1' },
    })
    const response = await proxy(request)

    expect(options?.cookies.getAll()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'existing', value: '1' })])
    )
    expect(response.headers.getSetCookie().join(', ')).toContain(
      'sb-session=token'
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
