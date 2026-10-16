'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/profile" className="text-green-400 hover:text-green-300 transition-colors">
          {user.email?.split('@')[0].toUpperCase()}
        </Link>
        <button onClick={handleSignOut} className="text-gray-400 hover:text-red-400 text-xs transition-colors">
          [SIGN OUT]
        </button>
      </div>
    )
  }

  return (
    <Link href="/login" className="text-gray-400 hover:text-green-400 text-sm transition-colors">
      [SIGN IN]
    </Link>
  )
}
