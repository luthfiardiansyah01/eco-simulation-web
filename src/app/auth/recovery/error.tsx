'use client'

import { useEffect } from 'react'
import ErrorFallback from '@/components/errors/ErrorFallback'
import { useI18n } from '@/components/settings/PreferencesProvider'

export default function RecoveryRouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    console.error('Recovery route error:', error)
  }, [error])

  return (
    <ErrorFallback
      title={t('Tautan reset gagal diproses')}
      description={t(
        'Terjadi kesalahan saat memproses tautan reset. Minta kode verifikasi baru atau kembali ke halaman masuk.'
      )}
      digest={error.digest}
      onRetry={retry}
      backHref="/forgot-password"
      backLabel={t('Minta Kode Baru')}
    />
  )
}
