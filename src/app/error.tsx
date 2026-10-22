'use client'

import { useEffect } from 'react'
import ErrorFallback from '@/components/errors/ErrorFallback'

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <ErrorFallback
      title="Terjadi kesalahan"
      description="Halaman gagal dimuat karena kesalahan yang tidak terduga. Coba muat ulang halaman atau kembali ke beranda."
      digest={error.digest}
      onRetry={retry}
      backHref="/"
      backLabel="← Kembali ke Beranda"
    />
  )
}
