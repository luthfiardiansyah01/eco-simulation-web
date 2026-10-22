'use client'

import { useEffect } from 'react'
import ErrorFallback from '@/components/errors/ErrorFallback'

export default function RecoveryRouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error('Recovery route error:', error)
  }, [error])

  return (
    <ErrorFallback
      title="Tautan reset gagal diproses"
      description="Terjadi kesalahan saat memproses tautan reset. Minta kode verifikasi baru atau kembali ke halaman masuk."
      digest={error.digest}
      onRetry={retry}
      backHref="/forgot-password"
      backLabel="Minta Kode Baru"
    />
  )
}
