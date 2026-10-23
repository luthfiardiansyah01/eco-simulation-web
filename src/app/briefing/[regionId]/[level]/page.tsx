import SoundLink from '@/components/audio/SoundLink'
import { MISSIONS } from '@/data/regions'
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getStartingStatus,
  parseDifficulty,
} from '@/lib/gameplay/difficulty'
import { notFound } from 'next/navigation'
import { getTranslator } from '@/lib/i18n-server'
import { localizeMission } from '@/lib/i18n-content'
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
  const mission = MISSIONS.find((m) => m.regionId === regionId && m.level === parseInt(level))
  if (!mission) notFound()
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
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full bg-[var(--decor-green)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-[var(--decor-teal)] blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Back nav */}
        <SoundLink href={`/mission/${regionId}`} className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-5">
          {t('← Kembali ke Daftar Misi')}
        </SoundLink>

        {/* Mission header */}
        <div className={`eco-card ${meta.color} p-5 mb-4`}>
          <div className="flex items-start gap-3">
            <span className="text-4xl mt-1">{meta.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="badge badge-teal">
                  {t('Level {level}', { level: mission.level })}
                </span>
                <span className="badge badge-amber">
                  ⭐ +{mission.researchPoints} {t('pts')}
                </span>
              </div>
              <h1 className="text-xl font-bold text-foreground mb-1">{localizedMission.title}</h1>
              <p className="text-xs text-[var(--text-muted)]">📍 {localizedMission.location}</p>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="eco-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📖</span>
            <h2 className="text-sm font-semibold text-[var(--accent-green)] tracking-wide uppercase">{t('Latar Belakang')}</h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--foreground)] opacity-90">
            {localizedMission.story}
          </p>
        </div>

        {/* Objectives */}
        <div className="eco-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h2 className="text-sm font-semibold text-[var(--accent-teal)] tracking-wide uppercase">{t('Objektif Misi')}</h2>
          </div>
          <ul className="space-y-2.5">
            {localizedMission.objectives.map((obj, i) => (
              <li key={`${obj.metric}-${obj.target}`} className="flex items-start gap-3">
                <span className="text-base mt-0.5 flex-shrink-0">{objectiveIcons[i] ?? '•'}</span>
                <span className="text-sm text-[var(--foreground)] opacity-85">{obj.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rewards */}
        <div className="eco-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🏆</span>
            <h2 className="text-sm font-semibold text-[var(--accent-amber)] tracking-wide uppercase">{t('Hadiah')}</h2>
          </div>
          <ul className="space-y-2.5">
            {localizedMission.rewards.map((reward, i) => (
              <li key={reward} className="flex items-start gap-3">
                <span className="text-base mt-0.5 flex-shrink-0">{rewardIcons[i] ?? '•'}</span>
                <span className="text-sm text-[var(--foreground)] opacity-85">{reward}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Difficulty */}
        <div className="eco-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚙️</span>
            <h2 className="text-sm font-semibold text-[var(--accent-teal)] tracking-wide uppercase">{t('Tingkat Kesulitan')}</h2>
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
                  className="rounded-xl border p-3 transition-all"
                  style={{
                    borderColor: active ? option.accent : 'var(--border-card)',
                    background: active ? 'var(--surface-selected)' : 'var(--surface-muted)',
                    boxShadow: active ? `0 0 0 1px ${option.accent}` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-base">{option.emoji}</span>
                    {active && (
                      <span className="text-[8px] font-bold tracking-wide" style={{ color: option.accent }}>
                        {t('DIPILIH')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground">{t(option.label)}</p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
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
              <span className="text-sm">{selectedDifficulty.emoji}</span>
              <div>
                <p className="text-[11px] font-semibold text-foreground">
                  {t('Mode {label}', { label: t(selectedDifficulty.label) })}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                  {t(selectedDifficulty.description)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 mt-2.5 text-[10px]">
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

          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            {t('Kesulitan hanya memengaruhi kondisi awal dan sumber daya. Objektif dan hadiah tetap sama.')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <SoundLink href={`/mission/${regionId}`} className="flex-1">
            <button className="eco-btn-secondary w-full py-3 text-sm">
              {t('← Kembali')}
            </button>
          </SoundLink>
          <SoundLink
            href={`/play/${regionId}/${level}?difficulty=${difficulty}`}
            className="flex-2 w-full"
            style={{ flex: 2 }}
            sound="start"
          >
            <button className="eco-btn-primary w-full py-3 text-sm">
              {t('▶ Mulai Simulasi')}
            </button>
          </SoundLink>
        </div>
      </div>
    </main>
  )
}
