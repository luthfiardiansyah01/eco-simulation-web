import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const [profiles, progress, results] = await Promise.all([
    supabase.from('profiles').select('count', { count: 'exact', head: true }),
    supabase.from('user_progress').select('count', { count: 'exact', head: true }),
    supabase.from('mission_results').select('count', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    status: 'ok',
    tables: {
      profiles: profiles.error ? `ERROR: ${profiles.error.message}` : 'OK',
      user_progress: progress.error ? `ERROR: ${progress.error.message}` : 'OK',
      mission_results: results.error ? `ERROR: ${results.error.message}` : 'OK',
    },
  })
}
