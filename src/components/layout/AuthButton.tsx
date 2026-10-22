'use client'

import { useEffect, useState } from 'react'
import SoundLink from '@/components/audio/SoundLink'
import { createClient } from '@/lib/supabase/client'
import { useSound } from '@/components/audio/SoundProvider'
import { User } from '@supabase/supabase-js'

export default function AuthButton() {
  const { play } = useSound()
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
    play('click')
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <SoundLink href="/profile" className="flex items-center gap-1.5 badge badge-green hover:opacity-80 transition-opacity">
          <span>🌿</span>
          <span>{user.email?.split('@')[0]}</span>
        </SoundLink>
        <button onClick={handleSignOut} className="badge badge-gray hover:badge-red transition-colors text-[10px]">
          Keluar
        </button>
      </div>
    )
  }

  return (
    <SoundLink href="/login" className="badge badge-teal hover:opacity-80 transition-opacity">
      Masuk
    </SoundLink>
  )
}
