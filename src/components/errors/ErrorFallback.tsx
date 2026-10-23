'use client'

import Link from 'next/link'
import { useI18n } from '@/components/settings/PreferencesProvider'

export default function ErrorFallback({
  title,
  description,
  digest,
  onRetry,
  backHref = '/',
  backLabel,
}: {
  title: string
  description: string
  digest?: string
  onRetry: () => void
  backHref?: string
  backLabel?: string
}) {
  const { t } = useI18n()
  const resolvedBackLabel = backLabel ?? t('Kembali ke Beranda')

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
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-sm font-semibold text-[var(--accent-red)] mb-2">
            {title}
          </h2>
          <p
            role="alert"
            className="text-xs text-[var(--text-muted)] leading-relaxed mb-4"
          >
            {description}
          </p>

          {digest && (
            <p className="text-[10px] text-[var(--text-muted)] font-mono break-all mb-4">
              {t('Kode kesalahan: {digest}', { digest })}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onRetry()}
              className="eco-btn-primary w-full py-2.5 text-sm"
            >
              {t('🔄 Coba Lagi')}
            </button>
            <Link
              href={backHref}
              className="eco-btn-secondary w-full py-2.5 text-sm"
            >
              {resolvedBackLabel}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
