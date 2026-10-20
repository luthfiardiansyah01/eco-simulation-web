'use client'

import Link from 'next/link'
import AuthButton from '@/components/layout/AuthButton'
import { useState } from 'react'
import OnboardingTutorial from '@/components/ui/OnboardingTutorial'

export default function Home() {
  const [showTutorial, setShowTutorial] = useState(false)

  // Auto-show on first ever visit (checked client-side only)
  // OnboardingTutorial with forceOpen=false reads localStorage itself,
  // so we just mount it once and let it self-manage visibility.
  // For manual re-open, we use forceOpen=true.
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative background circles */}
      <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-green-900/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-64 h-64 rounded-full bg-teal-900/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl float">🌿</span>
            <h1 className="text-3xl md:text-4xl font-bold shimmer-text tracking-wide">
              EcoSim
            </h1>
            <span className="text-3xl float" style={{ animationDelay: '1s' }}>🌊</span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-4">River Ecosystem Simulation</p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <span className="badge badge-green">● ONLINE</span>
            <AuthButton />
          </div>
        </div>

        {/* Mode label */}
        <p className="text-center text-xs tracking-widest text-[var(--text-muted)] uppercase mb-6">
          — Pilih Mode Simulasi —
        </p>

        {/* Mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Adventure Mode */}
          <Link href="/region" className="block">
            <div className="eco-card p-6 cursor-pointer h-full flex flex-col glow-pulse">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🗺️</span>
                <span className="badge badge-red">HARD</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Adventure Mode</h3>
              <p className="text-sm text-[var(--text-muted)] mb-4 flex-1">
                Selesaikan misi pemulihan ekosistem sungai di 3 wilayah Jawa dengan tantangan lingkungan dinamis.
              </p>
              <div className="space-y-2 mb-5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Biomass</span>
                  <span className="text-[var(--accent-green)]">82%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Iklim</span>
                  <span className="text-white">Dinamis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Wilayah</span>
                  <span className="text-[var(--accent-teal)]">3 Region</span>
                </div>
              </div>
              <button className="eco-btn-primary w-full py-2.5 text-sm">
                ▶ Mulai Petualangan
              </button>
            </div>
          </Link>

          {/* Classic Free Roam */}
          <div className="eco-card p-6 opacity-50 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🏕️</span>
              <span className="badge badge-green">RELAXED</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Classic Free Roam</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4 flex-1">
              Jelajahi ekosistem secara bebas tanpa objektif. Kreasi sebebasnya seperti sandbox.
            </p>
            <div className="space-y-2 mb-5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Biomass</span>
                <span className="text-[var(--accent-green)]">∞</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Iklim</span>
                <span className="text-white">Manual</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Wilayah</span>
                <span className="text-[var(--accent-teal)]">Bebas</span>
              </div>
            </div>
            <button className="eco-btn-secondary w-full py-2.5 text-sm cursor-not-allowed opacity-60">
              🔒 Segera Hadir
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between mt-8">
          <p className="text-xs text-[var(--text-muted)]">
            Selamatkan ekosistem sungai Jawa 🌱
          </p>
          <button
            onClick={() => setShowTutorial(true)}
            className="badge badge-teal text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
          >
            ❓ Tutorial
          </button>
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
