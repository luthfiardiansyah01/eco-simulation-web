'use client'

import { catchError, type ErrorInfo } from 'next/error'
import ErrorFallback from './ErrorFallback'
import { useI18n } from '@/components/settings/PreferencesProvider'

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
    title,
    description,
    backHref = '/login',
    backLabel,
  }: AuthErrorBoundaryProps,
  { error, retry }: ErrorInfo
) {
  const { t } = useI18n()

  return (
    <ErrorFallback
      title={title ?? t('Halaman gagal dimuat')}
      description={
        description ??
        t(
          'Terjadi kesalahan saat memuat halaman autentikasi. Coba lagi atau kembali ke halaman masuk.'
        )
      }
      digest={getDigest(error)}
      onRetry={retry}
      backHref={backHref}
      backLabel={backLabel ?? t('← Kembali ke Masuk')}
    />
  )
}

const AuthErrorBoundary = catchError<AuthErrorBoundaryProps>(AuthErrorFallback)

export default AuthErrorBoundary
