import { NextResponse, type NextRequest } from 'next/server'
import { createRouteClient } from '@/lib/supabase/route'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = getSafeRedirectPath(searchParams.get('next'), origin)

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', origin)
    )
  }

  const response = NextResponse.redirect(new URL(next, origin))
  const supabase = createRouteClient(request, response)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Supabase auth callback failed:', error.message)
    return NextResponse.redirect(
      new URL('/login?error=auth_callback_failed', origin)
    )
  }

  return response
}
