'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSound } from '@/components/audio/SoundProvider'
import { useI18n } from '@/components/settings/PreferencesProvider'
import type { Translator } from '@/lib/i18n'

type RecoveryStep = 'email' | 'code'

const RESEND_SECONDS = 60

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function friendlyAuthError(message: string, t: Translator) {
  const normalized = message.toLowerCase()

  if (normalized.includes('expired') || normalized.includes('invalid')) {
    return t('Kode tidak valid atau sudah kedaluwarsa. Coba kirim ulang kode.')
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return t('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.')
  }
  return message
}

export default function ForgotPasswordForm({
  initialError = '',
}: {
  initialError?: string
}) {
  const router = useRouter()
  const { play } = useSound()
  const { t } = useI18n()
  const [step, setStep] = useState<RecoveryStep>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(initialError)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function sendResetCode(targetEmail: string, isResend = false) {
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      targetEmail,
      {
        // The recovery landing page handles token_hash, PKCE code, and
        // implicit-flow fragment tokens, then redirects to /reset-password.
        redirectTo: `${window.location.origin}/auth/recovery`,
      }
    )

    if (resetError) {
      setError(friendlyAuthError(resetError.message, t))
      play('error')
      return false
    }

    setEmail(targetEmail)
    setStep('code')
    setCode('')
    setError('')
    setMessage(
      isResend
        ? t('Kode baru telah dikirim ke {email}.', { email: targetEmail })
        : t(
            'Kode verifikasi 6 digit telah dikirim ke {email}. Cek inbox dan folder spam.',
            { email: targetEmail }
          )
    )
    setResendCooldown(RESEND_SECONDS)
    play('success')
    return true
  }

  async function handleRequestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    play('click')
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await sendResetCode(normalizeEmail(email))
    } catch (err) {
      console.error('Password reset request failed:', err)
      setError(t('Terjadi kesalahan. Coba lagi.'))
      play('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    play('click')
    setError('')
    setMessage('')

    if (!/^\d{6}$/.test(code)) {
      setError(t('Masukkan kode verifikasi 6 digit dari email.'))
      play('error')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizeEmail(email),
        token: code,
        type: 'recovery',
      })

      if (verifyError) {
        setError(friendlyAuthError(verifyError.message, t))
        play('error')
        return
      }

      play('success')
      router.replace('/reset-password')
      router.refresh()
    } catch (err) {
      console.error('Recovery code verification failed:', err)
      setError(t('Terjadi kesalahan. Coba lagi.'))
      play('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return

    play('click')
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await sendResetCode(normalizeEmail(email), true)
    } catch (err) {
      console.error('Password reset resend failed:', err)
      setError(t('Terjadi kesalahan. Coba lagi.'))
      play('error')
    } finally {
      setLoading(false)
    }
  }

  function changeEmail() {
    play('click')
    setStep('email')
    setCode('')
    setError('')
    setMessage('')
  }

  const stepClass = (active: boolean) =>
    active
      ? 'text-[var(--accent-green)] font-semibold'
      : 'text-[var(--text-muted)]'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-green-900/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full bg-teal-900/20 blur-3xl pointer-events-none" />

      <div className="max-w-sm w-full relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl float">🌿</span>
            <h1 className="text-2xl font-bold shimmer-text">VRASS</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {step === 'email'
              ? t('Pulihkan akses ke akunmu')
              : t('Masukkan kode verifikasi')}
          </p>
        </div>

        <div className="eco-card p-6">
          <div className="flex items-center justify-center gap-1.5 mb-5 text-[9px]">
            <span className={stepClass(step === 'email')}>{t('1 Email')}</span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className={stepClass(step === 'code')}>{t('2 Kode')}</span>
            <span className="text-[var(--text-muted)]">→</span>
            <span className="text-[var(--text-muted)]">{t('3 Password')}</span>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1.5 font-medium">
                  {t('Email akun')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-card)] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder:text-[var(--text-muted)]"
                  placeholder={t('kamu@email.com')}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="badge badge-red w-full justify-start py-2 px-3 rounded-lg text-xs leading-relaxed"
                >
                  ⚠ {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="badge badge-green w-full justify-start py-2 px-3 rounded-lg text-xs leading-relaxed"
                >
                  ✓ {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="eco-btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('⏳ Mengirim...') : t('✉️ Kirim Kode Verifikasi')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="text-center">
                <p className="text-[10px] text-[var(--text-muted)]">{t('Kode dikirim ke')}</p>
                <p className="text-xs font-medium text-foreground break-all mt-0.5">
                  {email}
                </p>
                <button
                  type="button"
                  onClick={changeEmail}
                  className="text-[10px] text-[var(--accent-teal)] hover:underline mt-1"
                >
                  {t('Ubah email')}
                </button>
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1.5 font-medium text-center">
                  {t('Kode 6 digit')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  required
                  autoComplete="one-time-code"
                  autoFocus
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-card)] rounded-lg px-3 py-3 text-center text-2xl tracking-[0.35em] font-mono text-foreground focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-green-500/20 transition-colors placeholder:text-[var(--text-muted)]"
                  placeholder="000000"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="badge badge-red w-full justify-start py-2 px-3 rounded-lg text-xs leading-relaxed"
                >
                  ⚠ {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="badge badge-green w-full justify-start py-2 px-3 rounded-lg text-xs leading-relaxed"
                >
                  ✓ {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="eco-btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('⏳ Memverifikasi...') : t('🔐 Verifikasi Kode')}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                  className="text-[10px] text-[var(--accent-teal)] hover:underline disabled:text-[var(--text-muted)] disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? t('Kirim ulang dalam {seconds} detik', {
                        seconds: resendCooldown,
                      })
                    : t('Kirim ulang kode')}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link
            href="/login"
            className="text-xs text-[var(--text-muted)] hover:text-foreground transition-colors"
            onClick={() => play('click')}
          >
            {t('← Kembali ke halaman masuk')}
          </Link>
        </div>
      </div>
    </main>
  )
}
