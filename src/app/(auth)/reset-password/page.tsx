import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordForm from './ResetPasswordForm'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=session_missing')
  }

  return <ResetPasswordForm email={user.email ?? ''} />
}
