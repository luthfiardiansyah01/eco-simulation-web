import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/login',
}))

import { createClient } from '@/lib/supabase/client'
import SoundProvider from '@/components/audio/SoundProvider'
import LoginForm from '@/app/(auth)/login/LoginForm'
import ForgotPasswordForm from '@/app/(auth)/forgot-password/ForgotPasswordForm'
import ResetPasswordForm from '@/app/(auth)/reset-password/ResetPasswordForm'

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

const createClientMock = vi.mocked(createClient)

function authClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      verifyOtp: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
  }
}

function renderWithSound(ui: React.ReactNode) {
  return render(<SoundProvider>{ui}</SoundProvider>)
}

beforeEach(() => {
  createClientMock.mockReset()
  routerMock.push.mockReset()
  routerMock.replace.mockReset()
  routerMock.refresh.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('LoginForm', () => {
  it('switches between sign-in and sign-up modes', async () => {
    const user = userEvent.setup()
    createClientMock.mockReturnValue(authClient() as never)
    renderWithSound(<LoginForm />)

    expect(screen.getByText('Masuk untuk melanjutkan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '▶ Masuk' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Daftar' }))
    expect(screen.getByText('Buat akun baru')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '🌱 Buat Akun' })).toBeInTheDocument()
    expect(screen.queryByText('Lupa password?')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(screen.getByText('Masuk untuk melanjutkan')).toBeInTheDocument()
  })

  it('signs in and redirects home', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.signInWithPassword.mockResolvedValue({ error: null })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<LoginForm />)

    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret12')
    await user.click(screen.getByRole('button', { name: '▶ Masuk' }))

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/'))
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret12',
    })
    expect(routerMock.refresh).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows sign-in errors and thrown failures', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })
    createClientMock.mockReturnValue(client as never)
    const { unmount } = renderWithSound(<LoginForm />)

    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong12')
    await user.click(screen.getByRole('button', { name: '▶ Masuk' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Invalid login credentials'
    )
    expect(routerMock.push).not.toHaveBeenCalled()
    unmount()

    client.auth.signInWithPassword.mockRejectedValue(new Error('network'))
    renderWithSound(<LoginForm />)
    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong12')
    await user.click(screen.getByRole('button', { name: '▶ Masuk' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Terjadi kesalahan. Coba lagi.'
    )
  })

  it('shows email confirmation and handles sign-up errors', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    createClientMock.mockReturnValue(client as never)
    const { unmount } = renderWithSound(<LoginForm />)

    await user.click(screen.getByRole('button', { name: 'Daftar' }))
    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret12')
    await user.click(screen.getByRole('button', { name: '🌱 Buat Akun' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Akun dibuat. Cek email kamu'
    )
    expect(screen.getByRole('button', { name: '▶ Masuk' })).toBeInTheDocument()
    expect(routerMock.push).not.toHaveBeenCalled()
    unmount()

    client.auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: 'User already registered' },
    })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<LoginForm />)
    await user.click(screen.getByRole('button', { name: 'Daftar' }))
    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret12')
    await user.click(screen.getByRole('button', { name: '🌱 Buat Akun' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ User already registered'
    )
  })

  it('redirects after a sign-up that already has a session', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.signUp.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<LoginForm />)

    await user.click(screen.getByRole('button', { name: 'Daftar' }))
    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret12')
    await user.click(screen.getByRole('button', { name: '🌱 Buat Akun' }))

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/'))
  })

  it('renders initial query errors and status messages', () => {
    createClientMock.mockReturnValue(authClient() as never)
    renderWithSound(
      <LoginForm initialError="Kode salah" initialMessage="Password diperbarui" />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('⚠ Kode salah')
    expect(screen.getByRole('status')).toHaveTextContent('✓ Password diperbarui')
  })
})

describe('ForgotPasswordForm', () => {
  it('requests a code, normalizes the email, and moves to the code step', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<ForgotPasswordForm />)

    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'USER@Example.com')
    await user.click(screen.getByRole('button', { name: '✉️ Kirim Kode Verifikasi' }))

    expect(await screen.findByText('Masukkan kode verifikasi')).toBeInTheDocument()
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      { redirectTo: `${window.location.origin}/auth/recovery` }
    )
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Kode verifikasi 6 digit telah dikirim'
    )
    expect(
      screen.getByRole('button', { name: 'Kirim ulang dalam 60 detik' })
    ).toBeDisabled()
  })

  it('shows friendly request errors and handles thrown failures', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: 'Email rate limit exceeded' },
    })
    createClientMock.mockReturnValue(client as never)
    const { unmount } = renderWithSound(<ForgotPasswordForm />)

    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: '✉️ Kirim Kode Verifikasi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
    )
    unmount()

    client.auth.resetPasswordForEmail.mockRejectedValue(new Error('network'))
    renderWithSound(<ForgotPasswordForm />)
    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: '✉️ Kirim Kode Verifikasi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Terjadi kesalahan. Coba lagi.'
    )
  })

  it('verifies a six-digit code and redirects to reset-password', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    client.auth.verifyOtp.mockResolvedValue({ error: null })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<ForgotPasswordForm />)

    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: '✉️ Kirim Kode Verifikasi' }))
    await user.type(await screen.findByPlaceholderText('000000'), '123456')
    await user.click(screen.getByRole('button', { name: '🔐 Verifikasi Kode' }))

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith('/reset-password'))
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '123456',
      type: 'recovery',
    })
    expect(routerMock.refresh).toHaveBeenCalled()
  })

  it('shows verification errors and lets the user change email', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    client.auth.verifyOtp.mockResolvedValue({
      error: { message: 'Token has expired' },
    })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<ForgotPasswordForm initialError="Kode tidak valid" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Kode tidak valid')
    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: '✉️ Kirim Kode Verifikasi' }))
    await user.type(await screen.findByPlaceholderText('000000'), '123456')
    await user.click(screen.getByRole('button', { name: '🔐 Verifikasi Kode' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Kode tidak valid atau sudah kedaluwarsa. Coba kirim ulang kode.'
    )
    await user.click(screen.getByRole('button', { name: 'Ubah email' }))
    expect(screen.getByText('Pulihkan akses ke akunmu')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('000000')).not.toBeInTheDocument()
  })

  it('disables verification until six digits are entered', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<ForgotPasswordForm />)

    await user.type(screen.getByPlaceholderText('kamu@email.com'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: '✉️ Kirim Kode Verifikasi' }))
    const codeInput = await screen.findByPlaceholderText('000000')
    const verifyButton = screen.getByRole('button', { name: '🔐 Verifikasi Kode' })

    expect(verifyButton).toBeDisabled()
    await user.type(codeInput, '123')
    expect(verifyButton).toBeDisabled()
    await user.type(codeInput, '456')
    expect(verifyButton).toBeEnabled()
  })
})

describe('ResetPasswordForm', () => {
  function fillPasswords(password: string, confirmation: string) {
    fireEvent.change(screen.getByPlaceholderText('Minimal 6 karakter'), {
      target: { value: password },
    })
    fireEvent.change(screen.getByPlaceholderText('Ulangi password baru'), {
      target: { value: confirmation },
    })
  }

  it('validates minimum length and matching confirmation', async () => {
    const user = userEvent.setup()
    const client = authClient()
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<ResetPasswordForm email="user@example.com" />)

    const form = screen
      .getByRole('button', { name: '🔐 Simpan Password Baru' })
      .closest('form')!

    fillPasswords('123', '123')
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Password minimal 6 karakter.'
    )

    fillPasswords('secret12', 'secret13')
    fireEvent.submit(form)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Konfirmasi password tidak cocok.'
    )
    expect(client.auth.updateUser).not.toHaveBeenCalled()

    await user.click(screen.getByRole('checkbox', { name: 'Tampilkan password' }))
    expect(screen.getByPlaceholderText('Minimal 6 karakter')).toHaveAttribute(
      'type',
      'text'
    )
  })

  it('updates the password, signs out, and redirects to login', async () => {
    const user = userEvent.setup()
    const client = authClient()
    client.auth.updateUser.mockResolvedValue({ error: null })
    client.auth.signOut.mockResolvedValue({ error: null })
    createClientMock.mockReturnValue(client as never)
    renderWithSound(<ResetPasswordForm email="user@example.com" />)

    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    fillPasswords('new-secret', 'new-secret')
    await user.click(screen.getByRole('button', { name: '🔐 Simpan Password Baru' }))

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith('/login?message=password_updated')
    )
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-secret' })
    expect(client.auth.signOut).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Password berhasil diperbarui'
    )
    expect(routerMock.refresh).toHaveBeenCalled()
  })

  it('maps password update errors to friendly messages', async () => {
    const user = userEvent.setup()
    const client = authClient()
    createClientMock.mockReturnValue(client as never)
    const { unmount } = renderWithSound(<ResetPasswordForm email="user@example.com" />)

    client.auth.updateUser.mockResolvedValue({
      error: { message: 'New password should be different from the old password' },
    })
    fillPasswords('new-secret', 'new-secret')
    await user.click(screen.getByRole('button', { name: '🔐 Simpan Password Baru' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Password baru harus berbeda dari password lama.'
    )
    unmount()

    renderWithSound(<ResetPasswordForm email="user@example.com" />)
    client.auth.updateUser.mockResolvedValue({
      error: { message: 'Password is too short' },
    })
    fillPasswords('new-secret', 'new-secret')
    await user.click(screen.getByRole('button', { name: '🔐 Simpan Password Baru' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Password terlalu lemah atau terlalu pendek.'
    )
  })

  it('handles session expiry, unknown errors, and thrown failures', async () => {
    const user = userEvent.setup()
    const client = authClient()
    createClientMock.mockReturnValue(client as never)
    const { unmount } = renderWithSound(<ResetPasswordForm email="user@example.com" />)

    client.auth.updateUser.mockResolvedValue({
      error: { message: 'Session expired' },
    })
    fillPasswords('new-secret', 'new-secret')
    await user.click(screen.getByRole('button', { name: '🔐 Simpan Password Baru' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Sesi reset sudah tidak valid. Minta kode verifikasi baru.'
    )
    unmount()

    renderWithSound(<ResetPasswordForm email="user@example.com" />)
    client.auth.updateUser.mockRejectedValue(new Error('network'))
    fillPasswords('new-secret', 'new-secret')
    await user.click(screen.getByRole('button', { name: '🔐 Simpan Password Baru' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '⚠ Terjadi kesalahan. Coba lagi.'
    )
  })
})
