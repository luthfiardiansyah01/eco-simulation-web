'use client'

import { Fragment, useEffect, useState } from 'react'
import SoundLink from '@/components/audio/SoundLink'
import { useSound } from '@/components/audio/SoundProvider'
import { createClient } from '@/lib/supabase/client'
import { getLeaderboard } from '@/lib/supabase/leaderboard'
import { useI18n } from '@/components/settings/PreferencesProvider'
import { formatNumber } from '@/lib/i18n'
import type { LeaderboardEntry } from '@/types'
import type { Language } from '@/lib/i18n'

const MEDALS = ['🥇', '🥈', '🥉']

function formatPoints(value: number, language: Language) {
  return formatNumber(value, language)
}

function getInitials(username: string) {
  return username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '🌿'
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const { language, t } = useI18n()

  return (
    <div
      className="eco-card p-3 flex items-center gap-3"
      style={entry.isCurrentUser ? {
        borderColor: 'var(--border-glow)',
        boxShadow: 'var(--glow-green)',
      } : undefined}
    >
      <div className="w-9 flex-shrink-0 text-center">
        {entry.rank <= 3
          ? <span className="text-xl" aria-label={t('Peringkat {rank}', { rank: entry.rank })}>{MEDALS[entry.rank - 1]}</span>
          : <span className="text-xs font-bold text-[var(--text-muted)]">#{entry.rank}</span>
        }
      </div>

      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{
          background: entry.isCurrentUser ? 'var(--surface-selected)' : 'var(--surface-muted)',
          border: '1px solid var(--border-card)',
          color: 'var(--accent-green)',
        }}
      >
        {getInitials(entry.username)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{entry.username}</p>
          {entry.isCurrentUser && <span className="badge badge-amber text-[9px] flex-shrink-0">{t('KAMU')}</span>}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] truncate">
          {t('{missions} misi · {achievements} achievement · {regions} wilayah', {
            missions: entry.missionsCompleted,
            achievements: entry.achievementsCount,
            regions: entry.regionsCount,
          })}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: 'var(--accent-amber)' }}>{formatPoints(entry.totalPoints, language)}</p>
        <p className="text-[9px] text-[var(--text-muted)]">{t('poin riset')}</p>
      </div>
    </div>
  )
}

function LoadingRows() {
  const { t } = useI18n()

  return (
    <div className="space-y-2" aria-label={t('Memuat leaderboard')}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="eco-card p-3 flex items-center gap-3">
          <div className="w-9 h-5 rounded skeleton-shimmer" />
          <div className="w-9 h-9 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded skeleton-shimmer" />
            <div className="h-2 w-2/3 rounded skeleton-shimmer" />
          </div>
          <div className="w-14 h-5 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const { play } = useSound()
  const { language, t } = useI18n()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const supabase = createClient()
        const [leaderboard, authResult] = await Promise.all([
          getLeaderboard(50),
          supabase.auth.getUser(),
        ])

        if (cancelled) return

        setIsGuest(!authResult.data.user)

        if (leaderboard.ok) {
          setEntries(leaderboard.entries)
        } else {
          setEntries([])
          setError(t(leaderboard.message))
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load leaderboard page', err)
          setEntries([])
          setError(t('Gagal memuat leaderboard. Periksa koneksi lalu coba lagi.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [refreshKey, t])

  const currentUser = entries.find((entry) => entry.isCurrentUser)

  return (
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full bg-[var(--decor-green)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-[var(--decor-teal)] blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="flex items-center justify-between gap-3 mb-5">
          <SoundLink href="/" className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors">
            {t('← Kembali ke Menu')}
          </SoundLink>
          <SoundLink href="/profile" className="badge badge-green text-[10px] hover:opacity-80 transition-opacity">
            🌿 {t('Profil')}
          </SoundLink>
        </div>

        <div className="eco-card p-5 mb-4 region-hero-green">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'var(--surface-selected)', border: '1px solid var(--border-glow)' }}
            >
              🏆
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('Peringkat pemain tunggal')}</p>
              <h1 className="text-xl font-bold text-foreground">{t('Leaderboard')}</h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t('Peringkat peneliti berdasarkan total poin riset dari misi solo.')}
              </p>
            </div>
          </div>
        </div>

        {!loading && isGuest && (
          <div className="eco-card p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-2xl">👤</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{t('Kamu bermain sebagai tamu')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {t('Masuk untuk menyimpan progres solo dan tampil di leaderboard.')}
                </p>
              </div>
              <SoundLink href="/login" className="eco-btn-primary px-4 py-2 text-xs text-center flex-shrink-0">
                {t('Masuk')}
              </SoundLink>
            </div>
          </div>
        )}

        {!loading && currentUser && (
          <div
            className="eco-card p-4 mb-4"
            style={{ borderColor: 'var(--border-glow)' }}
          >
            <div className="flex items-center gap-4">
              <div className="text-center flex-shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{t('Posisi kamu')}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent-amber)' }}>#{currentUser.rank}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 flex-1 text-center">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--accent-amber)' }}>{formatPoints(currentUser.totalPoints, language)}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{t('Poin')}</p>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--accent-teal)' }}>{currentUser.missionsCompleted}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{t('Misi')}</p>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--accent-green)' }}>{currentUser.achievementsCount}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{t('Pencapaian')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xs text-[var(--text-muted)] uppercase tracking-widest">{t('Peringkat Peneliti')}</h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('Top 50 · diperbarui setelah misi selesai')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              play('click')
              setRefreshKey((key) => key + 1)
            }}
            disabled={loading}
            className="eco-btn-secondary px-3 py-1.5 text-[10px] disabled:opacity-50"
          >
            {t('↻ Segarkan')}
          </button>
        </div>

        {loading ? (
          <LoadingRows />
        ) : error ? (
          <div className="eco-card p-6 text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-bold mt-2" style={{ color: 'var(--accent-red)' }}>{t('Leaderboard tidak tersedia')}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{error}</p>
            <button
              type="button"
              onClick={() => {
                play('click')
                setRefreshKey((key) => key + 1)
              }}
              className="eco-btn-secondary px-4 py-2 text-xs mt-4"
            >
              {t('Coba lagi')}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="eco-card p-8 text-center">
            <span className="text-3xl float">🌱</span>
            <p className="text-sm font-bold text-foreground mt-3">{t('Belum ada peneliti di leaderboard')}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t('Selesaikan misi pertamamu untuk membuka peringkat.')}
            </p>
            <SoundLink href={isGuest ? '/login' : '/region'} className="eco-btn-primary inline-block px-4 py-2 text-xs mt-4">
              {isGuest ? t('Masuk untuk bergabung') : t('Mulai misi')}
            </SoundLink>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const gap = index > 0 && entry.rank > entries[index - 1].rank + 1
              return (
                <Fragment key={entry.rank}>
                  {gap && (
                    <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-[var(--text-muted)]">
                      <span className="h-px flex-1" style={{ background: 'var(--border-card)' }} />
                      <span>{entry.isCurrentUser ? t('Posisi kamu') : '•••'}</span>
                      <span className="h-px flex-1" style={{ background: 'var(--border-card)' }} />
                    </div>
                  )}
                  <LeaderboardRow entry={entry} />
                </Fragment>
              )
            })}
          </div>
        )}

        <p className="text-[10px] text-center text-[var(--text-muted)] mt-5">
          {t('Urutan: total poin riset, misi, pencapaian, lalu wilayah.')}
        </p>
      </div>
    </main>
  )
}
