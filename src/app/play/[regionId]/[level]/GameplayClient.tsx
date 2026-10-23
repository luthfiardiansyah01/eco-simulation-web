'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
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
import type { SoundName } from '@/lib/audio/sound-engine'
import {
  DIFFICULTIES,
  getStartingStatus,
  type Difficulty,
} from '@/lib/gameplay/difficulty'

type ActionCost = { credits?: number; energy?: number }
type ActionDefinition = { emoji: string; label: string; action: GameAction }
type SaveState = 'idle' | 'saving' | 'saved' | 'guest' | 'error'

const ACTION_COSTS: Record<GameAction, ActionCost> = {
  clean_waste: { credits: 50 },
  plant_tree: { credits: 30 },
  scan_water: { energy: 10 },
  deploy_drone: { energy: 30 },
  build_filter: { credits: 150 },
  open_map: {},
  analyze_area: {},
  return_base: {},
}

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

const initialLogs: EventLog[] = [
  { id: '1', type: 'alert',   message: 'Baterai drone hampir habis', timestamp: new Date() },
  { id: '2', type: 'info',    message: 'Ekosistem mulai stabil',     timestamp: new Date() },
  { id: '3', type: 'alert',   message: 'Lonjakan polusi terdeteksi', timestamp: new Date() },
  { id: '4', type: 'success', message: 'Data riset terkumpul',       timestamp: new Date() },
]

function formatCost(cost: ActionCost): string {
  const parts: string[] = []
  if (cost.credits) parts.push(`-${cost.credits}💰`)
  if (cost.energy) parts.push(`-${cost.energy}⚡`)
  return parts.length > 0 ? parts.join(' ') : '—'
}

function canAfford(cost: ActionCost, status: EnvironmentStatus): boolean {
  return (cost.credits ?? 0) <= status.credits
    && (cost.energy ?? 0) <= status.energy
}

function applyAction(
  prev: EnvironmentStatus,
  action: GameAction,
  label: string,
  treeTarget: number,
  droneTarget: number
): { status: EnvironmentStatus; message: string; type: EventLog['type'] } {
  const cost = ACTION_COSTS[action]
  const next: EnvironmentStatus = {
    ...prev,
    credits: prev.credits - (cost.credits ?? 0),
    energy: prev.energy - (cost.energy ?? 0),
  }

  let message = `Aksi: ${label}`
  let type: EventLog['type'] = 'info'

  switch (action) {
    case 'clean_waste':
      next.pollution = Math.max(0, prev.pollution - 5)
      if (next.pollution < prev.pollution) {
        next.fishPopulation = Math.min(100, prev.fishPopulation + 3)
      }
      message = 'Sampah dibersihkan'
      type = 'success'
      break
    case 'plant_tree':
      next.trees = prev.trees + 1
      next.biodiversity = Math.min(100, prev.biodiversity + 2)
      message = `Pohon ditanam (${next.trees}/${treeTarget})`
      type = 'success'
      break
    case 'scan_water':
      message = `Kualitas air: ${prev.waterQuality}%`
      break
    case 'deploy_drone':
      next.drones = prev.drones + 1
      message = `Drone diterbangkan (${next.drones}/${droneTarget})`
      type = 'success'
      break
    case 'build_filter':
      next.waterQuality = Math.min(100, prev.waterQuality + 8)
      next.fishPopulation = Math.min(100, prev.fishPopulation + 5)
      message = 'Filter terpasang — ikan mulai kembali'
      type = 'success'
      break
    default:
      message = `Aksi: ${label}`
  }

  return { status: next, message, type }
}

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
  const difficultyMeta = DIFFICULTIES[difficulty]
  const [status, setStatus] = useState<EnvironmentStatus>(() => getStartingStatus(mission, difficulty))
  const [logs, setLogs] = useState<EventLog[]>(initialLogs)
  const [missionComplete, setMissionComplete] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const logSeq = useRef(0)
  const startedRef = useRef(false)
  const completionGuardRef = useRef(false)
  const mapActionRef = useRef<MapActionTrigger | null>(null)

  const treeTarget = objectiveTarget(mission.objectives, 'trees', 50)
  const droneTarget = objectiveTarget(mission.objectives, 'drones', 5)

  const objResults = mission.objectives.map((objective) => ({
    ...objective,
    done: isObjectiveComplete(objective, status),
    progress: formatObjectiveProgress(objective, status),
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
    const t = setTimeout(() => setNewAchievements([]), 4000)
    return () => clearTimeout(t)
  }, [newAchievements])

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
    pushLog('info', 'Misi direset. Sumber daya dan lingkungan dipulihkan.')
    play('click')
  }, [difficulty, mission, play, pushLog])

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
      setSaveError('Koneksi gagal saat menyimpan progress. Coba lagi.')
      play('error')
      return
    }

    if (!result.ok) {
      setSaveState(result.reason === 'guest' ? 'guest' : 'error')
      if (result.reason !== 'guest') {
        setSaveError(result.message ?? 'Gagal menyimpan progress. Coba lagi.')
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
  }, [level, play, regionId])

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

    if (!isActionUseful(definition.action, mission.objectives, status)) {
      play('error')
      pushLog('info', `Aksi ${definition.label} tidak lagi diperlukan untuk objektif.`)
      return
    }

    const cost = ACTION_COSTS[definition.action]
    if (!canAfford(cost, status)) {
      play('error')
      pushLog('alert', `Sumber daya tidak cukup untuk ${definition.label} (${formatCost(cost)}).`)
      return
    }

    const result = applyAction(status, definition.action, definition.label, treeTarget, droneTarget)
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
  }, [status, treeTarget, droneTarget, pushLog, checkMissionComplete, mission.objectives, missionComplete, missionFailed, play])

  const barColor = (val: number, inv = false) => {
    const v = inv ? 100 - val : val
    return v > 60 ? '#22c55e' : v > 30 ? '#eab308' : '#ef4444'
  }

  const saveMessage: Record<SaveState, string> = {
    idle: '',
    saving: '⏳ Menyimpan...',
    saved: '✓ Progress tersimpan!',
    guest: '⚠ Masuk untuk menyimpan progress',
    error: '⚠ Gagal menyimpan progress',
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

        {/* Mission Complete */}
        {missionComplete && (
          <div data-testid="mission-complete" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay-backdrop)', backdropFilter: 'blur(8px)' }}>
            <div className="eco-card p-6 text-center max-w-xs w-full" style={{ borderColor: 'var(--accent-green)', boxShadow: 'var(--glow-green)' }}>
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-[var(--accent-green)] mb-1">Misi Selesai!</h2>
              <p className="text-xs text-[var(--text-muted)] mb-2">{saveMessage[saveState]}</p>
              {saveState === 'error' && (
                <p data-testid="save-error" role="alert" className="text-[11px] leading-relaxed text-[var(--accent-red)] mb-4">
                  {saveError || 'Gagal menyimpan progress. Coba lagi atau reset misi.'}
                </p>
              )}
              <div className="eco-card p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Research Points</span><span className="text-[var(--accent-amber)] font-bold">+{mission.researchPoints} ⭐</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Kesulitan</span><span className="font-semibold" style={{ color: difficultyMeta.accent }}>{difficultyMeta.label}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Level berikutnya</span><span className="text-[var(--accent-teal)]">Level {level + 1} 🔓</span></div>
              </div>
              {saveState === 'error' ? (
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={retrySave} className="eco-btn-primary w-full py-2 text-xs">
                    🔄 Coba Simpan Lagi
                  </button>
                  <button type="button" onClick={resetMission} className="eco-btn-secondary w-full py-2 text-xs">
                    Reset Misi
                  </button>
                  <Link href={`/mission/${regionId}`} className="eco-btn-secondary block w-full py-2 text-xs text-center" onClick={() => play('click')}>
                    Kembali
                  </Link>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href={`/mission/${regionId}`} className="flex-1"><button className="eco-btn-primary w-full py-2 text-xs" onClick={() => play('click')}>Lanjut →</button></Link>
                  <Link href="/" className="flex-1"><button className="eco-btn-secondary w-full py-2 text-xs" onClick={() => play('click')}>Menu</button></Link>
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
              <h2 className="text-xl font-bold text-[var(--accent-red)] mb-1">Misi Gagal</h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                Sumber daya habis sebelum semua objektif tercapai. Reset misi untuk memulihkan sumber daya dan mencoba lagi.
              </p>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={resetMission} className="eco-btn-primary w-full py-2.5 text-sm">
                  🔄 Reset Misi
                </button>
                <Link
                  href={`/briefing/${regionId}/${level}?difficulty=${difficulty}`}
                  className="eco-btn-secondary block w-full py-2.5 text-sm text-center"
                  onClick={() => play('click')}
                >
                  Kembali ke Briefing
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
                <span style={{ color: difficultyMeta.accent }}>{difficultyMeta.label}</span>
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
            <span className="badge badge-green text-[9px]">● LIVE</span>
            <SoundToggle floating={false} />
            <Link
              href={`/briefing/${regionId}/${level}?difficulty=${difficulty}`}
              className="badge badge-gray text-[9px]"
              onClick={() => play('click')}
            >
              ⏸
            </Link>
          </div>
        </div>

        {/* Main area: status | map | actions */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: status panel */}
          <div className="flex flex-col border-r overflow-y-auto flex-shrink-0" style={{ width: '110px', borderColor: 'var(--border-card)', background: 'var(--bg-card)' }}>
            <div className="p-2 space-y-3">
              {/* Env bars */}
              <div>
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Lingkungan</p>
                {[
                  { key: 'pollution',     label: 'Polusi', val: status.pollution,     inv: true,  emoji: '☁️' },
                  { key: 'biodiversity',  label: 'Bio',    val: status.biodiversity,  inv: false, emoji: '🦋' },
                  { key: 'waterQuality',  label: 'Air',    val: status.waterQuality,  inv: false, emoji: '💧' },
                  { key: 'fishPopulation',label: 'Ikan',   val: status.fishPopulation,inv: false, emoji: '🐟' },
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
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Sumber Daya</p>
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
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Objektif</p>
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
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Log</p>
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
                  water:    'Sungai — scan kualitas air',
                  grass:    'Area hijau — cocok untuk pohon',
                  tree:     'Pohon teridentifikasi',
                  polluted: 'Area tercemar — perlu dibersihkan!',
                  dirt:     'Tanah kosong',
                }
                pushLog(type === 'polluted' ? 'alert' : 'info', msgs[type] ?? `Tile ${type}`)
              }}
            />
          </div>

          {/* Right: action buttons (vertical) */}
          <div className="flex flex-col border-l overflow-y-auto flex-shrink-0" style={{ width: '72px', borderColor: 'var(--border-card)', background: 'var(--bg-card)' }}>
            <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest text-center py-1.5 border-b flex-shrink-0" style={{ borderColor: 'var(--border-card)' }}>Aksi</p>
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
                        ? 'Misi sudah berakhir'
                        : !useful
                          ? 'Target aksi ini sudah tercapai'
                          : !affordable
                            ? 'Sumber daya tidak cukup'
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
                    <span className="text-[8px] text-foreground font-medium leading-tight">{definition.label}</span>
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
