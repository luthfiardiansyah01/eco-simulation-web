import Link from 'next/link'
import { MISSION_LEVELS } from '@/data/regions'
import { notFound } from 'next/navigation'
import { getProgressServer } from '@/lib/supabase/progress-server'

export const dynamic = 'force-dynamic'

export default async function MissionPage({ params }: { params: Promise<{ regionId: string }> }) {
  const { regionId } = await params
  const baseLevels = MISSION_LEVELS[regionId]
  if (!baseLevels) notFound()

  const regionNames: Record<string, string> = {
    'west-java': 'Bandung',
    'central-java': 'Semarang',
    'east-java': 'Surabaya',
  }
  const regionName = regionNames[regionId] ?? regionId

  // Ambil progress dari Supabase; guest hanya bisa level 1
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
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        <h1 className="text-3xl font-bold tracking-widest mb-1">{regionName.toUpperCase()} ADVENTURE</h1>

        {/* Progress bar region */}
        <div className="flex items-center gap-3 justify-center mb-6 text-xs text-gray-400">
          <span>COMPLETION</span>
          <div className="w-48 bg-gray-700 h-1.5 rounded">
            <div
              className="h-1.5 rounded bg-green-500 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-green-400">{completionPct}%</span>
          {progress && (
            <span className="text-yellow-400 ml-2">⭐ {progress.researchPoints} pts</span>
          )}
        </div>

        <h2 className="text-sm tracking-widest mb-6 text-gray-300">SELECT MISSION LEVEL</h2>

        <div className="grid grid-cols-5 gap-4">
          {levels.map((level) => (
            <div key={level.id} className="flex flex-col items-center gap-1">
              <span className="text-sm text-gray-400">{level.id}</span>

              {level.unlocked ? (
                <Link href={`/briefing/${regionId}/${level.id}`} className="w-full">
                  <div className={`border rounded overflow-hidden transition-colors cursor-pointer
                    ${level.completed
                      ? 'bg-green-900/20 border-green-700 hover:border-green-400'
                      : 'bg-[var(--bg-card)] border-green-500 hover:border-green-300'
                    }`}>
                    <div className="h-20 flex items-center justify-center text-xs p-2 text-center text-green-400">
                      {level.title}
                    </div>
                    <div className={`text-xs py-1 tracking-widest ${level.completed ? 'text-green-600' : 'text-green-400'}`}>
                      {level.completed ? '✓ DONE' : 'UNLOCKED'}
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="w-full opacity-50">
                  <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded overflow-hidden">
                    <div className="h-20 bg-gray-800 flex items-center justify-center text-xs text-gray-500 p-2 text-center">
                      {level.title === 'Coming Soon' ? 'COMING SOON' : level.title}
                    </div>
                    <div className="text-xs py-1 text-gray-500 tracking-widest flex items-center justify-center gap-1">
                      🔒 LOCKED
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!progress && (
          <p className="mt-6 text-xs text-yellow-500">
            <Link href="/login" className="underline hover:text-yellow-300">Sign in</Link> untuk menyimpan progress dan unlock level berikutnya.
          </p>
        )}

        <div className="flex justify-between mt-8 text-xs text-gray-400">
          <Link href="/region" className="flex items-center gap-2 hover:text-white transition-colors">
            <span className="text-red-400">←</span> [ESC] BACK
          </Link>
          <span className="text-green-400">[ENTER] START LEVEL</span>
        </div>
      </div>
    </main>
  )
}
