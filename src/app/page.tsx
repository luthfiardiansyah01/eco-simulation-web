'use client'

import Link from 'next/link'
import AuthButton from '@/components/layout/AuthButton'
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
        <p className="text-center text-xs tracking-widest text-[var(--text-muted)] uppercase mb-6">
          {t('— Pilih Mode Simulasi —')}
        </p>

        {/* Mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Adventure Mode */}
          <Link href="/region" className="block" onClick={() => play('start')}>
            <div className="eco-card p-6 cursor-pointer h-full flex flex-col glow-pulse">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🗺️</span>
                <span className="badge badge-red">{t('SULIT')}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{t('Mode Petualangan')}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4 flex-1">
                {t('Selesaikan misi pemulihan ekosistem sungai di 3 wilayah Jawa dengan tantangan lingkungan dinamis.')}
              </p>
              <div className="space-y-2 mb-5 text-xs">
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
              <button className="eco-btn-primary w-full py-2.5 text-sm">
                {t('▶ Mulai Petualangan')}
              </button>
            </div>
          </Link>

          {/* Classic Free Roam */}
          <div className="eco-card p-6 opacity-50 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🏕️</span>
              <span className="badge badge-green">{t('SANTAI')}</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{t('Jelajah Bebas Klasik')}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4 flex-1">
              {t('Jelajahi ekosistem secara bebas tanpa objektif. Kreasi sebebasnya seperti sandbox.')}
            </p>
            <div className="space-y-2 mb-5 text-xs">
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
            <button className="eco-btn-secondary w-full py-2.5 text-sm cursor-not-allowed opacity-60">
              {t('🔒 Segera Hadir')}
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            {t('Selamatkan ekosistem sungai Jawa 🌱')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SoundLink
              href="/leaderboard"
              className="badge badge-amber text-[10px] hover:opacity-80 transition-opacity"
            >
              🏆 {t('Leaderboard')}
            </SoundLink>
            <SoundLink
              href="/settings"
              className="badge badge-gray text-[10px] hover:opacity-80 transition-opacity"
            >
              {t('⚙️ Pengaturan')}
            </SoundLink>
            <button
              onClick={() => {
                play('click')
                setShowTutorial(true)
              }}
              className="badge badge-teal text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
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
