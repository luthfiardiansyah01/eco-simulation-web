'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import AuthErrorBoundary from '@/components/errors/AuthErrorBoundary'
import { useI18n } from '@/components/settings/PreferencesProvider'
import type { Translator } from '@/lib/i18n'

type RecoveryState = 'loading' | 'error'

function recoveryErrorMessage(message: string, t: Translator) {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('code verifier') ||
    normalized.includes('flow state') ||
    normalized.includes('invalid flow')
  ) {
    return t(
      'Tautan reset harus dibuka di browser yang sama dengan saat meminta reset. Minta kode baru dari browser ini, atau gunakan kode 6 digit.'
    )
  }
  if (normalized.includes('expired') || normalized.includes('invalid')) {
    return t('Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan atau kode baru.')
  }
  return message
}

function RecoveryLinkContent() {
  const router = useRouter()
  const { t } = useI18n()
  const startedRef = useRef(false)
  const [state, setState] = useState<RecoveryState>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function completeRecovery() {
      try {
        const url = new URL(window.location.href)
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const supabase = createClient()

        const linkError = url.searchParams.get('error_description')
          ?? url.searchParams.get('error')
        if (linkError) {
          setError(recoveryErrorMessage(linkError, t))
          setState('error')
          return
        }

        // Implicit-flow recovery links put tokens in the URL fragment.
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            setError(recoveryErrorMessage(sessionError.message, t))
            setState('error')
            return
          }

          router.replace('/reset-password')
          router.refresh()
          return
        }

        // Custom recovery templates can send the token hash directly.
        const tokenHash = url.searchParams.get('token_hash')
        if (tokenHash) {
          const type = (url.searchParams.get('type') ?? 'recovery') as EmailOtpType
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          })

          if (verifyError) {
            setError(recoveryErrorMessage(verifyError.message, t))
            setState('error')
            return
          }

          router.replace('/reset-password')
          router.refresh()
          return
        }

        // PKCE recovery links arrive with an authorization code.
        const code = url.searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            setError(recoveryErrorMessage(exchangeError.message, t))
            setState('error')
            return
          }

          router.replace('/reset-password')
          router.refresh()
          return
        }

        // If the link has already been consumed, a recovery session may exist.
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          router.replace('/reset-password')
          router.refresh()
          return
        }

        setError(t('Tautan reset tidak memuat token yang valid. Minta tautan atau kode baru.'))
        setState('error')
      } catch (err) {
        console.error('Recovery link handling failed:', err)
        setError(t('Terjadi kesalahan saat memproses tautan reset. Coba lagi.'))
        setState('error')
      }
    }

    void completeRecovery()
  }, [router, t])

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
        </div>

        <div className="eco-card p-6 text-center">
          {state === 'loading' ? (
            <>
              <div className="text-3xl mb-3 animate-pulse">🔐</div>
              <h2 className="text-sm font-semibold text-foreground mb-1">
                {t('Memverifikasi tautan reset...')}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {t('Mohon tunggu sebentar.')}
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-3">⚠️</div>
              <h2 className="text-sm font-semibold text-[var(--accent-red)] mb-2">
                {t('Tautan reset tidak dapat digunakan')}
              </h2>
              <p
                role="alert"
                className="text-xs text-[var(--text-muted)] leading-relaxed mb-4"
              >
                {error}
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/forgot-password"
                  className="eco-btn-primary w-full py-2.5 text-sm"
                >
                  {t('Minta Kode Baru')}
                </Link>
                <Link
                  href="/login"
                  className="eco-btn-secondary w-full py-2.5 text-sm"
                >
                  {t('← Kembali ke Masuk')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function RecoveryLinkPage() {
  const { t } = useI18n()

  return (
    <AuthErrorBoundary
      title={t('Tautan reset gagal diproses')}
      description={t(
        'Terjadi kesalahan saat memproses tautan reset. Minta kode verifikasi baru atau kembali ke halaman masuk.'
      )}
      backHref="/forgot-password"
      backLabel={t('Minta Kode Baru')}
    >
      <RecoveryLinkContent />
    </AuthErrorBoundary>
  )
}
