import Link from 'next/link'
import { MISSION_LEVELS } from '@/data/regions'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MissionPage({ params }: { params: Promise<{ regionId: string }> }) {
  const { regionId } = await params
  const levels = MISSION_LEVELS[regionId]
  if (!levels) notFound()

  const regionNames: Record<string, string> = {
    'west-java': 'Bandung',
    'central-java': 'Semarang',
    'east-java': 'Surabaya',
  }
  const regionName = regionNames[regionId] ?? regionId

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        <h1 className="text-3xl font-bold tracking-widest mb-2">{regionName.toUpperCase()} ADVENTURE</h1>
        <h2 className="text-sm tracking-widest mb-8 text-gray-300">SELECT MISSION LEVEL</h2>

        <div className="grid grid-cols-5 gap-4">
          {levels.map((level) => (
            <div key={level.id} className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-400">{level.id}</span>

              {level.unlocked ? (
                <Link href={`/briefing/${regionId}/${level.id}`} className="w-full">
                  <div className="bg-[var(--bg-card)] border border-green-500 rounded overflow-hidden hover:border-green-300 transition-colors cursor-pointer">
                    <div className="h-20 bg-green-900/30 flex items-center justify-center text-xs text-green-400 p-2 text-center">
                      {level.title}
                    </div>
                    <div className="text-xs py-1 text-green-400 tracking-widest">UNLOCKED</div>
                  </div>
                </Link>
              ) : (
                <div className="w-full">
                  <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded overflow-hidden opacity-60">
                    <div className="h-20 bg-gray-800 flex items-center justify-center text-xs text-gray-500 p-2 text-center">
                      {level.title === 'Coming Soon' ? 'COMING SOON' : level.title}
                    </div>
                    <div className="text-xs py-1 text-gray-500 tracking-widest flex items-center justify-center gap-1">
                      <span>🔒</span> LOCKED
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-10 text-xs text-gray-400">
          <Link href="/region" className="flex items-center gap-2 hover:text-white transition-colors">
            <span className="text-red-400">←</span> [ESC] BACK
          </Link>
          <span className="text-green-400">[ENTER] START LEVEL</span>
        </div>
      </div>
    </main>
  )
}
