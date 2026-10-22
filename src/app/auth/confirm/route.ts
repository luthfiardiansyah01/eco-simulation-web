import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const requestedNext = searchParams.get('next')
  const fallbackNext =
    type === 'recovery' || (!requestedNext && code) ? '/reset-password' : '/'
  const next = getSafeRedirectPath(requestedNext ?? fallbackNext, origin)
  const isRecovery = type === 'recovery' || next.startsWith('/reset-password')
  const failurePath = isRecovery
    ? '/forgot-password?error=invalid_code'
    : '/login?error=auth_callback_failed'

  // Recovery links using the PKCE flow may arrive with an authorization code
  // instead of a token hash. Support both so the reset link keeps working even
  // if the project uses Supabase's default recovery redirect.
  if (code) {
    const response = NextResponse.redirect(new URL(next, origin))
    const supabase = createRouteClient(request, response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Supabase recovery code exchange failed:', error.message)
      return NextResponse.redirect(new URL(failurePath, origin))
    }

    return response
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL(failurePath, origin))
  }

  const response = NextResponse.redirect(new URL(next, origin))
  const supabase = createRouteClient(request, response)
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    console.error('Supabase email confirmation failed:', error.message)
    return NextResponse.redirect(new URL(failurePath, origin))
  }

  return response
}
