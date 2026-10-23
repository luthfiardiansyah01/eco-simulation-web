'use client'

import { useState, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Mission, EnvironmentStatus, EventLog, GameAction, Achievement } from '@/types'
import { completeMission, type CompleteMissionResult } from '@/lib/supabase/progress'
import { checkAndUnlockAchievements } from '@/lib/supabase/achievements'
import {
  canAdvanceObjective,
  formatObjectiveProgress,
  isActionUseful,
  isObjectiveComplete,
  missionProgressPercent,
  objectiveTarget,
} from '@/lib/gameplay/objectives'
import AchievementToast from '@/components/game/AchievementToast'
import IsometricMap, { type MapActionTrigger } from '@/components/game/IsometricMap'
import SoundToggle from '@/components/audio/SoundToggle'
import { useSound } from '@/components/audio/SoundProvider'
import { useI18n } from '@/components/settings/PreferencesProvider'
import type { SoundName } from '@/lib/audio/sound-engine'
import {
  DIFFICULTIES,
  getStartingStatus,
  type Difficulty,
} from '@/lib/gameplay/difficulty'
import {
  ACTION_COSTS,
  applyAction,
  canAfford,
  formatCost,
} from '@/lib/gameplay/actions'

type ActionDefinition = { emoji: string; label: string; action: GameAction }
type SaveState = 'idle' | 'saving' | 'saved' | 'guest' | 'error'

const ACTIONS: ActionDefinition[] = [
  { emoji: '🗑️', label: 'Bersihkan',   action: 'clean_waste'  },
  { emoji: '🌱', label: 'Tanam Pohon', action: 'plant_tree'   },
  { emoji: '🔬', label: 'Scan Air',    action: 'scan_water'   },
  { emoji: '🚁', label: 'Drone',       action: 'deploy_drone' },
  { emoji: '💧', label: 'Filter',      action: 'build_filter' },
  { emoji: '🗺️', label: 'Peta',        action: 'open_map'     },
  { emoji: '📊', label: 'Analisis',    action: 'analyze_area' },
  { emoji: '🏕️', label: 'Base',        action: 'return_base'  },
]

const ACTION_SOUNDS: Record<GameAction, SoundName> = {
  clean_waste: 'clean',
  plant_tree: 'plant',
  scan_water: 'water',
  deploy_drone: 'drone',
  build_filter: 'filter',
  open_map: 'map',
  analyze_area: 'map',
  return_base: 'click',
}

const INITIAL_LOGS: EventLog[] = [
  { id: '1', type: 'alert',   message: 'Baterai drone hampir habis', timestamp: new Date() },
  { id: '2', type: 'info',    message: 'Ekosistem mulai stabil',     timestamp: new Date() },
  { id: '3', type: 'alert',   message: 'Lonjakan polusi terdeteksi', timestamp: new Date() },
  { id: '4', type: 'success', message: 'Data riset terkumpul',       timestamp: new Date() },
]

const subscribeToNativeApp = () => () => {}
const getNativeAppSnapshot = () => Capacitor.isNativePlatform()
const getServerNativeAppSnapshot = () => false

export default function GameplayClient({
  mission,
  regionId,
  level,
  difficulty,
}: {
  mission: Mission
  regionId: string
  level: number
  difficulty: Difficulty
}) {
  const { play, startAmbience, stopAmbience } = useSound()
  const { language, t } = useI18n()
  const router = useRouter()
  const isNativeApp = useSyncExternalStore(
    subscribeToNativeApp,
    getNativeAppSnapshot,
    getServerNativeAppSnapshot
  )
  const difficultyMeta = DIFFICULTIES[difficulty]
  const initialLogs = useMemo(
    () => INITIAL_LOGS.map((log) => ({ ...log, message: t(log.message) })),
    [t]
  )
  const [status, setStatus] = useState<EnvironmentStatus>(() => getStartingStatus(mission, difficulty))
  const [logs, setLogs] = useState<EventLog[]>(initialLogs)
  const [missionComplete, setMissionComplete] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const logSeq = useRef(0)
  const startedRef = useRef(false)
  const completionGuardRef = useRef(false)
  const mapActionRef = useRef<MapActionTrigger | null>(null)

  const treeTarget = objectiveTarget(mission.objectives, 'trees', 50)
  const droneTarget = objectiveTarget(mission.objectives, 'drones', 5)

  const objResults = mission.objectives.map((objective) => ({
    ...objective,
    done: isObjectiveComplete(objective, status),
    progress: formatObjectiveProgress(objective, status, language),
  }))
  const progress = missionProgressPercent(mission.objectives, status)
  const canMakeProgress = ACTIONS.some(
    (definition) =>
      canAdvanceObjective(definition.action, mission.objectives, status)
      && canAfford(ACTION_COSTS[definition.action], status)
  )
  const missionFailed = !missionComplete && progress < 100 && !canMakeProgress

  function lockOrientation(orientation: 'landscape' | 'portrait') {
    // Native Android bridge (most reliable)
    try {
      const w = window as unknown as { AndroidOrientation?: { lock: (o: string) => void } }
      if (w.AndroidOrientation) {
        w.AndroidOrientation.lock(orientation)
        return
      }
    } catch { /* ignore */ }
    // Web fallback
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        const orientationApi = screen.orientation as ScreenOrientation & {
          lock: (o: string) => Promise<void>
        }
        void orientationApi.lock(orientation).catch(() => { /* unsupported */ })
      }
    } catch { /* ignore */ }
  }

  // Lock to landscape on mount, restore on unmount
  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--gameplay-active', '1')

    lockOrientation('landscape')

    if (!startedRef.current) {
      startedRef.current = true
      play('start')
    }

    return () => {
      el.style.removeProperty('--gameplay-active')
      lockOrientation('portrait')
    }
  }, [play])

  // Keep the nature ambience scoped to the gameplay screen.
  useEffect(() => {
    startAmbience()
    return () => stopAmbience()
  }, [startAmbience, stopAmbience])

  useEffect(() => {
    if (newAchievements.length === 0) return
    const timer = setTimeout(() => setNewAchievements([]), 4000)
    return () => clearTimeout(timer)
  }, [newAchievements])

  useEffect(() => {
    if (!showExitConfirm) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowExitConfirm(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showExitConfirm])

  const pushLog = useCallback((type: EventLog['type'], message: string) => {
    logSeq.current += 1
    const entry: EventLog = {
      id: `log-${logSeq.current}`,
      type,
      message,
      timestamp: new Date(),
    }
    setLogs((prev) => [entry, ...prev].slice(0, 10))
  }, [])

  const resetMission = useCallback(() => {
    completionGuardRef.current = false
    setStatus(getStartingStatus(mission, difficulty))
    setLogs(initialLogs.map((log) => ({ ...log })))
    setMissionComplete(false)
    setSaveState('idle')
    setSaveError('')
    setNewAchievements([])
    logSeq.current = 0
    pushLog('info', t('Misi direset. Sumber daya dan lingkungan dipulihkan.'))
    play('click')
  }, [difficulty, initialLogs, mission, play, pushLog, t])

  const exitApplication = useCallback(async () => {
    play('click')
    setShowExitConfirm(false)

    if (Capacitor.isNativePlatform()) {
      try {
        await App.exitApp()
        return
      } catch (error) {
        console.error('Failed to exit the app', error)
      }
    }

    // Browsers cannot close a normal tab. Fall back to the main menu.
    router.push('/')
  }, [play, router])

  const persistMission = useCallback(async (snapshot: EnvironmentStatus) => {
    setSaveState('saving')
    setSaveError('')

    let result: CompleteMissionResult

    try {
      result = await completeMission(regionId, level, {
        pollutionFinal: snapshot.pollution,
        biodiversityFinal: snapshot.biodiversity,
        waterQualityFinal: snapshot.waterQuality,
        fishPopulationFinal: snapshot.fishPopulation,
        treesPlanted: snapshot.trees,
        dronesDeployed: snapshot.drones,
      })
    } catch (error) {
      console.error('Failed to save mission progress', error)
      completionGuardRef.current = false
      setSaveState('error')
      setSaveError(t('Koneksi gagal saat menyimpan progress. Coba lagi.'))
      play('error')
      return
    }

    if (!result.ok) {
      setSaveState(result.reason === 'guest' ? 'guest' : 'error')
      if (result.reason !== 'guest') {
        setSaveError(result.message ? t(result.message) : t('Gagal menyimpan progress. Coba lagi.'))
        play('error')
      }
      completionGuardRef.current = false
      return
    }

    setSaveState('saved')
    completionGuardRef.current = false

    try {
      const unlocked = await checkAndUnlockAchievements({
        treesPlanted: snapshot.trees,
        pollutionLevel: snapshot.pollution,
        missionsCompleted: result.progress.completedLevels.length,
        researchPoints: result.progress.researchPoints,
      })
      if (unlocked.length > 0) {
        setNewAchievements(unlocked)
        play('achievement')
      }
    } catch (error) {
      // Mission progress is already saved; achievement errors are non-fatal.
      console.error('Failed to evaluate achievements', error)
    }
  }, [level, play, regionId, t])

  const checkMissionComplete = useCallback(async (snapshot: EnvironmentStatus, progressPct: number) => {
    if (progressPct < 100 || missionComplete || completionGuardRef.current) return

    completionGuardRef.current = true
    setMissionComplete(true)
    play('missionComplete')
    await persistMission(snapshot)
  }, [missionComplete, persistMission, play])

  const retrySave = useCallback(() => {
    if (completionGuardRef.current) return
    completionGuardRef.current = true
    void persistMission(status)
  }, [persistMission, status])

  const registerMapAction = useCallback((trigger: MapActionTrigger) => {
    mapActionRef.current = trigger
  }, [])

  const handleAction = useCallback((definition: ActionDefinition) => {
    if (missionComplete || missionFailed) return

    const label = t(definition.label)

    if (!isActionUseful(definition.action, mission.objectives, status)) {
      play('error')
      pushLog(
        'info',
        t('Aksi {label} tidak lagi diperlukan untuk objektif.', { label })
      )
      return
    }

    const cost = ACTION_COSTS[definition.action]
    if (!canAfford(cost, status)) {
      play('error')
      pushLog(
        'alert',
        t('Sumber daya tidak cukup untuk {label} ({cost}).', {
          label,
          cost: formatCost(cost),
        })
      )
      return
    }

    const result = applyAction(
      status,
      definition.action,
      label,
      treeTarget,
      droneTarget,
      language
    )
    mapActionRef.current?.(definition.action)
    setStatus(result.status)
    play(ACTION_SOUNDS[definition.action])
    pushLog(result.type, result.message)

    // Status only changes through this handler, so evaluate completion here
    // instead of triggering a cascading state update from an effect.
    void checkMissionComplete(
      result.status,
      missionProgressPercent(mission.objectives, result.status)
    )
  }, [status, treeTarget, droneTarget, pushLog, checkMissionComplete, mission.objectives, missionComplete, missionFailed, play, language, t])

  const barColor = (val: number, inv = false) => {
    const v = inv ? 100 - val : val
    return v > 60 ? '#22c55e' : v > 30 ? '#eab308' : '#ef4444'
  }

  const saveMessage: Record<SaveState, string> = {
    idle: '',
    saving: t('⏳ Menyimpan...'),
    saved: t('✓ Progress tersimpan!'),
    guest: t('⚠ Masuk untuk menyimpan progress'),
    error: t('⚠ Gagal menyimpan progress'),
  }

  return (
    <>
      {/* Force landscape via CSS when JS lock fails */}
      <style>{`
        @media (orientation: portrait) {
          #gameplay-root {
            transform: rotate(90deg);
            transform-origin: left top;
            width: 100vh;
            height: 100vw;
            position: fixed;
            top: 0;
            left: 100%;
            overflow: hidden;
          }
        }
      `}</style>

      <div id="gameplay-root" className="flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)', width: '100%', height: '100dvh', overflow: 'hidden' }}>
        <AchievementToast achievements={newAchievements} />

        {/* Exit confirmation */}
        {showExitConfirm && (
          <div
            data-testid="exit-game-dialog"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'var(--overlay-backdrop)', backdropFilter: 'blur(8px)' }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowExitConfirm(false)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="exit-game-title"
              aria-describedby="exit-game-description"
              className="eco-card p-5 max-w-sm w-full"
              style={{ borderColor: 'var(--accent-red)' }}
            >
              <div className="text-3xl text-center mb-2">🚪</div>
              <h2 id="exit-game-title" className="text-lg font-bold text-foreground text-center mb-1">
                {isNativeApp ? t('Keluar dari Aplikasi?') : t('Keluar dari Simulasi?')}
              </h2>
              <p id="exit-game-description" className="text-xs text-[var(--text-muted)] text-center leading-relaxed mb-4">
                {isNativeApp
                  ? t('Aplikasi akan ditutup. Progress misi yang belum selesai tidak akan disimpan.')
                  : t('Progress misi yang belum selesai tidak akan disimpan.')}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  autoFocus
                  type="button"
                  onClick={() => {
                    play('click')
                    setShowExitConfirm(false)
                  }}
                  className="eco-btn-primary w-full py-2 text-sm"
                >
                  {t('Lanjut Bermain')}
                </button>
                <Link
                  href={`/briefing/${regionId}/${level}?difficulty=${difficulty}`}
                  className="eco-btn-secondary block w-full py-2 text-sm text-center"
                  onClick={() => {
                    play('click')
                    setShowExitConfirm(false)
                  }}
                >
                  {t('Kembali ke Briefing')}
                </Link>
                <button
                  type="button"
                  onClick={() => { void exitApplication() }}
                  className="block w-full py-2 text-sm text-center rounded-[10px] border transition-colors"
                  style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                >
                  {isNativeApp ? t('Keluar Aplikasi') : t('Keluar ke Menu')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mission Complete */}
        {missionComplete && (
          <div data-testid="mission-complete" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay-backdrop)', backdropFilter: 'blur(8px)' }}>
            <div className="eco-card p-6 text-center max-w-xs w-full" style={{ borderColor: 'var(--accent-green)', boxShadow: 'var(--glow-green)' }}>
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-[var(--accent-green)] mb-1">{t('Misi Selesai!')}</h2>
              <p className="text-xs text-[var(--text-muted)] mb-2">{saveMessage[saveState]}</p>
              {saveState === 'error' && (
                <p data-testid="save-error" role="alert" className="text-[11px] leading-relaxed text-[var(--accent-red)] mb-4">
                  {saveError || t('Gagal menyimpan progress. Coba lagi atau reset misi.')}
                </p>
              )}
              <div className="eco-card p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t('Poin Riset')}</span><span className="text-[var(--accent-amber)] font-bold">+{mission.researchPoints} ⭐</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t('Kesulitan')}</span><span className="font-semibold" style={{ color: difficultyMeta.accent }}>{t(difficultyMeta.label)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">{t('Level berikutnya')}</span><span className="text-[var(--accent-teal)]">{t('Level {level} 🔓', { level: level + 1 })}</span></div>
              </div>
              {saveState === 'error' ? (
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={retrySave} className="eco-btn-primary w-full py-2 text-xs">
                    {t('🔄 Coba Simpan Lagi')}
                  </button>
                  <button type="button" onClick={resetMission} className="eco-btn-secondary w-full py-2 text-xs">
                    {t('Reset Misi')}
                  </button>
                  <Link href={`/mission/${regionId}`} className="eco-btn-secondary block w-full py-2 text-xs text-center" onClick={() => play('click')}>
                    {t('Kembali')}
                  </Link>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href={`/mission/${regionId}`} className="flex-1"><button className="eco-btn-primary w-full py-2 text-xs" onClick={() => play('click')}>{t('Lanjut →')}</button></Link>
                  <Link href="/" className="flex-1"><button className="eco-btn-secondary w-full py-2 text-xs" onClick={() => play('click')}>{t('Menu')}</button></Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mission Failed */}
        {missionFailed && (
          <div data-testid="mission-failed" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay-backdrop)', backdropFilter: 'blur(8px)' }}>
            <div className="eco-card p-6 text-center max-w-xs w-full" style={{ borderColor: 'var(--accent-red)' }}>
              <div className="text-4xl mb-3">💸</div>
              <h2 className="text-xl font-bold text-[var(--accent-red)] mb-1">{t('Misi Gagal')}</h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                {t('Sumber daya habis sebelum semua objektif tercapai. Reset misi untuk memulihkan sumber daya dan mencoba lagi.')}
              </p>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={resetMission} className="eco-btn-primary w-full py-2.5 text-sm">
                  {t('🔄 Reset Misi')}
                </button>
                <Link
                  href={`/briefing/${regionId}/${level}?difficulty=${difficulty}`}
                  className="eco-btn-secondary block w-full py-2.5 text-sm text-center"
                  onClick={() => play('click')}
                >
                  {t('Kembali ke Briefing')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">🌿</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{mission.title}</p>
              <p className="text-[9px] text-[var(--text-muted)]">
                {mission.location} · Lv.{level} ·{' '}
                <span style={{ color: difficultyMeta.accent }}>{t(difficultyMeta.label)}</span>
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 flex-1 mx-3">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--track-bg)' }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#16a34a,#2dd4bf)', boxShadow: '0 0 6px rgba(45,212,191,0.5)' }} />
            </div>
            <span data-testid="mission-progress" className="text-[10px] text-[var(--accent-amber)] font-bold whitespace-nowrap">{progress}%</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="badge badge-green text-[9px]">● {t('LIVE')}</span>
            <SoundToggle floating={false} />
            <Link
              href={`/briefing/${regionId}/${level}?difficulty=${difficulty}`}
              className="badge badge-gray text-[9px]"
              onClick={() => play('click')}
            >
              ⏸
            </Link>
            <button
              type="button"
              data-testid="exit-game"
              onClick={() => {
                play('click')
                setShowExitConfirm(true)
              }}
              className="flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold cursor-pointer transition-all hover:brightness-110 active:scale-95"
              style={{
                background: 'rgba(248, 113, 113, 0.2)',
                border: '1px solid rgba(248, 113, 113, 0.65)',
                color: '#fca5a5',
                boxShadow: '0 0 10px rgba(248, 113, 113, 0.15)',
              }}
              title={t('Keluar dari simulasi')}
              aria-label={t('Keluar dari simulasi')}
            >
              <span aria-hidden="true">🚪</span>
              <span>{t('Keluar Game')}</span>
            </button>
          </div>
        </div>

        {/* Main area: status | map | actions */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: status panel */}
          <div className="flex flex-col border-r overflow-y-auto flex-shrink-0" style={{ width: '110px', borderColor: 'var(--border-card)', background: 'var(--bg-card)' }}>
            <div className="p-2 space-y-3">
              {/* Env bars */}
              <div>
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5">{t('Lingkungan')}</p>
                {[
                  { key: 'pollution',     label: t('Polusi'), val: status.pollution,     inv: true,  emoji: '☁️' },
                  { key: 'biodiversity',  label: t('Bio'),    val: status.biodiversity,  inv: false, emoji: '🦋' },
                  { key: 'waterQuality',  label: t('Air'),    val: status.waterQuality,  inv: false, emoji: '💧' },
                  { key: 'fishPopulation',label: t('Ikan'),   val: status.fishPopulation,inv: false, emoji: '🐟' },
                ].map(({ key, label, val, inv, emoji }) => (
                  <div key={key} className="mb-2">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-[var(--text-muted)]">{emoji} {label}</span>
                      <span data-testid={`env-${key}`} className="text-[9px] font-medium text-foreground">{val}%</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'var(--track-bg)' }}>
                      <div className="h-1 rounded-full transition-all" style={{ width: `${val}%`, background: barColor(val, inv) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Resources */}
              <div className="space-y-1">
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('Sumber Daya')}</p>
                {[
                  { key: 'trees',   icon: '🌳', label: `${status.trees}/${treeTarget}` },
                  { key: 'energy',  icon: '⚡', label: `${status.energy}` },
                  { key: 'credits', icon: '💰', label: `${status.credits}` },
                  { key: 'drones',  icon: '🚁', label: `${status.drones}/${droneTarget}` },
                ].map(({ key, icon, label }) => (
                  <div key={key} className="flex justify-between text-[9px]">
                    <span>{icon}</span>
                    <span data-testid={`resource-${key}`} className="text-foreground font-medium">{label}</span>
                  </div>
                ))}
              </div>

              {/* Objectives real-time */}
              <div>
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5">{t('Objektif')}</p>
                <div className="space-y-2">
                  {objResults.map((obj) => (
                    <div key={`${obj.metric}-${obj.target}`}>
                      <div className="flex items-start gap-1 mb-0.5">
                        <span className="text-[10px] flex-shrink-0 mt-0.5">{obj.done ? '✅' : '⬜'}</span>
                        <p className="text-[8px] leading-tight" style={{ color: obj.done ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                          {obj.label}
                        </p>
                      </div>
                      <p className="text-[7px] pl-3.5" style={{ color: obj.done ? 'var(--border-glow)' : 'var(--text-muted)' }}>
                        {obj.progress}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event log */}
              <div>
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('Log')}</p>
                <div className="space-y-1">
                  {logs.slice(0, 3).map((log) => (
                    <p key={log.id} className="text-[8px] leading-tight" style={{ color: log.type === 'alert' ? 'var(--accent-red)' : log.type === 'success' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {log.type === 'alert' ? '⚠' : log.type === 'success' ? '✓' : '›'} {log.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Center: isometric map */}
          <div className="flex-1 overflow-hidden relative">
            <IsometricMap
              pollution={status.pollution}
              biodiversity={status.biodiversity}
              waterQuality={status.waterQuality}
              trees={status.trees}
              onAction={registerMapAction}
              onTileClick={(type) => {
                play('tile')
                const msgs: Record<string, string> = {
                  water:    t('Sungai — scan kualitas air'),
                  grass:    t('Area hijau — cocok untuk pohon'),
                  tree:     t('Pohon teridentifikasi'),
                  polluted: t('Area tercemar — perlu dibersihkan!'),
                  dirt:     t('Tanah kosong'),
                }
                pushLog(
                  type === 'polluted' ? 'alert' : 'info',
                  msgs[type] ?? t('Tile {type}', { type })
                )
              }}
            />
          </div>

          {/* Right: action buttons (vertical) */}
          <div className="flex flex-col border-l overflow-y-auto flex-shrink-0" style={{ width: '72px', borderColor: 'var(--border-card)', background: 'var(--bg-card)' }}>
            <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest text-center py-1.5 border-b flex-shrink-0" style={{ borderColor: 'var(--border-card)' }}>{t('Aksi')}</p>
            <div className="flex flex-col gap-1 p-1.5 flex-1">
              {ACTIONS.map((definition) => {
                const cost = ACTION_COSTS[definition.action]
                const affordable = canAfford(cost, status)
                const useful = isActionUseful(definition.action, mission.objectives, status)
                const enabled = affordable && useful && !missionComplete && !missionFailed

                return (
                  <button
                    key={definition.action}
                    data-testid={`action-${definition.action}`}
                    onClick={() => handleAction(definition)}
                    disabled={!enabled}
                    title={
                      missionComplete || missionFailed
                        ? t('Misi sudah berakhir')
                        : !useful
                          ? t('Target aksi ini sudah tercapai')
                          : !affordable
                            ? t('Sumber daya tidak cukup')
                            : undefined
                    }
                    className="flex flex-col items-center justify-center rounded-lg p-1.5 text-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--surface-muted)', border: '1px solid var(--border-card)', minHeight: '52px' }}
                    onMouseEnter={(e) => {
                      if (!enabled) return
                      e.currentTarget.style.borderColor = 'var(--border-glow)'
                      e.currentTarget.style.background = 'var(--surface-selected)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-card)'
                      e.currentTarget.style.background = 'var(--surface-muted)'
                    }}
                  >
                    <span className="text-lg leading-none mb-0.5">{definition.emoji}</span>
                    <span className="text-[8px] text-foreground font-medium leading-tight">{t(definition.label)}</span>
                    <span className="text-[7px] mt-0.5" style={{ color: affordable ? 'var(--text-muted)' : 'var(--accent-red)' }}>{formatCost(cost)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
