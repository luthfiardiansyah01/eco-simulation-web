'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSound } from '@/components/audio/SoundProvider'
import { useI18n } from '@/components/settings/PreferencesProvider'
import type { Translator } from '@/lib/i18n'

const STEPS = [
  {
    emoji: '🌿',
    title: 'Selamat Datang di EcoSim!',
    desc: 'Kamu adalah Ranger lingkungan yang bertugas memulihkan ekosistem sungai di Pulau Jawa. Setiap keputusanmu menentukan nasib alam.',
    highlight: null,
    tip: null,
  },
  {
    emoji: '🗺️',
    title: 'Pilih Mode Petualangan',
    desc: 'Klik kartu Mode Petualangan di halaman utama untuk memulai petualangan. Selesaikan misi di 3 wilayah: Bandung, Semarang, dan Surabaya.',
    highlight: 'adventure',
    tip: '💡 Jelajah Bebas Klasik akan hadir segera!',
  },
  {
    emoji: '📍',
    title: 'Pilih Wilayah',
    desc: 'Setiap wilayah punya tantangan unik. Mulai dari Bandung — selesaikan semua level untuk membuka wilayah berikutnya.',
    highlight: 'region',
    tip: '🔒 Wilayah terkunci akan terbuka saat kamu menyelesaikan region sebelumnya.',
  },
  {
    emoji: '📋',
    title: 'Baca Briefing Misi',
    desc: 'Setiap misi punya cerita, objektif, dan reward. Baca baik-baik sebelum memulai simulasi agar kamu tahu apa yang harus dilakukan.',
    highlight: 'briefing',
    tip: '🎯 Objektif adalah target yang harus dicapai untuk menyelesaikan misi.',
  },
  {
    emoji: '🎮',
    title: 'Panel Status (Kiri)',
    desc: 'Di layar gameplay, panel kiri menampilkan kondisi lingkungan: Polusi, Biodiversitas, Kualitas Air, dan Populasi Ikan. Pantau terus agar tidak melewatkan peringatan!',
    highlight: 'status',
    tip: '⚠️ Bar merah = kondisi kritis, segera ambil tindakan!',
  },
  {
    emoji: '🏔️',
    title: 'Peta Isometrik (Tengah)',
    desc: 'Peta menunjukkan kondisi area secara visual. Area coklat = tercemar, biru = sungai bersih, hijau = vegetasi sehat. Sentuh tile untuk info lebih lanjut.',
    highlight: 'map',
    tip: '🌊 Semakin biru peta, semakin bersih ekosistemmu!',
  },
  {
    emoji: '⚡',
    title: 'Panel Aksi (Kanan)',
    desc: 'Gunakan aksi untuk memulihkan ekosistem:\n🗑️ Bersihkan — kurangi polusi\n🌱 Tanam Pohon — tambah biodiversitas\n💧 Filter — jernihkan air & kembalikan ikan\n🚁 Drone — kirim drone survei',
    highlight: 'actions',
    tip: '💰 Setiap aksi butuh Kredit atau Energi. Kelola dengan bijak!',
  },
  {
    emoji: '🏆',
    title: 'Raih Pencapaian!',
    desc: 'Selesaikan misi untuk mengumpulkan Poin Riset dan membuka Pencapaian. Naikkan peringkat dari Recruit hingga Eco Master!',
    highlight: null,
    tip: '🌱 Rank tertinggi: Eco Master (80%+ achievement)',
  },
]

function buildHighlights(t: Translator): Record<string, React.ReactNode> {
  return {
  adventure: (
    <div className="rounded-xl p-3 text-center text-xs" style={{ background: 'var(--surface-selected)', border: '1px solid var(--border-glow)' }}>
      <div className="text-2xl mb-1">🗺️</div>
      <div className="font-bold text-foreground">{t('Mode Petualangan')}</div>
      <div className="text-[var(--text-muted)] mt-0.5">{t('3 Wilayah · Dinamis')}</div>
      <div className="mt-2 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#16a34a,#0d9488)' }}>{t('▶ Mulai Petualangan')}</div>
    </div>
  ),
  region: (
    <div className="flex gap-2 justify-center">
      {[
        { name: 'Bandung', emoji: '🏯', color: '#22c55e', unlocked: true },
        { name: 'Semarang', emoji: '⛵', color: '#6b7280', unlocked: false },
        { name: 'Surabaya', emoji: '🦈', color: '#6b7280', unlocked: false },
      ].map((r) => (
        <div key={r.name} className="flex-1 rounded-lg p-2 text-center text-[10px]" style={{ background: 'var(--surface-muted)', border: `1px solid ${r.unlocked ? 'var(--border-glow)' : 'var(--border-card)'}` }}>
          <div className="text-xl mb-0.5">{r.emoji}</div>
          <div className="font-semibold text-foreground leading-tight">{t(r.name)}</div>
          {!r.unlocked && <div className="text-[8px] mt-1 text-[var(--text-muted)]">{t('🔒 Terkunci')}</div>}
        </div>
      ))}
    </div>
  ),
  briefing: (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-card)' }}>
      <div className="font-bold text-[var(--accent-amber)] mb-1.5">🎯 {t('Objektif Misi')}</div>
      <div className="space-y-1">
        {[t('Kurangi polusi ≤20%'), t('Pulihkan populasi ikan ≥60%'), t('Tanam 50 pohon')].map((o) => (
          <div key={o} className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="text-[10px]">⬜</span><span>{o}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  status: (
    <div className="rounded-xl p-3 text-[9px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', width: '100px' }}>
      {[
        { emoji: '☁️', label: t('Polusi'), val: 78, inv: true },
        { emoji: '🦋', label: t('Bio'), val: 22, inv: false },
        { emoji: '💧', label: t('Air'), val: 31, inv: false },
        { emoji: '🐟', label: t('Ikan'), val: 18, inv: false },
      ].map(({ emoji, label, val, inv }) => {
        const v = inv ? 100 - val : val
        const c = v > 60 ? '#22c55e' : v > 30 ? '#eab308' : '#ef4444'
        return (
          <div key={label} className="mb-2">
            <div className="flex justify-between mb-0.5">
              <span>{emoji} {label}</span>
              <span className="font-medium text-foreground">{val}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'var(--track-bg)' }}>
              <div className="h-1 rounded-full" style={{ width: `${val}%`, background: c }} />
            </div>
          </div>
        )
      })}
    </div>
  ),
  map: (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-card)' }}>
      <div className="grid grid-cols-8 gap-px p-2" style={{ background: 'var(--bg-card-2)' }}>
        {Array.from({ length: 32 }).map((_, i) => {
          const types = ['water', 'grass', 'tree', 'polluted', 'dirt']
          const t = types[i % 5]
          const colors: Record<string, string> = {
            water: '#1e40af', grass: '#15803d', tree: '#166534',
            polluted: '#92400e', dirt: '#3f3f46',
          }
          return <div key={i} className="rounded-sm" style={{ height: 10, background: colors[t] }} />
        })}
      </div>
      <div className="flex gap-2 px-2 pb-1.5 text-[8px] text-[var(--text-muted)]">
        <span>🔵 {t('Air')}</span><span>🟢 {t('Hijau')}</span><span>🟤 {t('Cemar')}</span>
      </div>
    </div>
  ),
  actions: (
    <div className="grid grid-cols-4 gap-1.5">
      {[
        { emoji: '🗑️', label: t('Bersihkan'), cost: '-50💰' },
        { emoji: '🌱', label: t('Tanam'), cost: '-30💰' },
        { emoji: '💧', label: t('Filter'), cost: '-150💰' },
        { emoji: '🚁', label: t('Drone'), cost: '-30⚡' },
      ].map((a) => (
        <div key={a.label} className="flex flex-col items-center rounded-lg p-1.5 text-center" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-card)' }}>
          <span className="text-lg mb-0.5">{a.emoji}</span>
          <span className="text-[8px] text-foreground font-medium">{a.label}</span>
          <span className="text-[7px] text-[var(--text-muted)]">{a.cost}</span>
        </div>
      ))}
    </div>
  ),
  }
}

interface Props {
  forceOpen?: boolean
  onClose?: () => void
}

export default function OnboardingTutorial({ forceOpen, onClose }: Props = {}) {
  const { play } = useSound()
  const { t } = useI18n()
  const highlights = useMemo(() => buildHighlights(t), [t])
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Defer the visibility update to the next frame: reading localStorage is an
    // external-system sync, and this avoids a cascading render inside the effect.
    const frame = requestAnimationFrame(() => {
      if (forceOpen) {
        setVisible(true)
        setStep(0)
        return
      }
      try {
        const seen = localStorage.getItem('ecosim_onboarding_done')
        if (!seen) setVisible(true)
      } catch { /* storage blocked */ }
    })
    return () => cancelAnimationFrame(frame)
  }, [forceOpen])

  function finish() {
    play('start')
    try { localStorage.setItem('ecosim_onboarding_done', '1') } catch { /* ignore */ }
    setVisible(false)
    onClose?.()
  }

  function next() {
    if (step < STEPS.length - 1) {
      play('click')
      setStep((s) => s + 1)
    } else {
      finish()
    }
  }

  function prev() {
    if (step > 0) {
      play('click')
      setStep((s) => s - 1)
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay-backdrop)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-2) 100%)',
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--glow-green)',
        }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4 pb-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                play('click')
                setStep(i)
              }}
              className="rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? 'var(--accent-green)' : i < step ? 'var(--accent-green)' : 'var(--track-bg)',
                opacity: i < step ? 0.4 : 1,
              }}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="text-center mt-1">
          <span className="text-[10px] text-[var(--text-muted)]">{step + 1} / {STEPS.length}</span>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {/* Emoji */}
          <div className="text-center mb-3">
            <span className="text-5xl" style={{ animation: 'float 3s ease-in-out infinite' }}>
              {current.emoji}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-center text-foreground mb-2">{t(current.title)}</h2>

          {/* Description */}
          <p className="text-sm text-[var(--text-muted)] text-center leading-relaxed mb-4 whitespace-pre-line">
            {t(current.desc)}
          </p>

          {/* Visual highlight */}
          {current.highlight && highlights[current.highlight] && (
            <div className="mb-4">
              {highlights[current.highlight]}
            </div>
          )}

          {/* Tip */}
          {current.tip && (
            <div
              className="rounded-xl px-3 py-2 text-xs text-center mb-4"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--accent-amber)' }}
            >
              {t(current.tip)}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-5 pb-5 flex gap-2">
          {step > 0 ? (
            <button
              onClick={prev}
              className="eco-btn-secondary flex-1 py-2.5 text-sm"
            >
              {t('← Kembali')}
            </button>
          ) : (
            <button
              onClick={finish}
              className="eco-btn-secondary flex-1 py-2.5 text-sm"
            >
              {t('Lewati')}
            </button>
          )}
          <button
            onClick={next}
            className="eco-btn-primary flex-1 py-2.5 text-sm"
          >
            {isLast ? t('🌿 Mulai Bermain!') : t('Lanjut →')}
          </button>
        </div>
      </div>
    </div>
  )
}
