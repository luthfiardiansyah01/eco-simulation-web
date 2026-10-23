import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

import { createClient } from '@/lib/supabase/client'
import RecoveryLinkPage from '@/app/auth/recovery/page'

const routerMock = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}))

const createClientMock = vi.mocked(createClient)

function authClient() {
  return {
    auth: {
      setSession: vi.fn(),
      verifyOtp: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      getSession: vi.fn(),
    },
  }
}

function setUrl(path: string) {
  window.history.replaceState({}, '', path)
}

beforeEach(() => {
  createClientMock.mockReset()
  routerMock.replace.mockReset()
  routerMock.refresh.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  setUrl('/')
})

describe('RecoveryLinkPage', () => {
  it('reports link errors without calling Supabase auth methods', async () => {
    setUrl('/auth/recovery?error=invalid_grant')
    const client = authClient()
    createClientMock.mockReturnValue(client as never)

    render(<RecoveryLinkPage />)

    expect(
      await screen.findByRole('heading', {
        name: 'Tautan reset tidak dapat digunakan',
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/tidak valid atau sudah kedaluwarsa/)).toBeInTheDocument()
    expect(client.auth.setSession).not.toHaveBeenCalled()
    expect(client.auth.verifyOtp).not.toHaveBeenCalled()
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('maps cross-browser PKCE failures to an actionable message', async () => {
    setUrl('/auth/recovery?error=invalid%20flow%20state')
    const client = authClient()
    createClientMock.mockReturnValue(client as never)

    render(<RecoveryLinkPage />)

    expect(
      await screen.findByText(/harus dibuka di browser yang sama/)
    ).toBeInTheDocument()
  })

  it('accepts implicit-flow access and refresh tokens', async () => {
    setUrl('/auth/recovery#access_token=access&refresh_token=refresh')
    const client = authClient()
    client.auth.setSession.mockResolvedValue({ error: null })
    createClientMock.mockReturnValue(client as never)

    render(<RecoveryLinkPage />)

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/reset-password')
    )
    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    })
    expect(routerMock.refresh).toHaveBeenCalled()
  })

  it('verifies token hashes, exchanges PKCE codes, and reuses existing sessions', async () => {
    const client = authClient()
    client.auth.verifyOtp.mockResolvedValue({ error: null })
    client.auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    client.auth.getSession.mockResolvedValue({ data: { session: {} } })
    createClientMock.mockReturnValue(client as never)

    setUrl('/auth/recovery?token_hash=hash&type=signup')
    const { unmount } = render(<RecoveryLinkPage />)
    await waitFor(() =>
      expect(client.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'hash',
        type: 'signup',
      })
    )
    expect(routerMock.replace).toHaveBeenCalledWith('/reset-password')
    unmount()

    routerMock.replace.mockReset()
    setUrl('/auth/recovery?code=pkce-code')
    render(<RecoveryLinkPage />)
    await waitFor(() =>
      expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
    )
    unmount()

    routerMock.replace.mockReset()
    setUrl('/auth/recovery')
    render(<RecoveryLinkPage />)
    await waitFor(() =>
      expect(client.auth.getSession).toHaveBeenCalled()
    )
    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/reset-password')
    )
  })

  it('shows an error when no recovery credential is present', async () => {
    setUrl('/auth/recovery')
    const client = authClient()
    client.auth.getSession.mockResolvedValue({ data: { session: null } })
    createClientMock.mockReturnValue(client as never)

    render(<RecoveryLinkPage />)

    expect(
      await screen.findByText(/tidak memuat token yang valid/)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Minta Kode Baru' })).toHaveAttribute(
      'href',
      '/forgot-password'
    )
  })

  it('maps token verification, session, and exchange failures', async () => {
    const client = authClient()
    client.auth.setSession.mockResolvedValue({
      error: { message: 'invalid flow state' },
    })
    createClientMock.mockReturnValue(client as never)

    setUrl('/auth/recovery#access_token=access&refresh_token=refresh')
    const { unmount } = render(<RecoveryLinkPage />)
    expect(
      await screen.findByText(/harus dibuka di browser yang sama/)
    ).toBeInTheDocument()
    unmount()

    client.auth.setSession.mockReset()
    client.auth.verifyOtp.mockResolvedValue({
      error: { message: 'token expired' },
    })
    setUrl('/auth/recovery?token_hash=hash')
    render(<RecoveryLinkPage />)
    expect(
      await screen.findByText(/tidak valid atau sudah kedaluwarsa/)
    ).toBeInTheDocument()
    unmount()

    client.auth.verifyOtp.mockReset()
    client.auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: 'invalid grant' },
    })
    setUrl('/auth/recovery?code=bad-code')
    render(<RecoveryLinkPage />)
    expect(
      await screen.findByText(/tidak valid atau sudah kedaluwarsa/)
    ).toBeInTheDocument()
  })

  it('handles thrown setup errors defensively', async () => {
    setUrl('/auth/recovery')
    createClientMock.mockImplementation(() => {
      throw new Error('offline')
    })

    render(<RecoveryLinkPage />)

    expect(
      await screen.findByText(/Terjadi kesalahan saat memproses tautan reset/)
    ).toBeInTheDocument()
  })
})
