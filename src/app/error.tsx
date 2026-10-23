'use client'

import { useEffect } from 'react'
import ErrorFallback from '@/components/errors/ErrorFallback'
import { useI18n } from '@/components/settings/PreferencesProvider'

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <ErrorFallback
      title={t('Terjadi kesalahan')}
      description={t(
        'Halaman gagal dimuat karena kesalahan yang tidak terduga. Coba muat ulang halaman atau kembali ke beranda.'
      )}
      digest={error.digest}
      onRetry={retry}
      backHref="/"
      backLabel={t('← Kembali ke Beranda')}
    />
  )
}
