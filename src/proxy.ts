import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Supabase environment variables are missing; session refresh is disabled.'
    )
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )

        response = NextResponse.next({ request })

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )

        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        )
      },
    },
  })

  try {
    // Verifies the JWT and refreshes the session when needed. Do not use
    // getSession() on the server: its user data is not trustworthy.
    await supabase.auth.getClaims()
  } catch (error) {
    // Keep guest play and public pages available if Supabase is unreachable.
    console.error('Supabase session refresh failed:', error)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|html|webmanifest|woff|woff2|ttf|otf)$).*)',
  ],
}
