'use client'

import { useEffect, useState } from 'react'
import SoundLink from '@/components/audio/SoundLink'
import { useSound } from '@/components/audio/SoundProvider'
import {
  usePreferences,
  type Language,
  type Theme,
} from '@/components/settings/PreferencesProvider'

const COPY = {
  id: {
    back: '← Kembali ke Menu',
    title: 'Pengaturan',
    subtitle: 'Atur tampilan, audio, bahasa, dan notifikasi',
    appearance: 'Tampilan',
    appearanceDesc: 'Pilih tema gelap atau terang untuk antarmuka.',
    dark: 'Gelap',
    light: 'Terang',
    audio: 'Audio',
    audioDesc: 'Volume berlaku untuk efek suara dan ambience permainan.',
    volume: 'Volume',
    mute: 'Bisukan semua suara',
    unmute: 'Aktifkan suara',
    testSound: 'Uji suara',
    mutedHint: 'Suara sedang dibisukan.',
    language: 'Bahasa',
    languageDesc:
      'Preferensi bahasa disimpan di perangkat ini dan langsung diterapkan pada halaman pengaturan.',
    indonesian: 'Bahasa Indonesia',
    english: 'English',
    notifications: 'Notifikasi',
    notificationsDesc: 'Tampilkan notifikasi achievement saat misi selesai.',
    enabled: 'Aktif',
    disabled: 'Nonaktif',
    testNotification: 'Tampilkan notifikasi uji',
    notificationTitle: 'Notifikasi pengaturan',
    notificationBody: 'Preferensi notifikasi tersimpan di perangkat ini.',
    autoSave: 'Perubahan tersimpan otomatis di perangkat ini.',
  },
  en: {
    back: '← Back to Menu',
    title: 'Settings',
    subtitle: 'Manage appearance, audio, language, and notifications',
    appearance: 'Appearance',
    appearanceDesc: 'Choose a dark or light theme for the interface.',
    dark: 'Dark',
    light: 'Light',
    audio: 'Audio',
    audioDesc: 'Volume applies to sound effects and gameplay ambience.',
    volume: 'Volume',
    mute: 'Mute all sound',
    unmute: 'Enable sound',
    testSound: 'Test sound',
    mutedHint: 'Sound is currently muted.',
    language: 'Language',
    languageDesc:
      'The language preference is saved on this device and applied to this settings page immediately.',
    indonesian: 'Bahasa Indonesia',
    english: 'English',
    notifications: 'Notifications',
    notificationsDesc: 'Show achievement notifications when a mission is completed.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    testNotification: 'Show test notification',
    notificationTitle: 'Settings notification',
    notificationBody: 'Notification preferences are saved on this device.',
    autoSave: 'Changes are saved automatically on this device.',
  },
} as const

export default function SettingsPage() {
  const { language, setLanguage, notifications, setNotifications, theme, setTheme } =
    usePreferences()
  const { muted, volume, toggleMuted, setVolume, play } = useSound()
  const [testToast, setTestToast] = useState(false)

  const copy = COPY[language]
  const percent = Math.round(volume * 100)
  const volumeIcon = muted || percent === 0 ? '🔇' : percent < 50 ? '🔈' : '🔊'

  useEffect(() => {
    if (!testToast) return
    const timer = setTimeout(() => setTestToast(false), 3_200)
    return () => clearTimeout(timer)
  }, [testToast])

  function changeTheme(next: Theme) {
    if (next === theme) return
    play('toggle')
    setTheme(next)
  }

  function changeLanguage(next: Language) {
    if (next === language) return
    play('click')
    setLanguage(next)
  }

  function changeNotifications() {
    const next = !notifications
    setNotifications(next)
    play('toggle')
    setTestToast(next)
  }

  return (
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full bg-[var(--decor-green)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-[var(--decor-teal)] blur-3xl pointer-events-none" />

      {testToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-[var(--accent-green)]/40 bg-[var(--bg-card)] p-4 shadow-2xl backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{copy.notificationTitle}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
                {copy.notificationBody}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto relative z-10">
        <SoundLink
          href="/"
          className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-5"
        >
          {copy.back}
        </SoundLink>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">⚙️</span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
            <p className="text-xs text-[var(--text-muted)]">{copy.subtitle}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Appearance */}
          <section className="eco-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌓</span>
              <h2 className="text-sm font-semibold text-[var(--accent-teal)] uppercase tracking-wide">
                {copy.appearance}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-4">{copy.appearanceDesc}</p>

            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as const).map((option) => {
                const selected = theme === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => changeTheme(option)}
                    className="flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all"
                    style={{
                      borderColor: selected ? 'var(--border-glow)' : 'var(--border-card)',
                      background: selected ? 'var(--surface-selected)' : 'var(--surface-muted)',
                    }}
                  >
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-lg">{option === 'dark' ? '🌙' : '☀️'}</span>
                      {option === 'dark' ? copy.dark : copy.light}
                    </span>
                    {selected && <span className="text-sm text-[var(--accent-green)]">✓</span>}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Audio */}
          <section className="eco-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔊</span>
              <h2 className="text-sm font-semibold text-[var(--accent-green)] uppercase tracking-wide">
                {copy.audio}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-5">{copy.audioDesc}</p>

            <div className="flex items-center justify-between gap-3 mb-2">
              <label htmlFor="volume" className="text-sm font-medium text-foreground">
                {volumeIcon} {copy.volume}
              </label>
              <span className="badge badge-teal text-[10px]">{percent}%</span>
            </div>

            <input
              id="volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent}
              aria-valuetext={`${percent}%`}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
              className="w-full cursor-pointer accent-[var(--accent-green)]"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleMuted}
                className="eco-btn-secondary px-3 py-2 text-xs"
              >
                {muted ? `🔇 ${copy.unmute}` : `🔊 ${copy.mute}`}
              </button>
              <button
                type="button"
                onClick={() => play('success')}
                disabled={muted || percent === 0}
                className="eco-btn-primary px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ▶ {copy.testSound}
              </button>
              {muted && (
                <span className="text-[11px] text-[var(--accent-amber)]">{copy.mutedHint}</span>
              )}
            </div>
          </section>

          {/* Language */}
          <section className="eco-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌐</span>
              <h2 className="text-sm font-semibold text-[var(--accent-teal)] uppercase tracking-wide">
                {copy.language}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-4">{copy.languageDesc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['id', 'en'] as const).map((option) => {
                const selected = language === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => changeLanguage(option)}
                    className="flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all"
                    style={{
                      borderColor: selected ? 'var(--border-glow)' : 'var(--border-card)',
                      background: selected ? 'var(--surface-selected)' : 'var(--surface-muted)',
                    }}
                  >
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-lg">{option === 'id' ? '🇮🇩' : '🇬🇧'}</span>
                      {option === 'id' ? copy.indonesian : copy.english}
                    </span>
                    {selected && <span className="text-sm text-[var(--accent-green)]">✓</span>}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Notifications */}
          <section className="eco-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔔</span>
                  <h2 className="text-sm font-semibold text-[var(--accent-amber)] uppercase tracking-wide">
                    {copy.notifications}
                  </h2>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{copy.notificationsDesc}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={notifications}
                aria-label={copy.notifications}
                onClick={changeNotifications}
                className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors"
                style={{ background: notifications ? 'var(--accent-green)' : 'var(--switch-off)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: notifications ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`badge text-[10px] ${notifications ? 'badge-green' : 'badge-gray'}`}>
                {notifications ? copy.enabled : copy.disabled}
              </span>
              <button
                type="button"
                onClick={() => {
                  play('toggle')
                  setTestToast(true)
                }}
                disabled={!notifications}
                className="eco-btn-secondary px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🔔 {copy.testNotification}
              </button>
            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--text-muted)]">{copy.autoSave}</p>
      </div>
    </main>
  )
}
