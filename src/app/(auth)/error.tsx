'use client'

import { useEffect } from 'react'
import ErrorFallback from '@/components/errors/ErrorFallback'
import { useI18n } from '@/components/settings/PreferencesProvider'

export default function AuthRouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    console.error('Auth route error:', error)
  }, [error])

  return (
    <ErrorFallback
      title={t('Halaman autentikasi gagal dimuat')}
      description={t(
        'Terjadi kesalahan saat memuat halaman masuk atau pemulihan password. Coba lagi, atau kembali ke halaman masuk.'
      )}
      digest={error.digest}
      onRetry={retry}
      backHref="/login"
      backLabel={t('← Kembali ke Masuk')}
    />
  )
}
