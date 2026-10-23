import SoundLink from '@/components/audio/SoundLink'
import { MISSION_LEVELS } from '@/data/regions'
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

  const levels = baseLevels.map((level) => ({
    ...localizeMissionLevel(level, language),
    unlocked: level.id <= currentLevel,
    completed: completedLevels.includes(level.id),
  }))

  const completionPct = Math.round((completedLevels.length / baseLevels.length) * 100)

  return (
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-[var(--decor-teal)] blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-6">
          <SoundLink href="/region" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-4">
            {t('← Kembali ke Region')}
          </SoundLink>

          <div className={`eco-card ${meta.color} p-5 mb-5`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{meta.emoji}</span>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{meta.name}</h1>
                  <p className="text-xs text-[var(--text-muted)]">{t('Pilih level misi untuk dimulai')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {progress && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⭐</span>
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
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text-muted)]">{t('Penyelesaian')}</span>
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
                <SoundLink href={`/briefing/${regionId}/${level.id}`} sound="start">
                  <div className={`eco-card p-3 cursor-pointer h-full flex flex-col items-center text-center
                    ${level.completed ? 'border-green-700/60' : 'border-[var(--border-glow)]/40'}`}>

                    {/* Level number */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2
                      ${level.completed
                        ? 'bg-[var(--surface-selected)] text-[var(--accent-green)]'
                        : 'bg-[var(--surface-muted)] text-[var(--accent-teal)]'}`}>
                      {level.completed ? '✓' : level.id}
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] leading-tight flex-1 mb-2">
                      {level.title}
                    </p>

                    <span className={`badge text-[9px] ${level.completed ? 'badge-green' : 'badge-teal'}`}>
                      {level.completed ? t('SELESAI') : t('MAIN')}
                    </span>
                  </div>
                </SoundLink>
              ) : (
                <div className="eco-card p-3 opacity-40 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] text-sm mb-2">
                    🔒
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight flex-1 mb-2">
                    {level.title === 'Coming Soon' || level.title === 'Segera Hadir'
                      ? '???'
                      : level.title}
                  </p>
                  <span className="badge badge-gray text-[9px]">{t('TERKUNCI')}</span>
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
              <SoundLink href="/login" className="text-[var(--accent-amber)] hover:underline font-medium">
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
