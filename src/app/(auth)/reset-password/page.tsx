import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordForm from './ResetPasswordForm'
import AuthErrorBoundary from '@/components/errors/AuthErrorBoundary'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=session_missing')
  }

  return (
    <AuthErrorBoundary
      title="Halaman reset password gagal dimuat"
      description="Terjadi kesalahan saat memuat form password baru. Coba lagi atau minta kode verifikasi baru."
      backHref="/forgot-password"
      backLabel="Minta Kode Baru"
    >
      <ResetPasswordForm email={user.email ?? ''} />
    </AuthErrorBoundary>
  )
}
