'use client'

import { useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  normalizeLanguage,
  translate,
  type Language,
  type TranslationVars,
} from '@/lib/i18n'

function subscribeToLanguage() {
  return () => undefined
}

function getLanguageSnapshot(): Language {
  try {
    const value = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${LANGUAGE_COOKIE}=`))
      ?.split('=')[1]
    return normalizeLanguage(value)
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function getServerLanguageSnapshot(): Language {
  return DEFAULT_LANGUAGE
}

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  )

  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  const t = (source: string, vars?: TranslationVars) =>
    translate(language, source, vars)

  return (
    <html lang={language}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box',
          background: '#0d1f1a',
          color: '#e5f5ec',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <title>{t('Terjadi kesalahan — VRASS')}</title>
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            padding: 24,
            boxSizing: 'border-box',
            textAlign: 'center',
            background: '#132a22',
            border: '1px solid #2a4a3a',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ margin: '0 0 10px', fontSize: 18 }}>
            {t('Terjadi kesalahan')}
          </h1>
          <p
            style={{
              margin: '0 0 20px',
              fontSize: 13,
              lineHeight: 1.6,
              color: '#9fc9b4',
            }}
          >
            {t('Aplikasi gagal dimuat. Coba lagi, atau kembali ke beranda.')}
          </p>
          {error.digest && (
            <p
              style={{
                margin: '0 0 20px',
                fontSize: 11,
                lineHeight: 1.5,
                color: '#6b9e7a',
                wordBreak: 'break-all',
              }}
            >
              {t('Kode kesalahan: {digest}', { digest: error.digest })}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                width: '100%',
                padding: '11px 16px',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #16a34a, #0d9488)',
              }}
            >
              {t('🔄 Coba Lagi')}
            </button>
            <Link
              href="/"
              style={{
                width: '100%',
                padding: '10px 16px',
                boxSizing: 'border-box',
                borderRadius: 10,
                border: '1px solid #2f6b4f',
                color: '#b9f6d0',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              {t('← Kembali ke Beranda')}
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
