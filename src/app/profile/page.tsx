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
      const [all, unlocked] = await Promise.all([getAllAchievements(), getUserAchievements()])
      setAchievements(all)
      setUserAchievements(unlocked)
      setLoading(false)
    }
    load()
  }, [])

  const unlockedIds = new Set(userAchievements.map((u) => u.achievementId))
  const unlockedCount = unlockedIds.size
  const pct = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0

  const rankInfo = pct >= 100 ? { label: 'Eco Master', emoji: '🌟', color: 'badge-amber' }
    : pct >= 75 ? { label: 'Conservationist', emoji: '🦋', color: 'badge-teal' }
    : pct >= 40 ? { label: 'Ranger', emoji: '🌿', color: 'badge-green' }
    : { label: 'Recruit', emoji: '🌱', color: 'badge-gray' }

  return (
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full bg-green-900/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-teal-900/15 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-5">
          ← Kembali ke Menu
        </Link>

        {/* Profile header */}
        <div className="eco-card p-5 mb-5 bg-gradient-to-br from-green-900/40 to-teal-900/20">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0" style={{ background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.3)' }}>
              🌿
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-white truncate">{username || 'Player'}</h1>
                <span className={`badge ${rankInfo.color}`}>{rankInfo.emoji} {rankInfo.label}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Eco Researcher · EcoSim</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Achievement', value: `${unlockedCount}/${achievements.length}`, emoji: '🏆', color: 'var(--accent-amber)' },
            { label: 'Completion', value: `${pct}%`, emoji: '📊', color: 'var(--accent-teal)' },
            { label: 'Status', value: 'Aktif', emoji: '🌱', color: 'var(--accent-green)' },
          ].map(({ label, value, emoji, color }) => (
            <div key={label} className="eco-card p-3 text-center">
              <span className="text-xl">{emoji}</span>
              <p className="text-sm font-bold mt-1" style={{ color }}>{value}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>

        {/* Achievement progress bar */}
        <div className="eco-card p-4 mb-5">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-[var(--text-muted)]">Progress Achievement</span>
            <span className="text-[var(--accent-amber)] font-bold">{pct}%</span>
          </div>
          <div className="progress-bar-bg h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#eab308,#f97316)' }} />
          </div>
        </div>

        {/* Achievement grid */}
        <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-3">Daftar Achievement</h2>

        {loading ? (
          <div className="eco-card p-8 text-center">
            <span className="text-2xl float">⏳</span>
            <p className="text-sm text-[var(--text-muted)] mt-2">Memuat achievement...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((a) => {
              const unlocked = unlockedIds.has(a.id)
              const unlockedAt = userAchievements.find((u) => u.achievementId === a.id)?.unlockedAt
              return (
                <div key={a.id} className={`eco-card p-3 flex items-center gap-3 transition-all ${unlocked ? 'border-yellow-700/60' : 'opacity-40'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${unlocked ? '' : 'grayscale'}`}
                    style={{ background: unlocked ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)' }}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${unlocked ? 'text-[var(--accent-amber)]' : 'text-gray-500'}`}>
                      {a.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{a.description}</p>
                    {unlocked && unlockedAt && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        🗓 {new Date(unlockedAt).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                  {unlocked
                    ? <span className="badge badge-amber text-[9px] flex-shrink-0">✓ UNLOCK</span>
                    : <span className="badge badge-gray text-[9px] flex-shrink-0">🔒</span>
                  }
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
