'use client'

import Link from 'next/link'
import AuthButton from '@/components/layout/AuthButton'
import { AdventureSteps } from '@/components/layout/Navigation'
import { useState } from 'react'
import OnboardingTutorial from '@/components/ui/OnboardingTutorial'
import SoundLink from '@/components/audio/SoundLink'
import { useSound } from '@/components/audio/SoundProvider'
import { useI18n } from '@/components/settings/PreferencesProvider'

export default function Home() {
  const { play } = useSound()
  const { t } = useI18n()
  const [showTutorial, setShowTutorial] = useState(false)

  // Auto-show on first ever visit (checked client-side only)
  // OnboardingTutorial with forceOpen=false reads localStorage itself,
  // so we just mount it once and let it self-manage visibility.
  // For manual re-open, we use forceOpen=true.
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative background circles */}
      <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-[var(--decor-green)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full bg-[var(--decor-teal)] blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl float">🌿</span>
            <h1 className="text-3xl md:text-4xl font-bold shimmer-text tracking-wide">
              VRASS
            </h1>
            <span className="text-3xl float" style={{ animationDelay: '1s' }}>🌊</span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-4">{t('Simulasi Ekosistem Sungai')}</p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <span className="badge badge-green">● {t('ONLINE')}</span>
            <AuthButton />
          </div>
        </div>

        {/* Mode label */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <p className="text-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
            {t('— Pilih Mode Simulasi —')}
          </p>
          <div className="rounded-full border border-[var(--border-card)] bg-[var(--surface-muted)] px-4 py-2">
            <AdventureSteps
              steps={[t('Wilayah'), t('Misi'), t('Briefing'), t('Bermain')]}
              current={0}
            />
          </div>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* Adventure Mode */}
          <Link href="/region" className="block h-full" onClick={() => play('start')}>
            <div className="eco-card card-lift glow-pulse flex h-full cursor-pointer flex-col p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">🗺️</span>
                <span className="badge badge-red">{t('SULIT')}</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{t('Mode Petualangan')}</h3>
              <p className="mb-4 flex-1 text-sm text-[var(--text-muted)]">
                {t('Selesaikan misi pemulihan ekosistem sungai di 3 wilayah Jawa dengan tantangan lingkungan dinamis.')}
              </p>
              <div className="mb-5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t('Biomassa')}</span>
                  <span className="text-[var(--accent-green)]">82%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t('Iklim')}</span>
                  <span className="text-foreground">{t('Dinamis')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t('Wilayah')}</span>
                  <span className="text-[var(--accent-teal)]">{t('3 Wilayah')}</span>
                </div>
              </div>
              <span className="eco-btn-primary block w-full py-2.5 text-center text-sm">
                {t('▶ Mulai Petualangan')}
              </span>
            </div>
          </Link>

          {/* Classic Free Roam */}
          <div className="eco-card flex flex-col p-6 opacity-50">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-2xl" aria-hidden="true">🏕️</span>
              <span className="badge badge-green">{t('SANTAI')}</span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">{t('Jelajah Bebas Klasik')}</h3>
            <p className="mb-4 flex-1 text-sm text-[var(--text-muted)]">
              {t('Jelajahi ekosistem secara bebas tanpa objektif. Kreasi sebebasnya seperti sandbox.')}
            </p>
            <div className="mb-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t('Biomassa')}</span>
                <span className="text-[var(--accent-green)]">∞</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t('Iklim')}</span>
                <span className="text-foreground">{t('Manual')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t('Wilayah')}</span>
                <span className="text-[var(--accent-teal)]">{t('Bebas')}</span>
              </div>
            </div>
            <span className="eco-btn-secondary block w-full cursor-not-allowed py-2.5 text-center text-sm opacity-60">
              {t('🔒 Segera Hadir')}
            </span>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-[var(--text-muted)] sm:text-left">
            {t('Selamatkan ekosistem sungai Jawa 🌱')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <SoundLink
              href="/leaderboard"
              className="badge badge-amber text-[10px] transition-opacity hover:opacity-80"
            >
              🏆 {t('Leaderboard')}
            </SoundLink>
            <SoundLink
              href="/settings"
              className="badge badge-gray text-[10px] transition-opacity hover:opacity-80"
            >
              {t('⚙️ Pengaturan')}
            </SoundLink>
            <button
              type="button"
              onClick={() => {
                play('click')
                setShowTutorial(true)
              }}
              className="badge badge-teal cursor-pointer text-[10px] transition-opacity hover:opacity-80"
            >
              {t('❓ Tutorial')}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-show on first visit */}
      <OnboardingTutorial />

      {/* Manual re-open */}
      {showTutorial && (
        <OnboardingTutorial forceOpen onClose={() => setShowTutorial(false)} />
      )}
    </main>
  )
}
