import SoundLink from '@/components/audio/SoundLink'
import { AdventureSteps, BackLink, Breadcrumbs } from '@/components/layout/Navigation'
import { MISSIONS, MISSION_LEVELS } from '@/data/regions'
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getStartingStatus,
  parseDifficulty,
} from '@/lib/gameplay/difficulty'
import { notFound, redirect } from 'next/navigation'
import { getTranslator } from '@/lib/i18n-server'
import { localizeMission, regionDisplayName } from '@/lib/i18n-content'
import { formatNumber } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function BriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ regionId: string; level: string }>
  searchParams: Promise<{ difficulty?: string | string[] }>
}) {
  const { regionId, level } = await params
  const { difficulty: difficultyParam } = await searchParams
  const { language, t } = await getTranslator()
  const levelNumber = parseInt(level)
  const mission = MISSIONS.find((m) => m.regionId === regionId && m.level === levelNumber)
  if (!mission) {
    if (MISSION_LEVELS[regionId]?.some((missionLevel) => missionLevel.id === levelNumber)) {
      redirect(`/mission/${regionId}`)
    }
    notFound()
  }
  const localizedMission = localizeMission(mission, language)

  const difficulty = parseDifficulty(difficultyParam)
  const selectedDifficulty = DIFFICULTIES[difficulty]
  const startingStatus = getStartingStatus(mission, difficulty)

  const regionMeta: Record<string, { emoji: string; color: string }> = {
    'west-java':    { emoji: '🏔️', color: 'region-hero-green' },
    'central-java': { emoji: '🌾', color: 'region-hero-amber' },
    'east-java':    { emoji: '🌊', color: 'region-hero-blue' },
  }
  const meta = regionMeta[regionId] ?? { emoji: '🌿', color: 'region-hero-green' }

  const objectiveIcons = ['🎯', '🔬', '🌱', '💧', '📊', '🦋']
  const rewardIcons = ['⭐', '🏆', '💎', '🔓', '🌿', '📈']

  return (
    <main className="relative min-h-screen overflow-hidden p-6 pb-24">
      <div className="pointer-events-none absolute right-[-60px] top-[-60px] h-72 w-72 rounded-full bg-[var(--decor-green)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-60px] left-[-60px] h-72 w-72 rounded-full bg-[var(--decor-teal)] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-2xl">

        {/* Back nav */}
        <BackLink href={`/mission/${regionId}`} label={t('Kembali ke Daftar Misi')} />

        {/* Mission header */}
        <div className={`eco-card ${meta.color} mt-4 mb-4 p-5`}>
          <Breadcrumbs
            items={[
              { label: t('Beranda'), href: '/' },
              { label: t('Mode Petualangan'), href: '/region' },
              { label: regionDisplayName(regionId, language), href: `/mission/${regionId}` },
              { label: t('Level {level}', { level: mission.level }) },
            ]}
            ariaLabel={t('Navigasi halaman')}
          />

          <div className="mt-2 flex items-start gap-3">
            <span className="mt-1 text-4xl" aria-hidden="true">{meta.emoji}</span>
            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="badge badge-teal">
                  {t('Level {level}', { level: mission.level })}
                </span>
                <span className="badge badge-amber">
                  ⭐ +{mission.researchPoints} {t('pts')}
                </span>
              </div>
              <h1 className="mb-1 text-xl font-bold text-foreground">{localizedMission.title}</h1>
              <p className="text-xs text-[var(--text-muted)]">📍 {localizedMission.location}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--border-card)] pt-3">
            <AdventureSteps
              steps={[t('Wilayah'), t('Misi'), t('Briefing'), t('Bermain')]}
              current={2}
            />
          </div>
        </div>

        {/* Story */}
        <div className="eco-card mb-4 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">📖</span>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-green)]">{t('Latar Belakang')}</h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--foreground)] opacity-90">
            {localizedMission.story}
          </p>
        </div>

        {/* Objectives */}
        <div className="eco-card mb-4 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">🎯</span>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-teal)]">{t('Objektif Misi')}</h2>
          </div>
          <ul className="space-y-2.5">
            {localizedMission.objectives.map((obj, i) => (
              <li key={`${obj.metric}-${obj.target}`} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 text-base" aria-hidden="true">{objectiveIcons[i] ?? '•'}</span>
                <span className="text-sm text-[var(--foreground)] opacity-85">{obj.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How to play */}
        <div className="eco-card mb-4 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">🎮</span>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-teal)]">{t('Cara Bermain')}</h2>
          </div>
          <ol className="space-y-2.5">
            {[
              'Pantau status lingkungan di panel kiri saat bermain.',
              'Pilih aksi di panel bawah. Setiap aksi memakai kredit atau energi.',
              'Capai semua objektif sebelum sumber daya habis untuk menang.',
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] text-[10px] font-bold text-[var(--accent-teal)]">
                  {index + 1}
                </span>
                <span className="text-sm text-[var(--foreground)] opacity-85">{t(step)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {t('❔ Panduan lengkap juga bisa dibuka kapan saja lewat tombol Panduan di dalam permainan.')}
          </p>
        </div>

        {/* Rewards */}
        <div className="eco-card mb-4 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">🏆</span>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-amber)]">{t('Hadiah')}</h2>
          </div>
          <ul className="space-y-2.5">
            {localizedMission.rewards.map((reward, i) => (
              <li key={reward} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 text-base" aria-hidden="true">{rewardIcons[i] ?? '•'}</span>
                <span className="text-sm text-[var(--foreground)] opacity-85">{reward}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Difficulty */}
        <div className="eco-card mb-4 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">⚙️</span>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-teal)]">{t('Tingkat Kesulitan')}</h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t('Tingkat kesulitan')}>
            {DIFFICULTY_ORDER.map((id) => {
              const option = DIFFICULTIES[id]
              const active = id === difficulty

              return (
                <SoundLink
                  key={id}
                  href={`/briefing/${regionId}/${level}?difficulty=${id}`}
                  scroll={false}
                  aria-current={active ? 'true' : undefined}
                  className="rounded-xl border p-3 transition-all active:scale-[0.98]"
                  style={{
                    borderColor: active ? option.accent : 'var(--border-card)',
                    background: active ? 'var(--surface-selected)' : 'var(--surface-muted)',
                    boxShadow: active ? `0 0 0 1px ${option.accent}` : undefined,
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-base" aria-hidden="true">{option.emoji}</span>
                    {active && (
                      <span className="text-[8px] font-bold tracking-wide" style={{ color: option.accent }}>
                        {t('DIPILIH')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground">{t(option.label)}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-[var(--text-muted)]">
                    {t(option.tagline)}
                  </p>
                </SoundLink>
              )
            })}
          </div>

          <div
            className="mt-3 rounded-lg p-3"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-card)' }}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm" aria-hidden="true">{selectedDifficulty.emoji}</span>
              <div>
                <p className="text-[11px] font-semibold text-foreground">
                  {t('Mode {label}', { label: t(selectedDifficulty.label) })}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-[var(--text-muted)]">
                  {t(selectedDifficulty.description)}
                </p>
              </div>
            </div>

            <div data-testid="starting-stats" className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] sm:grid-cols-4">
              {[
                [t('☁️ Polusi'), `${startingStatus.pollution}%`],
                [t('🦋 Bio'), `${startingStatus.biodiversity}%`],
                [t('💧 Air'), `${startingStatus.waterQuality}%`],
                [t('🐟 Ikan'), `${startingStatus.fishPopulation}%`],
                [t('🌳 Pohon'), `${startingStatus.trees}`],
                [t('🚁 Drone'), `${startingStatus.drones}`],
                [t('💰 Kredit'), formatNumber(startingStatus.credits, language)],
                [t('⚡ Energi'), `${startingStatus.energy}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-2 text-[10px] text-[var(--text-muted)]">
            {t('Kesulitan hanya memengaruhi kondisi awal dan sumber daya. Objektif dan hadiah tetap sama.')}
          </p>
        </div>

        {/* Sticky action bar — always reachable without scrolling */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border-card)] bg-[var(--background)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-3 px-6 py-3">
            <SoundLink
              href={`/mission/${regionId}`}
              className="eco-btn-secondary flex-1 py-3 text-center text-sm"
            >
              {t('← Kembali')}
            </SoundLink>
            <SoundLink
              href={`/play/${regionId}/${level}?difficulty=${difficulty}`}
              className="eco-btn-primary text-center text-sm"
              style={{ flex: 2, paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
              sound="start"
              data-testid="start-simulation"
            >
              {t('▶ Mulai Simulasi')}
            </SoundLink>
          </div>
        </div>
      </div>
    </main>
  )
}
