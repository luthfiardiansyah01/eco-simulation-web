import SoundLink from '@/components/audio/SoundLink'
import { AdventureSteps, BackLink, Breadcrumbs } from '@/components/layout/Navigation'
import { MISSIONS, MISSION_LEVELS } from '@/data/regions'
import { notFound } from 'next/navigation'
import { getProgressServer } from '@/lib/supabase/progress-server'
import { getTranslator } from '@/lib/i18n-server'
import {
  localizeMissionLevel,
  regionDisplayName,
} from '@/lib/i18n-content'

export const dynamic = 'force-dynamic'

export default async function MissionPage({ params }: { params: Promise<{ regionId: string }> }) {
  const { regionId } = await params
  const { language, t } = await getTranslator()
  const baseLevels = MISSION_LEVELS[regionId]
  if (!baseLevels) notFound()

  const regionMeta: Record<string, { emoji: string; color: string }> = {
    'west-java':    { emoji: '🏔️', color: 'region-hero-green' },
    'central-java': { emoji: '🌾', color: 'region-hero-amber' },
    'east-java':    { emoji: '🌊', color: 'region-hero-blue' },
  }
  const meta = {
    ...(regionMeta[regionId] ?? { emoji: '🌿', color: 'region-hero-green' }),
    name: regionDisplayName(regionId, language),
  }

  const progress = await getProgressServer(regionId)
  const completedLevels = progress?.completedLevels ?? []
  const currentLevel = progress?.currentLevel ?? 1
  const availableLevels = new Set(
    MISSIONS.filter((mission) => mission.regionId === regionId).map((mission) => mission.level)
  )

  const levels = baseLevels.map((level) => ({
    ...localizeMissionLevel(level, language),
    unlocked: availableLevels.has(level.id) && level.id <= currentLevel,
    completed: completedLevels.includes(level.id),
  }))

  const completionPct = Math.round((completedLevels.length / baseLevels.length) * 100)

  return (
    <main className="relative min-h-screen overflow-hidden p-6">
      <div className="pointer-events-none absolute bottom-[-60px] left-[-60px] h-72 w-72 rounded-full bg-[var(--decor-teal)] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-6">
          <BackLink href="/region" label={t('Kembali ke Region')} />

          <div className={`eco-card ${meta.color} mt-4 mb-5 p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <Breadcrumbs
                  items={[
                    { label: t('Beranda'), href: '/' },
                    { label: t('Mode Petualangan'), href: '/region' },
                    { label: meta.name },
                  ]}
                  ariaLabel={t('Navigasi halaman')}
                />
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-4xl" aria-hidden="true">{meta.emoji}</span>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{meta.name}</h1>
                    <p className="text-xs text-[var(--text-muted)]">{t('Pilih level misi untuk dimulai')}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {progress && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg" aria-hidden="true">⭐</span>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">{t('Poin Riset')}</p>
                      <p className="font-bold text-[var(--accent-amber)]">{progress.researchPoints} {t('pts')}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t('Progres')}</p>
                  <p className="font-bold text-[var(--accent-teal)]">
                    {t('{completed}/{total} misi', {
                      completed: completedLevels.length,
                      total: baseLevels.length,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t('Penyelesaian')}</span>
                <span className="font-semibold text-[var(--accent-green)]">{completionPct}%</span>
              </div>
              <div className="progress-bar-bg h-2">
                <div className="progress-bar-fill h-2" style={{ width: `${completionPct}%` }} />
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--border-card)] pt-3">
              <AdventureSteps
                steps={[t('Wilayah'), t('Misi'), t('Briefing'), t('Bermain')]}
                current={1}
              />
            </div>
          </div>
        </div>

        {/* Current level guidance */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('Daftar Misi')}</h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            {t('Level aktif: {level}', { level: Math.min(currentLevel, baseLevels.length) })}
          </p>
        </div>

        {/* Mission grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {levels.map((level) => {
            const isCurrent = level.id === currentLevel && !level.completed

            return (
              <div key={level.id}>
                {level.unlocked ? (
                  <SoundLink
                    href={`/briefing/${regionId}/${level.id}`}
                    sound="start"
                    className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)]"
                  >
                    <div
                      className={`eco-card card-lift flex h-full cursor-pointer flex-col items-center p-3 text-center ${
                        level.completed
                          ? 'border-green-700/60'
                          : isCurrent
                            ? 'border-[var(--accent-teal)]'
                            : 'border-[var(--border-glow)]/40'
                      }`}
                      style={isCurrent ? { boxShadow: 'var(--glow-teal)' } : undefined}
                    >
                      {isCurrent && (
                        <span className="mb-1 rounded-full bg-[var(--surface-selected)] px-2 py-0.5 text-[9px] font-semibold text-[var(--accent-teal)]">
                          {t('LANJUTKAN')}
                        </span>
                      )}

                      {/* Level number */}
                      <div
                        className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                          level.completed
                            ? 'bg-[var(--surface-selected)] text-[var(--accent-green)]'
                            : isCurrent
                              ? 'bg-[var(--accent-teal)] text-[#062016]'
                              : 'bg-[var(--surface-muted)] text-[var(--accent-teal)]'
                        }`}
                      >
                        {level.completed ? '✓' : level.id}
                      </div>

                      <p className="mb-2 flex-1 text-[11px] leading-tight text-[var(--text-secondary)]">
                        {level.title}
                      </p>

                      <span className={`badge text-[9px] ${level.completed ? 'badge-green' : 'badge-teal'}`}>
                        {level.completed ? t('SELESAI') : isCurrent ? t('MAIN') : t('BUKA')}
                      </span>
                    </div>
                  </SoundLink>
                ) : (
                  <div className="eco-card flex h-full flex-col items-center p-3 text-center opacity-40">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-sm text-[var(--text-muted)]">
                      🔒
                    </div>
                    <p className="mb-2 flex-1 text-[11px] leading-tight text-[var(--text-muted)]">
                      {level.title === 'Coming Soon' || level.title === 'Segera Hadir'
                        ? '???'
                        : level.title}
                    </p>
                    <span className="badge badge-gray text-[9px]">{t('TERKUNCI')}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Guest hint */}
        {!progress && (
          <div className="eco-card mt-5 flex items-center gap-3 border-[var(--accent-amber)]/30 p-4">
            <span className="text-xl" aria-hidden="true">💡</span>
            <p className="text-xs text-[var(--text-muted)]">
              <SoundLink href="/login" className="font-medium text-[var(--accent-amber)] hover:underline">
                {t('Masuk')}
              </SoundLink>{' '}
              {t('untuk menyimpan progress dan membuka level berikutnya secara otomatis.')}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
