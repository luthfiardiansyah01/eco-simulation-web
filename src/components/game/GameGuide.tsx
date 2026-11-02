'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { GameAction, Mission } from '@/types'
import { ACTION_COSTS, formatCost } from '@/lib/gameplay/actions'
import { DIFFICULTIES, type Difficulty } from '@/lib/gameplay/difficulty'
import { useI18n } from '@/components/settings/PreferencesProvider'
import { useSound } from '@/components/audio/SoundProvider'

export type GuideAction = {
  emoji: string
  label: string
  action: GameAction
}

const ACTION_EFFECTS: Record<GameAction, string> = {
  clean_waste: 'Polusi -5%, ikan +3%',
  plant_tree: 'Pohon +1, bio +2%',
  scan_water: 'Cek kualitas air',
  deploy_drone: 'Drone +1',
  build_filter: 'Air +8%, ikan +5%',
  open_map: 'Buka info area',
  analyze_area: 'Analisis area',
  return_base: 'Kembali ke basis',
}

interface Props {
  open: boolean
  onClose: () => void
  mission: Mission
  difficulty: Difficulty
  actions: GuideAction[]
}

export default function GameGuide({
  open,
  onClose,
  mission,
  difficulty,
  actions,
}: Props) {
  const { t } = useI18n()
  const { play } = useSound()
  const closeRef = useRef<HTMLButtonElement>(null)
  const difficultyMeta = DIFFICULTIES[difficulty]

  const handleClose = useCallback(() => {
    play('click')
    onClose()
  }, [onClose, play])

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => closeRef.current?.focus())
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [handleClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5"
      style={{ background: 'var(--overlay-backdrop)', backdropFilter: 'blur(8px)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <div
        data-testid="game-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-guide-title"
        aria-describedby="game-guide-description"
        className="modal-pop eco-card flex max-h-[min(92dvh,720px)] w-full max-w-2xl flex-col overflow-hidden"
        style={{ borderColor: 'var(--accent-teal)', boxShadow: 'var(--glow-teal)' }}
      >
        <div
          className="flex items-start justify-between gap-3 border-b p-4"
          style={{ borderColor: 'var(--border-card)' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">📖</span>
            <div>
              <h2 id="game-guide-title" className="text-base font-bold text-foreground">
                {t('Panduan Misi')}
              </h2>
              <p id="game-guide-description" className="text-[11px] text-[var(--text-muted)]">
                {mission.title} · Lv.{mission.level} ·{' '}
                <span style={{ color: difficultyMeta.accent }}>{t(difficultyMeta.label)}</span>
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            aria-label={t('Tutup panduan')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--surface-muted)] text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          <section className="rounded-xl border border-[var(--border-card)] bg-[var(--surface-muted)] p-3">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-green)]">
              <span aria-hidden="true">🎯</span> {t('Cara Menang')}
            </h3>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              {t('Selesaikan semua objektif sebelum kredit atau energi habis.')}
            </p>
            <ul className="mt-2 space-y-1.5">
              {mission.objectives.map((objective) => (
                <li key={`${objective.metric}-${objective.target}`} className="flex items-start gap-1.5 text-[11px] leading-snug text-[var(--text-secondary)]">
                  <span aria-hidden="true" className="mt-0.5">⬜</span>
                  <span>{objective.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-[var(--border-card)] bg-[var(--surface-muted)] p-3">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-teal)]">
              <span aria-hidden="true">🎮</span> {t('Cara Bermain')}
            </h3>
            <ol className="space-y-2">
              {[
                'Pantau status lingkungan di panel kiri.',
                'Pilih aksi di panel bawah. Setiap aksi memakai kredit atau energi.',
                'Capai semua objektif untuk menyelesaikan misi.',
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-2 text-[11px] leading-snug text-[var(--text-secondary)]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] text-[9px] font-bold text-[var(--accent-teal)]">
                    {index + 1}
                  </span>
                  <span>{t(step)}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-[var(--border-card)] bg-[var(--surface-muted)] p-3 sm:col-span-2">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-amber)]">
              <span aria-hidden="true">⚡</span> {t('Aksi & Efek')}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {actions.map((action) => (
                <div
                  key={action.action}
                  className="rounded-lg border border-[var(--border-card)] bg-[var(--bg-card)] p-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-base" aria-hidden="true">{action.emoji}</span>
                    <span className="text-[9px] font-semibold text-[var(--accent-amber)]">
                      {formatCost(ACTION_COSTS[action.action])}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-semibold leading-tight text-foreground">
                    {t(action.label)}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-tight text-[var(--text-muted)]">
                    {t(ACTION_EFFECTS[action.action])}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border-card)] bg-[var(--surface-muted)] p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-teal)]">
              <span aria-hidden="true">🗺️</span> {t('Legenda Peta')}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
              {[
                ['bg-[#1e6b9c]', 'Sungai'],
                ['bg-[#2d7a3a]', 'Tanah'],
                ['bg-[#1a5c28]', 'Pohon'],
                ['bg-[#8b4a1a]', 'Cemar'],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded-sm ${color}`} aria-hidden="true" />
                  <span>{t(label)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
              {t('Ketuk peta untuk membaca kondisi tile.')}
            </p>
          </section>

          <section className="rounded-xl border border-[var(--border-card)] bg-[var(--surface-muted)] p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-amber)]">
              <span aria-hidden="true">💡</span> {t('Tips Ranger')}
            </h3>
            <ul className="space-y-1.5 text-[10px] leading-relaxed text-[var(--text-muted)]">
              {[
                'Prioritaskan aksi yang langsung mendekatkan objektif.',
                'Simpan kredit untuk Filter dan Tanam Pohon.',
                'Jika sumber daya habis, reset misi dan coba strategi lain.',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-1.5">
                  <span aria-hidden="true" className="mt-0.5 text-[var(--accent-amber)]">•</span>
                  <span>{t(tip)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div
          className="border-t p-3"
          style={{ borderColor: 'var(--border-card)' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="eco-btn-primary w-full py-2.5 text-sm"
          >
            {t('Mengerti')}
          </button>
        </div>
      </div>
    </div>
  )
}
