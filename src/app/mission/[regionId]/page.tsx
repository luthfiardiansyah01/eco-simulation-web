import Link from 'next/link'
import { MISSION_LEVELS } from '@/data/regions'
import { notFound } from 'next/navigation'
import { getProgressServer } from '@/lib/supabase/progress-server'

export const dynamic = 'force-dynamic'

export default async function MissionPage({ params }: { params: Promise<{ regionId: string }> }) {
  const { regionId } = await params
  const baseLevels = MISSION_LEVELS[regionId]
  if (!baseLevels) notFound()

  const regionMeta: Record<string, { name: string; emoji: string; color: string }> = {
    'west-java':    { name: 'West Java',    emoji: '🏔️', color: 'from-green-900/50 to-teal-900/30' },
    'central-java': { name: 'Central Java', emoji: '🌾', color: 'from-amber-900/50 to-green-900/30' },
    'east-java':    { name: 'East Java',    emoji: '🌊', color: 'from-blue-900/50 to-teal-900/30' },
  }
  const meta = regionMeta[regionId] ?? { name: regionId, emoji: '🌿', color: 'from-green-900/50 to-teal-900/30' }

  const progress = await getProgressServer(regionId)
  const completedLevels = progress?.completedLevels ?? []
  const currentLevel = progress?.currentLevel ?? 1

  const levels = baseLevels.map((level) => ({
    ...level,
    unlocked: level.id <= currentLevel,
    completed: completedLevels.includes(level.id),
  }))

  const completionPct = Math.round((completedLevels.length / baseLevels.length) * 100)

  return (
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-teal-900/15 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-6">
          <Link href="/region" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-4">
            ← Kembali ke Region
          </Link>

          <div className={`eco-card bg-gradient-to-r ${meta.color} p-5 mb-5`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{meta.emoji}</span>
                <div>
                  <h1 className="text-xl font-bold text-white">{meta.name}</h1>
                  <p className="text-xs text-[var(--text-muted)]">Pilih level misi untuk dimulai</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {progress && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⭐</span>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Research Points</p>
                      <p className="font-bold text-[var(--accent-amber)]">{progress.researchPoints} pts</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Progres</p>
                  <p className="font-bold text-[var(--accent-teal)]">{completedLevels.length}/{baseLevels.length} misi</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text-muted)]">Completion</span>
                <span className="text-[var(--accent-green)]">{completionPct}%</span>
              </div>
              <div className="progress-bar-bg h-2">
                <div className="progress-bar-fill h-2" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Mission grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {levels.map((level) => (
            <div key={level.id}>
              {level.unlocked ? (
                <Link href={`/briefing/${regionId}/${level.id}`}>
                  <div className={`eco-card p-3 cursor-pointer h-full flex flex-col items-center text-center
                    ${level.completed ? 'border-green-700/60' : 'border-[var(--border-glow)]/40'}`}>

                    {/* Level number */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2
                      ${level.completed
                        ? 'bg-green-700/30 text-[var(--accent-green)]'
                        : 'bg-teal-800/30 text-[var(--accent-teal)]'}`}>
                      {level.completed ? '✓' : level.id}
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] leading-tight flex-1 mb-2">
                      {level.title}
                    </p>

                    <span className={`badge text-[9px] ${level.completed ? 'badge-green' : 'badge-teal'}`}>
                      {level.completed ? 'SELESAI' : 'MAIN'}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="eco-card p-3 opacity-40 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-sm mb-2">
                    🔒
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight flex-1 mb-2">
                    {level.title === 'Coming Soon' ? '???' : level.title}
                  </p>
                  <span className="badge badge-gray text-[9px]">TERKUNCI</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Guest hint */}
        {!progress && (
          <div className="mt-5 eco-card p-4 flex items-center gap-3 border-[var(--accent-amber)]/30">
            <span className="text-xl">💡</span>
            <p className="text-xs text-[var(--text-muted)]">
              <Link href="/login" className="text-[var(--accent-amber)] hover:underline font-medium">Masuk</Link> untuk menyimpan progress dan membuka level berikutnya secara otomatis.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
