'use client'

import { catchError, type ErrorInfo } from 'next/error'
import ErrorFallback from './ErrorFallback'

type AuthErrorBoundaryProps = {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}

function getDigest(error: unknown) {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return undefined
  }

  const digest = (error as { digest?: unknown }).digest
  return typeof digest === 'string' ? digest : undefined
}

function AuthErrorFallback(
  {
    title = 'Halaman gagal dimuat',
    description = 'Terjadi kesalahan saat memuat halaman autentikasi. Coba lagi atau kembali ke halaman masuk.',
    backHref = '/login',
    backLabel = '← Kembali ke Masuk',
  }: AuthErrorBoundaryProps,
  { error, retry }: ErrorInfo
) {
  return (
    <ErrorFallback
      title={title}
      description={description}
      digest={getDigest(error)}
      onRetry={retry}
      backHref={backHref}
      backLabel={backLabel}
    />
  )
}

const AuthErrorBoundary = catchError<AuthErrorBoundaryProps>(AuthErrorFallback)

export default AuthErrorBoundary
