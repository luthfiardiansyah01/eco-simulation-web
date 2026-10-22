'use client'

import { useEffect } from 'react'
import ErrorFallback from '@/components/errors/ErrorFallback'

export default function AuthRouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error('Auth route error:', error)
  }, [error])

  return (
    <ErrorFallback
      title="Halaman autentikasi gagal dimuat"
      description="Terjadi kesalahan saat memuat halaman masuk atau pemulihan password. Coba lagi, atau kembali ke halaman masuk."
      digest={error.digest}
      onRetry={retry}
      backHref="/login"
      backLabel="← Kembali ke Masuk"
    />
  )
}
