import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = getSafeRedirectPath(searchParams.get('next'), origin)

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', origin)
    )
  }

  const response = NextResponse.redirect(new URL(next, origin))
  const supabase = createRouteClient(request, response)
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    console.error('Supabase email confirmation failed:', error.message)
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', origin)
    )
  }

  return response
}
