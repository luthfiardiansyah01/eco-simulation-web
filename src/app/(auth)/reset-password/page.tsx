import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordForm from './ResetPasswordForm'
import AuthErrorBoundary from '@/components/errors/AuthErrorBoundary'
import { getTranslator } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=session_missing')
  }

  const { t } = await getTranslator()

  return (
    <AuthErrorBoundary
      title={t('Halaman reset password gagal dimuat')}
      description={t(
        'Terjadi kesalahan saat memuat form password baru. Coba lagi atau minta kode verifikasi baru.'
      )}
      backHref="/forgot-password"
      backLabel={t('Minta Kode Baru')}
    >
      <ResetPasswordForm email={user.email ?? ''} />
    </AuthErrorBoundary>
  )
}
