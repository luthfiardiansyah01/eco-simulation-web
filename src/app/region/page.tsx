import Link from 'next/link'
import Image from 'next/image'
import { REGIONS, MISSION_LEVELS } from '@/data/regions'
import { getAllProgressServer } from '@/lib/supabase/progress-server'

export const dynamic = 'force-dynamic'

export default async function RegionPage() {
  const allProgress = await getAllProgressServer()

  const regions = REGIONS.map((region) => {
    const progress = allProgress.find((p) => p.regionId === region.id)
    const totalLevels = MISSION_LEVELS[region.id]?.length ?? 10
    const completedCount = progress?.completedLevels.length ?? 0
    const completionPct = Math.round((completedCount / totalLevels) * 100)
    return { ...region, completionPct, completedCount, totalLevels }
  })

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        <h1 className="text-4xl font-bold tracking-widest mb-4">ECO-SIMULATION INTERFACE</h1>
        <div className="flex justify-between text-sm mb-10">
          <span>Status: <span className="text-green-400">ONLINE</span></span>
        </div>

        <h2 className="text-sm tracking-widest mb-8 text-gray-300">SELECT ADVENTURE REGION</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {regions.map((region) => (
            <div
              key={region.id}
              className={`bg-[var(--bg-card)] border border-[var(--border-card)] rounded p-4 flex flex-col transition-colors
                ${region.unlocked ? 'hover:border-green-600' : 'opacity-50'}`}
            >
              <h3 className="text-base font-bold tracking-widest mb-3">{region.name.toUpperCase()}</h3>

              {/* Region image */}
              <div className="rounded mb-3 h-36 relative overflow-hidden bg-gray-700">
                <Image
                  src={region.image}
                  alt={region.location}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {region.completionPct > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600/60">
                    <div
                      className="h-1 bg-green-500 transition-all"
                      style={{ width: `${region.completionPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="flex justify-between text-xs mb-3">
                <span className="text-gray-400">{region.completedCount}/{region.totalLevels} levels</span>
                <span className={region.completionPct > 0 ? 'text-green-400' : 'text-gray-500'}>
                  {region.completionPct}%
                </span>
              </div>

              <ul className="text-xs text-gray-300 space-y-1 mb-4 flex-1 text-left">
                {region.ecosystem.map((item) => (
                  <li key={item}>› {item}</li>
                ))}
              </ul>

              {region.unlocked ? (
                <Link href={`/mission/${region.id}`}>
                  <button className="w-full border border-gray-400 text-sm py-1 hover:bg-white hover:text-black transition-colors">
                    PLAY
                  </button>
                </Link>
              ) : (
                <button className="w-full border border-gray-600 text-sm py-1 text-gray-500 cursor-not-allowed">
                  LOCKED
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-10 text-xs text-gray-400">
          <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
            <span className="text-red-400">←</span> [ESC] BACK
          </Link>
          <span>SELECT REGION TO CONTINUE</span>
        </div>
      </div>
    </main>
  )
}
