'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Mission, EnvironmentStatus, EventLog, GameAction, Achievement } from '@/types'
import { completeMission } from '@/lib/supabase/progress'
import { checkAndUnlockAchievements } from '@/lib/supabase/achievements'
import {
  formatObjectiveProgress,
  isActionUseful,
  isObjectiveComplete,
  missionProgressPercent,
  objectiveTarget,
} from '@/lib/gameplay/objectives'
import AchievementToast from '@/components/game/AchievementToast'
import IsometricMap from '@/components/game/IsometricMap'

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

const BASE_STATUS: EnvironmentStatus = {
  pollution: 78, biodiversity: 22, waterQuality: 31,
  fishPopulation: 18, trees: 23, energy: 270, credits: 1200, drones: 3,
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

export default function GameplayClient({ mission, regionId, level }: { mission: Mission; regionId: string; level: number }) {
  const [status, setStatus] = useState<EnvironmentStatus>(() => ({
    ...BASE_STATUS,
    credits: mission.startingCredits,
    energy: mission.startingEnergy,
  }))
  const [logs, setLogs] = useState<EventLog[]>(initialLogs)
  const [missionComplete, setMissionComplete] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const logSeq = useRef(0)

  const treeTarget = objectiveTarget(mission.objectives, 'trees', 50)
  const droneTarget = objectiveTarget(mission.objectives, 'drones', 5)

  const objResults = mission.objectives.map((objective) => ({
    ...objective,
    done: isObjectiveComplete(objective, status),
    progress: formatObjectiveProgress(objective, status),
  }))
  const progress = missionProgressPercent(mission.objectives, status)

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

    return () => {
      el.style.removeProperty('--gameplay-active')
      lockOrientation('portrait')
    }
  }, [])

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

  const checkMissionComplete = useCallback(async (snapshot: EnvironmentStatus, progressPct: number) => {
    if (progressPct < 100 || missionComplete) return

    setMissionComplete(true)
    setSaveState('saving')

    const result = await completeMission(regionId, level, {
      pollutionFinal: snapshot.pollution,
      biodiversityFinal: snapshot.biodiversity,
      treesPlanted: snapshot.trees,
      researchPointsEarned: mission.researchPoints,
    })

    if (!result.ok) {
      setSaveState(result.reason === 'guest' ? 'guest' : 'error')
      return
    }

    setSaveState('saved')

    const unlocked = await checkAndUnlockAchievements({
      treesPlanted: snapshot.trees,
      pollutionLevel: snapshot.pollution,
      missionsCompleted: result.progress.completedLevels.length,
      researchPoints: result.progress.researchPoints,
    })
    if (unlocked.length > 0) setNewAchievements(unlocked)
  }, [missionComplete, regionId, level, mission.researchPoints])

  const handleAction = useCallback((definition: ActionDefinition) => {
    if (!isActionUseful(definition.action, mission.objectives, status)) {
      pushLog('info', `Aksi ${definition.label} tidak lagi diperlukan untuk objektif.`)
      return
    }

    const cost = ACTION_COSTS[definition.action]
    if (!canAfford(cost, status)) {
      pushLog('alert', `Sumber daya tidak cukup untuk ${definition.label} (${formatCost(cost)}).`)
      return
    }

    const result = applyAction(status, definition.action, definition.label, treeTarget, droneTarget)
    setStatus(result.status)
    pushLog(result.type, result.message)

    // Status only changes through this handler, so evaluate completion here
    // instead of triggering a cascading state update from an effect.
    void checkMissionComplete(
      result.status,
      missionProgressPercent(mission.objectives, result.status)
    )
  }, [status, treeTarget, droneTarget, pushLog, checkMissionComplete, mission.objectives])

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

      <div id="gameplay-root" className="flex flex-col" style={{ background: '#0a1a14', color: '#e8f5e9', width: '100%', height: '100dvh', overflow: 'hidden' }}>
        <AchievementToast achievements={newAchievements} />

        {/* Mission Complete */}
        {missionComplete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <div className="eco-card p-6 text-center max-w-xs w-full" style={{ borderColor: '#22c55e', boxShadow: '0 0 40px rgba(74,222,128,0.3)' }}>
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-[var(--accent-green)] mb-1">Misi Selesai!</h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">{saveMessage[saveState]}</p>
              <div className="eco-card p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Research Points</span><span className="text-[var(--accent-amber)] font-bold">+{mission.researchPoints} ⭐</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Level berikutnya</span><span className="text-[var(--accent-teal)]">Level {level + 1} 🔓</span></div>
              </div>
              <div className="flex gap-2">
                <Link href={`/mission/${regionId}`} className="flex-1"><button className="eco-btn-primary w-full py-2 text-xs">Lanjut →</button></Link>
                <Link href="/" className="flex-1"><button className="eco-btn-secondary w-full py-2 text-xs">Menu</button></Link>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a3a2e', background: '#0d1f1a' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">🌿</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{mission.title}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{mission.location} · Lv.{level}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 flex-1 mx-3">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#16a34a,#2dd4bf)', boxShadow: '0 0 6px rgba(45,212,191,0.5)' }} />
            </div>
            <span className="text-[10px] text-[var(--accent-amber)] font-bold whitespace-nowrap">{progress}%</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="badge badge-green text-[9px]">● LIVE</span>
            <Link href={`/briefing/${regionId}/${level}`} className="badge badge-gray text-[9px]">⏸</Link>
          </div>
        </div>

        {/* Main area: status | map | actions */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: status panel */}
          <div className="flex flex-col border-r overflow-y-auto flex-shrink-0" style={{ width: '110px', borderColor: '#1a3a2e', background: '#0d1f1a' }}>
            <div className="p-2 space-y-3">
              {/* Env bars */}
              <div>
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Lingkungan</p>
                {[
                  { label: 'Polusi',  val: status.pollution,    inv: true,  emoji: '☁️' },
                  { label: 'Bio',     val: status.biodiversity, inv: false, emoji: '🦋' },
                  { label: 'Air',     val: status.waterQuality, inv: false, emoji: '💧' },
                  { label: 'Ikan',    val: status.fishPopulation,inv: false,emoji: '🐟' },
                ].map(({ label, val, inv, emoji }) => (
                  <div key={label} className="mb-2">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-[var(--text-muted)]">{emoji} {label}</span>
                      <span className="text-[9px] font-medium text-white">{val}%</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-1 rounded-full transition-all" style={{ width: `${val}%`, background: barColor(val, inv) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Resources */}
              <div className="space-y-1">
                <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest mb-1">Sumber Daya</p>
                {[
                  { icon: '🌳', label: `${status.trees}/${treeTarget}` },
                  { icon: '⚡', label: `${status.energy}` },
                  { icon: '💰', label: `${status.credits}` },
                  { icon: '🚁', label: `${status.drones}/${droneTarget}` },
                ].map(({ icon, label }) => (
                  <div key={icon} className="flex justify-between text-[9px]">
                    <span>{icon}</span>
                    <span className="text-white font-medium">{label}</span>
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
                        <p className="text-[8px] leading-tight" style={{ color: obj.done ? '#4ade80' : '#86efac' }}>
                          {obj.label}
                        </p>
                      </div>
                      <p className="text-[7px] pl-3.5" style={{ color: obj.done ? '#22c55e' : '#6b9e7a' }}>
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
                    <p key={log.id} className="text-[8px] leading-tight" style={{ color: log.type === 'alert' ? '#f87171' : log.type === 'success' ? '#4ade80' : '#6b9e7a' }}>
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
              onTileClick={(type) => {
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
          <div className="flex flex-col border-l overflow-y-auto flex-shrink-0" style={{ width: '72px', borderColor: '#1a3a2e', background: '#0d1f1a' }}>
            <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest text-center py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a3a2e' }}>Aksi</p>
            <div className="flex flex-col gap-1 p-1.5 flex-1">
              {ACTIONS.map((definition) => {
                const cost = ACTION_COSTS[definition.action]
                const affordable = canAfford(cost, status)
                const useful = isActionUseful(definition.action, mission.objectives, status)
                const enabled = affordable && useful

                return (
                  <button
                    key={definition.action}
                    onClick={() => handleAction(definition)}
                    disabled={!enabled}
                    title={!useful ? 'Target aksi ini sudah tercapai' : !affordable ? 'Sumber daya tidak cukup' : undefined}
                    className="flex flex-col items-center justify-center rounded-lg p-1.5 text-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e4a38', minHeight: '52px' }}
                    onMouseEnter={(e) => {
                      if (!enabled) return
                      e.currentTarget.style.borderColor = '#22c55e'
                      e.currentTarget.style.background = 'rgba(74,222,128,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1e4a38'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }}
                  >
                    <span className="text-lg leading-none mb-0.5">{definition.emoji}</span>
                    <span className="text-[8px] text-white font-medium leading-tight">{definition.label}</span>
                    <span className="text-[7px] mt-0.5" style={{ color: affordable ? 'var(--text-muted)' : '#f87171' }}>{formatCost(cost)}</span>
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
