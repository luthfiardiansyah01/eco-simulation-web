'use client'

import { useState, useEffect } from 'react'

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
    title: 'Pilih Mode Adventure',
    desc: 'Klik kartu Adventure Mode di halaman utama untuk memulai petualangan. Selesaikan misi di 3 wilayah: Yogyakarta, Semarang, dan Surabaya.',
    highlight: 'adventure',
    tip: '💡 Classic Free Roam akan hadir segera!',
  },
  {
    emoji: '📍',
    title: 'Pilih Wilayah',
    desc: 'Setiap wilayah punya tantangan unik. Mulai dari Yogyakarta — selesaikan semua level untuk membuka wilayah berikutnya.',
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
    title: 'Raih Achievement!',
    desc: 'Selesaikan misi untuk mengumpulkan Research Points dan membuka Achievement. Naikkan rank dari Recruit hingga Eco Master!',
    highlight: null,
    tip: '🌱 Rank tertinggi: Eco Master (80%+ achievement)',
  },
]

const HIGHLIGHT_IMGS: Record<string, React.ReactNode> = {
  adventure: (
    <div className="rounded-xl p-3 text-center text-xs" style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
      <div className="text-2xl mb-1">🗺️</div>
      <div className="font-bold text-white">Adventure Mode</div>
      <div className="text-[var(--text-muted)] mt-0.5">3 Wilayah · Dinamis</div>
      <div className="mt-2 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#16a34a,#0d9488)' }}>▶ Mulai Petualangan</div>
    </div>
  ),
  region: (
    <div className="flex gap-2 justify-center">
      {[
        { name: 'Yogyakarta', emoji: '🏯', color: '#22c55e', unlocked: true },
        { name: 'Semarang', emoji: '⛵', color: '#6b7280', unlocked: false },
        { name: 'Surabaya', emoji: '🦈', color: '#6b7280', unlocked: false },
      ].map((r) => (
        <div key={r.name} className="flex-1 rounded-lg p-2 text-center text-[10px]" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${r.unlocked ? '#22c55e' : '#1e4a38'}` }}>
          <div className="text-xl mb-0.5">{r.emoji}</div>
          <div className="font-semibold text-white leading-tight">{r.name}</div>
          {!r.unlocked && <div className="text-[8px] mt-1 text-[#6b7280]">🔒 Terkunci</div>}
        </div>
      ))}
    </div>
  ),
  briefing: (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e4a38' }}>
      <div className="font-bold text-[var(--accent-amber)] mb-1.5">🎯 Objektif Misi</div>
      <div className="space-y-1">
        {['Kurangi polusi ≤20%', 'Pulihkan populasi ikan ≥60%', 'Tanam 50 pohon'].map((o) => (
          <div key={o} className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="text-[10px]">⬜</span><span>{o}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  status: (
    <div className="rounded-xl p-3 text-[9px]" style={{ background: '#0d1f1a', border: '1px solid #1e4a38', width: '100px' }}>
      {[
        { emoji: '☁️', label: 'Polusi', val: 78, inv: true },
        { emoji: '🦋', label: 'Bio', val: 22, inv: false },
        { emoji: '💧', label: 'Air', val: 31, inv: false },
        { emoji: '🐟', label: 'Ikan', val: 18, inv: false },
      ].map(({ emoji, label, val, inv }) => {
        const v = inv ? 100 - val : val
        const c = v > 60 ? '#22c55e' : v > 30 ? '#eab308' : '#ef4444'
        return (
          <div key={label} className="mb-2">
            <div className="flex justify-between mb-0.5">
              <span>{emoji} {label}</span>
              <span className="font-medium text-white">{val}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-1 rounded-full" style={{ width: `${val}%`, background: c }} />
            </div>
          </div>
        )
      })}
    </div>
  ),
  map: (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e4a38' }}>
      <div className="grid grid-cols-8 gap-px p-2" style={{ background: '#0a1a14' }}>
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
        <span>🔵 Air</span><span>🟢 Hijau</span><span>🟤 Cemar</span>
      </div>
    </div>
  ),
  actions: (
    <div className="grid grid-cols-4 gap-1.5">
      {[
        { emoji: '🗑️', label: 'Bersihkan', cost: '-50💰' },
        { emoji: '🌱', label: 'Tanam', cost: '-30💰' },
        { emoji: '💧', label: 'Filter', cost: '-150💰' },
        { emoji: '🚁', label: 'Drone', cost: '-30⚡' },
      ].map((a) => (
        <div key={a.label} className="flex flex-col items-center rounded-lg p-1.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e4a38' }}>
          <span className="text-lg mb-0.5">{a.emoji}</span>
          <span className="text-[8px] text-white font-medium">{a.label}</span>
          <span className="text-[7px] text-[var(--text-muted)]">{a.cost}</span>
        </div>
      ))}
    </div>
  ),
}

interface Props {
  forceOpen?: boolean
  onClose?: () => void
}

export default function OnboardingTutorial({ forceOpen, onClose }: Props = {}) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceOpen) { setVisible(true); setStep(0); return }
    try {
      const seen = localStorage.getItem('ecosim_onboarding_done')
      if (!seen) setVisible(true)
    } catch { /* storage blocked */ }
  }, [forceOpen])

  function finish() {
    try { localStorage.setItem('ecosim_onboarding_done', '1') } catch { /* ignore */ }
    setVisible(false)
    onClose?.()
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else finish()
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #132b23 0%, #0f2219 100%)',
          border: '1px solid #1e4a38',
          boxShadow: '0 0 40px rgba(74,222,128,0.15)',
        }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4 pb-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? '#4ade80' : i < step ? '#22c55e66' : 'rgba(255,255,255,0.15)',
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
          <h2 className="text-lg font-bold text-center text-white mb-2">{current.title}</h2>

          {/* Description */}
          <p className="text-sm text-[var(--text-muted)] text-center leading-relaxed mb-4 whitespace-pre-line">
            {current.desc}
          </p>

          {/* Visual highlight */}
          {current.highlight && HIGHLIGHT_IMGS[current.highlight] && (
            <div className="mb-4">
              {HIGHLIGHT_IMGS[current.highlight]}
            </div>
          )}

          {/* Tip */}
          {current.tip && (
            <div
              className="rounded-xl px-3 py-2 text-xs text-center mb-4"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
            >
              {current.tip}
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
              ← Kembali
            </button>
          ) : (
            <button
              onClick={finish}
              className="eco-btn-secondary flex-1 py-2.5 text-sm"
            >
              Lewati
            </button>
          )}
          <button
            onClick={next}
            className="eco-btn-primary flex-1 py-2.5 text-sm"
          >
            {isLast ? '🌿 Mulai Bermain!' : 'Lanjut →'}
          </button>
        </div>
      </div>
    </div>
  )
}
