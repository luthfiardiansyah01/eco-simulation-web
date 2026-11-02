import SoundLink from '@/components/audio/SoundLink'
import Image from 'next/image'
import { AdventureSteps, BackLink, Breadcrumbs } from '@/components/layout/Navigation'
import { REGIONS, MISSION_LEVELS } from '@/data/regions'
import { getAllProgressServer } from '@/lib/supabase/progress-server'
import { getTranslator } from '@/lib/i18n-server'
import {
  localizeRegion,
  regionDisplayName,
} from '@/lib/i18n-content'

export const dynamic = 'force-dynamic'

export default async function RegionPage() {
  const { language, t } = await getTranslator()
  const allProgress = await getAllProgressServer()

  const regions = REGIONS.map((region) => {
    const progress = allProgress.find((p) => p.regionId === region.id)
    const totalLevels = MISSION_LEVELS[region.id]?.length ?? 10
    const completedCount = progress?.completedLevels.length ?? 0
    const completionPct = Math.round((completedCount / totalLevels) * 100)
    return {
      ...localizeRegion(region, language),
      completionPct,
      completedCount,
      totalLevels,
    }
  })

  // The adventure continues wherever the player left off: the first unlocked
  // region that is not finished yet. Falling back to the last region keeps a
  // fully completed save pointing somewhere sensible.
  const currentRegionId =
    regions.find((region) => region.unlocked && region.completionPct < 100)?.id
    ?? regions[regions.length - 1]?.id

  const regionEmojis: Record<string, string> = {
    'west-java': '🏔️',
    'central-java': '🌾',
    'east-java': '🌊',
  }

  return (
    <main className="relative min-h-screen overflow-hidden p-6">
      <div className="pointer-events-none absolute right-[-60px] top-[-60px] h-72 w-72 rounded-full bg-[var(--decor-green)] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6">
          <BackLink href="/" label={t('Kembali ke Menu')} />

          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)]/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none" aria-hidden="true">🗺️</span>
              <div>
                <Breadcrumbs
                  items={[
                    { label: t('Beranda'), href: '/' },
                    { label: t('Mode Petualangan') },
                  ]}
                  ariaLabel={t('Navigasi halaman')}
                />
                <h1 className="mt-1 text-2xl font-bold text-foreground">{t('Mode Petualangan')}</h1>
                <p className="text-xs text-[var(--text-muted)]">{t('Pilih wilayah untuk memulai misi')}</p>
              </div>
            </div>

            <div className="sm:max-w-[320px]">
              <AdventureSteps
                steps={[t('Wilayah'), t('Misi'), t('Briefing'), t('Bermain')]}
                current={0}
              />
            </div>
          </div>
        </div>

        {/* Region Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {regions.map((region, idx) => {
            const emoji = regionEmojis[region.id] ?? '🌿'
            const isLocked = !region.unlocked
            const isCurrent = region.id === currentRegionId

            return (
              <div key={region.id} className="relative">
                <div
                  className={`eco-card card-lift flex h-full flex-col overflow-hidden ${
                    isLocked ? 'opacity-70' : ''
                  }`}
                  style={
                    isCurrent && !isLocked
                      ? { borderColor: 'var(--accent-teal)', boxShadow: 'var(--glow-teal)' }
                      : undefined
                  }
                >
                  {isCurrent && !isLocked && (
                    <div className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-teal)]" />
                  )}

                  {/* Image */}
                  <div className="group relative h-44 overflow-hidden rounded-t-2xl">
                    <Image
                      src={region.image}
                      alt={`${region.name} — ${region.location}`}
                      fill
                      quality={90}
                      loading="eager"
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f1a]/85 via-[#0d1f1a]/10 to-transparent" />

                    {/* Region number badge */}
                    <div className="absolute left-3 top-3">
                      <span className="badge badge-teal chip-on-image">
                        {t('Wilayah {number}', { number: idx + 1 })}
                      </span>
                    </div>

                    {/* Current region reminder, placed on the dark gradient so
                        it stays readable over the artwork title. */}
                    {isCurrent && !isLocked && (
                      <div className="absolute bottom-3 left-3">
                        <span className="badge badge-amber chip-on-image">{t('★ Lanjut di sini')}</span>
                      </div>
                    )}

                    {/* Lock overlay — no blur so the artwork stays readable */}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--locked-overlay)]">
                        <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)]/95 px-3 py-2 text-center">
                          <div className="mb-0.5 text-2xl" aria-hidden="true">🔒</div>
                          <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                            {t('Selesaikan region sebelumnya')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Completion badge */}
                    {region.completionPct === 100 && (
                      <div className="absolute right-3 top-3">
                        <span className="badge badge-amber chip-on-image">{t('✓ SELESAI')}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xl" aria-hidden="true">{emoji}</span>
                      <h2 className="text-base font-bold text-foreground">{region.name}</h2>
                    </div>
                    <p className="mb-3 text-xs text-[var(--text-muted)]">📍 {region.location}</p>

                    {/* Ecosystem tags */}
                    <div className="mb-4 flex flex-wrap gap-1">
                      {region.ecosystem.slice(0, 3).map((item) => (
                        <span key={item} className="badge badge-green px-2 py-0.5 text-[10px]">{item}</span>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">
                          {t('{completed}/{total} misi', {
                            completed: region.completedCount,
                            total: region.totalLevels,
                          })}
                        </span>
                        <span className={region.completionPct > 0 ? 'font-semibold text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'}>
                          {region.completionPct}%
                        </span>
                      </div>
                      <div className="progress-bar-bg h-1.5">
                        <div className="progress-bar-fill h-1.5" style={{ width: `${region.completionPct}%` }} />
                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-auto">
                      {isLocked ? (
                        <button
                          type="button"
                          disabled
                          className="eco-btn-secondary w-full cursor-not-allowed py-2.5 text-xs opacity-50"
                        >
                          {t('🔒 Terkunci')}
                        </button>
                      ) : (
                        <SoundLink
                          href={`/mission/${region.id}`}
                          sound="start"
                          className="eco-btn-primary block w-full py-2.5 text-center text-sm"
                        >
                          {region.completionPct > 0 ? t('▶ Lanjutkan') : t('▶ Mulai')}
                        </SoundLink>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* XP hint */}
        <div className="eco-card mt-8 flex items-center gap-3 p-4">
          <span className="text-2xl" aria-hidden="true">💡</span>
          <div>
            <p className="text-sm font-medium text-foreground">{t('Tips')}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {t(
                'Selesaikan semua misi di {region} untuk membuka {next}. Kumpulkan XP sebanyak mungkin!',
                {
                  region: regionDisplayName('west-java', language),
                  next: regionDisplayName('central-java', language),
                }
              )}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
