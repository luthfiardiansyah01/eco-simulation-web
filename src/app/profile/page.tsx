'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Achievement, UserAchievement } from '@/types'
import { getAllAchievements, getUserAchievements } from '@/lib/supabase/achievements'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [username, setUsername] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUsername(user.email?.split('@')[0] ?? 'Player')

      const [all, unlocked] = await Promise.all([
        getAllAchievements(),
        getUserAchievements(),
      ])
      setAchievements(all)
      setUserAchievements(unlocked)
      setLoading(false)
    }
    load()
  }, [])

  const unlockedIds = new Set(userAchievements.map((u) => u.achievementId))
  const unlockedCount = unlockedIds.size

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold tracking-widest mb-1 text-center">RESEARCHER PROFILE</h1>
        {username && (
          <p className="text-center text-green-400 text-sm tracking-widest mb-6">{username.toUpperCase()}</p>
        )}

        {/* Achievement summary */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 tracking-widest mb-1">ACHIEVEMENTS</p>
            <p className="text-2xl font-bold text-yellow-400">{unlockedCount} <span className="text-sm text-gray-400">/ {achievements.length}</span></p>
          </div>
          <div className="text-4xl">🏆</div>
        </div>

        {/* Achievement grid */}
        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((a) => {
              const unlocked = unlockedIds.has(a.id)
              const unlockedAt = userAchievements.find((u) => u.achievementId === a.id)?.unlockedAt
              return (
                <div
                  key={a.id}
                  className={`border rounded p-3 flex items-center gap-3 transition-colors
                    ${unlocked
                      ? 'bg-yellow-900/20 border-yellow-700'
                      : 'bg-[var(--bg-card)] border-[var(--border-card)] opacity-50'
                    }`}
                >
                  <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{a.description}</p>
                    {unlocked && unlockedAt && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(unlockedAt).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                  {unlocked && <span className="text-green-400 text-xs">✓</span>}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-between mt-8 text-xs text-gray-400">
          <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
            <span className="text-red-400">←</span> [ESC] BACK
          </Link>
        </div>
      </div>
    </main>
  )
}
