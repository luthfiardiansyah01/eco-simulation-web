import SoundLink from '@/components/audio/SoundLink'
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

  const regionEmojis: Record<string, string> = {
    'west-java': '🏔️',
    'central-java': '🌾',
    'east-java': '🌊',
  }

  return (
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full bg-[var(--decor-green)] blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-8">
          <SoundLink href="/" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-5">
            ← Kembali ke Menu
          </SoundLink>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗺️</span>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Adventure Mode</h1>
              <p className="text-xs text-[var(--text-muted)]">Pilih wilayah untuk memulai misi</p>
            </div>
          </div>
        </div>

        {/* Region Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {regions.map((region, idx) => {
            const emoji = regionEmojis[region.id] ?? '🌿'
            const isLocked = !region.unlocked

            return (
              <div key={region.id} className="relative">
                <div className={`eco-card overflow-hidden flex flex-col h-full ${isLocked ? 'opacity-60' : ''}`}>

                  {/* Image */}
                  <div className="relative h-44 overflow-hidden rounded-t-2xl">
                    <Image
                      src={region.image}
                      alt={region.location}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f1a]/80 via-transparent to-transparent" />

                    {/* Region number badge */}
                    <div className="absolute top-3 left-3">
                      <span className="badge badge-teal">Region {idx + 1}</span>
                    </div>

                    {/* Lock overlay */}
                    {isLocked && (
                      <div className="locked-overlay absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl mb-1">🔒</div>
                          <p className="text-xs text-[var(--text-muted)]">Selesaikan region sebelumnya</p>
                        </div>
                      </div>
                    )}

                    {/* Completion badge */}
                    {region.completionPct === 100 && (
                      <div className="absolute top-3 right-3">
                        <span className="badge badge-amber">✓ SELESAI</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{emoji}</span>
                      <h3 className="font-bold text-foreground text-base">{region.name}</h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-3">{region.location}</p>

                    {/* Ecosystem tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {region.ecosystem.slice(0, 3).map((item) => (
                        <span key={item} className="badge badge-green text-[10px] py-0.5 px-2">{item}</span>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[var(--text-muted)]">{region.completedCount}/{region.totalLevels} misi</span>
                        <span className={region.completionPct > 0 ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'}>
                          {region.completionPct}%
                        </span>
                      </div>
                      <div className="progress-bar-bg h-1.5">
                        <div className="progress-bar-fill h-1.5" style={{ width: `${region.completionPct}%` }} />
                      </div>
                    </div>

                    {/* Button */}
                    {isLocked ? (
                      <button className="eco-btn-secondary w-full py-2.5 text-xs cursor-not-allowed opacity-50">
                        🔒 Terkunci
                      </button>
                    ) : (
                      <SoundLink href={`/mission/${region.id}`} className="block" sound="start">
                        <button className="eco-btn-primary w-full py-2.5 text-sm">
                          {region.completionPct > 0 ? '▶ Lanjutkan' : '▶ Mulai'}
                        </button>
                      </SoundLink>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* XP hint */}
        <div className="mt-8 eco-card p-4 flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm text-foreground font-medium">Tips</p>
            <p className="text-xs text-[var(--text-muted)]">Selesaikan semua misi di West Java untuk membuka Central Java. Kumpulkan XP sebanyak mungkin!</p>
          </div>
        </div>
      </div>
    </main>
  )
}
