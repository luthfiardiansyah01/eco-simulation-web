// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/route', () => ({ createRouteClient: vi.fn() }))

import { createRouteClient } from '@/lib/supabase/route'
import { GET as callbackGET } from '@/app/auth/callback/route'
import { GET as confirmGET } from '@/app/auth/confirm/route'

const createRouteClientMock = vi.mocked(createRouteClient)

function request(
  pathname: string,
  params: Record<string, string> = {}
): NextRequest {
  const url = new URL(pathname, 'https://app.example.com')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

function location(response: Response): string {
  const value = response.headers.get('location')
  if (!value) throw new Error('Expected a redirect location')
  const url = new URL(value)
  return `${url.pathname}${url.search}${url.hash}`
}

function routeClient() {
  const client = {
    auth: {
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
    },
  }
  createRouteClientMock.mockReturnValue(client as never)
  return client
}

beforeEach(() => {
  createRouteClientMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('auth callback route', () => {
  it('redirects missing codes to the login error page', async () => {
    const response = await callbackGET(request('/auth/callback'))
    expect(response.status).toBe(307)
    expect(location(response)).toBe('/login?error=auth_callback_failed')
    expect(createRouteClientMock).not.toHaveBeenCalled()
  })

  it('exchanges a code and redirects to a safe next path', async () => {
    const client = routeClient()
    client.auth.exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await callbackGET(
      request('/auth/callback', { code: 'abc', next: '/region?tab=1#top' })
    )

    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(location(response)).toBe('/region?tab=1#top')
    expect(createRouteClientMock).toHaveBeenCalledWith(expect.any(NextRequest), response)
  })

  it('strips cross-origin redirects and handles exchange failures', async () => {
    const client = routeClient()
    client.auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    expect(
      location(
        await callbackGET(
          request('/auth/callback', { code: 'abc', next: 'https://evil.example/x' })
        )
      )
    ).toBe('/')

    client.auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: 'expired' },
    })
    const failed = await callbackGET(request('/auth/callback', { code: 'abc' }))
    expect(location(failed)).toBe('/login?error=auth_callback_failed')
  })
})

describe('auth confirm route', () => {
  it('uses the reset-password fallback for PKCE recovery codes', async () => {
    const client = routeClient()
    client.auth.exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await confirmGET(request('/auth/confirm', { code: 'recovery-code' }))

    expect(location(response)).toBe('/reset-password')
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('recovery-code')
  })

  it('honours an explicit safe next path', async () => {
    const client = routeClient()
    client.auth.exchangeCodeForSession.mockResolvedValue({ error: null })

    const response = await confirmGET(
      request('/auth/confirm', { code: 'abc', next: '/mission/west-java' })
    )

    expect(location(response)).toBe('/mission/west-java')
  })

  it('redirects failed recovery code exchanges to the recovery error page', async () => {
    const client = routeClient()
    client.auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: 'invalid flow state' },
    })

    const response = await confirmGET(request('/auth/confirm', { code: 'abc' }))

    expect(location(response)).toBe('/forgot-password?error=invalid_code')
  })

  it('verifies signup and recovery OTP hashes', async () => {
    const client = routeClient()
    client.auth.verifyOtp.mockResolvedValue({ error: null })

    const signup = await confirmGET(
      request('/auth/confirm', { token_hash: 'hash', type: 'signup' })
    )
    expect(location(signup)).toBe('/')
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash',
      type: 'signup',
    })

    const recovery = await confirmGET(
      request('/auth/confirm', { token_hash: 'hash', type: 'recovery' })
    )
    expect(location(recovery)).toBe('/reset-password')
  })

  it('routes OTP failures to the correct error page', async () => {
    const client = routeClient()
    client.auth.verifyOtp.mockResolvedValue({ error: { message: 'expired' } })

    expect(
      location(
        await confirmGET(
          request('/auth/confirm', { token_hash: 'hash', type: 'signup' })
        )
      )
    ).toBe('/login?error=auth_callback_failed')

    expect(
      location(
        await confirmGET(
          request('/auth/confirm', { token_hash: 'hash', type: 'recovery' })
        )
      )
    ).toBe('/forgot-password?error=invalid_code')
  })

  it('rejects missing tokens for normal and recovery confirmations', async () => {
    expect(location(await confirmGET(request('/auth/confirm')))).toBe(
      '/login?error=auth_callback_failed'
    )
    expect(
      location(await confirmGET(request('/auth/confirm', { type: 'recovery' })))
    ).toBe('/forgot-password?error=invalid_code')
    expect(
      location(await confirmGET(request('/auth/confirm', { token_hash: 'hash' })))
    ).toBe('/login?error=auth_callback_failed')
  })

  it('does not follow cross-origin next paths', async () => {
    const client = routeClient()
    client.auth.verifyOtp.mockResolvedValue({ error: null })

    const response = await confirmGET(
      request('/auth/confirm', {
        token_hash: 'hash',
        type: 'signup',
        next: 'https://evil.example/steal',
      })
    )

    expect(location(response)).toBe('/')
  })
})
