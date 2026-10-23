import ForgotPasswordForm from './ForgotPasswordForm'
import AuthErrorBoundary from '@/components/errors/AuthErrorBoundary'
import { getTranslator } from '@/lib/i18n-server'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code:
    'Tautan atau kode reset tidak valid atau sudah kedaluwarsa. Minta kode baru.',
  session_missing:
    'Sesi reset tidak ditemukan. Masukkan email dan minta kode verifikasi baru.',
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { t } = await getTranslator()
  const initialError = error
    ? t(ERROR_MESSAGES[error] ?? 'Terjadi kesalahan. Coba lagi.')
    : ''

  return (
    <AuthErrorBoundary
      title={t('Halaman pemulihan gagal dimuat')}
      description={t(
        'Terjadi kesalahan saat memuat form pemulihan password. Coba lagi atau kembali ke halaman masuk.'
      )}
    >
      <ForgotPasswordForm initialError={initialError} />
    </AuthErrorBoundary>
  )
}
