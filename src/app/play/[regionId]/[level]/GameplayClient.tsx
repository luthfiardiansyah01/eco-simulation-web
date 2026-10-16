'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Mission, EnvironmentStatus, EventLog, GameAction, Achievement } from '@/types'
import { saveProgress, saveMissionResult } from '@/lib/supabase/progress'
import { checkAndUnlockAchievements } from '@/lib/supabase/achievements'
import AchievementToast from '@/components/game/AchievementToast'
import IsometricMap from '@/components/game/IsometricMap'

// Objective condition checker — maps objective text to a live check function
type ObjCheck = { label: string; check: (s: EnvironmentStatus) => boolean; progress: (s: EnvironmentStatus) => string }

function buildObjectiveChecks(objectives: string[]): ObjCheck[] {
  return objectives.map((obj) => {
    const lower = obj.toLowerCase()

    if (lower.includes('pollution') && lower.includes('20')) {
      return { label: obj, check: (s) => s.pollution <= 20, progress: (s) => `Polusi: ${s.pollution}% → target ≤20%` }
    }
    if (lower.includes('pollution') && lower.includes('30')) {
      return { label: obj, check: (s) => s.pollution <= 30, progress: (s) => `Polusi: ${s.pollution}% → target ≤30%` }
    }
    if (lower.includes('fish')) {
      return { label: obj, check: (s) => s.fishPopulation >= 60, progress: (s) => `Ikan: ${s.fishPopulation}% → target ≥60%` }
    }
    if (lower.includes('tree') && lower.includes('50')) {
      return { label: obj, check: (s) => s.trees >= 50, progress: (s) => `Pohon: ${s.trees}/50` }
    }
    if (lower.includes('tree') && lower.includes('100')) {
      return { label: obj, check: (s) => s.trees >= 100, progress: (s) => `Pohon: ${s.trees}/100` }
    }
    if (lower.includes('biodiversity') && lower.includes('60')) {
      return { label: obj, check: (s) => s.biodiversity >= 60, progress: (s) => `Biodiv: ${s.biodiversity}% → target ≥60%` }
    }
    if (lower.includes('biodiversity') && lower.includes('70')) {
      return { label: obj, check: (s) => s.biodiversity >= 70, progress: (s) => `Biodiv: ${s.biodiversity}% → target ≥70%` }
    }
    if (lower.includes('water')) {
      return { label: obj, check: (s) => s.waterQuality >= 70, progress: (s) => `Air: ${s.waterQuality}% → target ≥70%` }
    }
    if (lower.includes('logging') || lower.includes('drone')) {
      return { label: obj, check: (s) => s.drones >= 5, progress: (s) => `Drone: ${s.drones}/5` }
    }
    // Default fallback
    return { label: obj, check: () => false, progress: () => 'Lanjutkan misi...' }
  })
}

const ACTIONS: { emoji: string; label: string; action: GameAction; cost: string }[] = [
  { emoji: '🗑️', label: 'Bersihkan',   action: 'clean_waste',  cost: '-50💰' },
  { emoji: '🌱', label: 'Tanam Pohon', action: 'plant_tree',   cost: '-30💰' },
  { emoji: '🔬', label: 'Scan Air',    action: 'scan_water',   cost: '-10⚡' },
  { emoji: '🚁', label: 'Drone',       action: 'deploy_drone', cost: '-30⚡' },
  { emoji: '💧', label: 'Filter',      action: 'build_filter', cost: '-150💰' },
  { emoji: '🗺️', label: 'Peta',       action: 'open_map',     cost: '—' },
  { emoji: '📊', label: 'Analisis',    action: 'analyze_area', cost: '—' },
  { emoji: '🏕️', label: 'Base',       action: 'return_base',  cost: '—' },
]

const initialStatus: EnvironmentStatus = {
  pollution: 78, biodiversity: 22, waterQuality: 31,
  fishPopulation: 18, trees: 23, energy: 270, credits: 1200, drones: 3,
}

const initialLogs: EventLog[] = [
  { id: '1', type: 'alert',   message: 'Baterai drone hampir habis', timestamp: new Date() },
  { id: '2', type: 'info',    message: 'Ekosistem mulai stabil',     timestamp: new Date() },
  { id: '3', type: 'alert',   message: 'Lonjakan polusi terdeteksi', timestamp: new Date() },
  { id: '4', type: 'success', message: 'Data riset terkumpul',       timestamp: new Date() },
]

export default function GameplayClient({ mission, regionId, level }: { mission: Mission; regionId: string; level: number }) {
  const [status, setStatus] = useState<EnvironmentStatus>(initialStatus)
  const [logs, setLogs] = useState<EventLog[]>(initialLogs)
  const [missionComplete, setMissionComplete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [totalMissionsCompleted, setTotalMissionsCompleted] = useState(0)

  const objChecks = buildObjectiveChecks(mission.objectives)
  const objResults = objChecks.map((o) => ({ ...o, done: o.check(status), progress: o.progress(status) }))
  const completedObjs = objResults.filter((o) => o.done).length
  // Progress = weighted: each completed obj = 100/n%, partial from env stats fill the rest
  const baseProgress = Math.round((completedObjs / objChecks.length) * 100)
  // Bonus partial progress from individual stats (max 30% total bonus before objectives complete)
  const pollBonus   = Math.round(((100 - status.pollution) / 100) * 10)
  const treeBonus   = Math.round((status.trees / 50) * 10)
  const fishBonus   = Math.round((status.fishPopulation / 60) * 10)
  const partialBonus = Math.min(30, pollBonus + treeBonus + fishBonus)
  const progress = completedObjs === objChecks.length ? 100 : Math.min(99, baseProgress + partialBonus)

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
        (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> }).lock(orientation)
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

  // Check mission complete whenever status changes
  useEffect(() => {
    checkMissionComplete(status, progress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, progress])

  const checkMissionComplete = useCallback(async (s: EnvironmentStatus, prog: number) => {
    if (prog >= 100 && !missionComplete) {
      setMissionComplete(true)
      setSaving(true)
      const newTotal = totalMissionsCompleted + 1
      setTotalMissionsCompleted(newTotal)
      await saveMissionResult(regionId, level, {
        pollutionFinal: s.pollution, biodiversityFinal: s.biodiversity,
        treesPlanted: s.trees, researchPointsEarned: 250,
      })
      await saveProgress(regionId, { currentLevel: level + 1, completedLevels: [level], researchPoints: 250 })
      const unlocked = await checkAndUnlockAchievements({
        treesPlanted: s.trees, pollutionLevel: s.pollution,
        missionsCompleted: newTotal, researchPoints: 250,
      })
      if (unlocked.length > 0) setNewAchievements(unlocked)
      setSaving(false)
    }
  }, [missionComplete, regionId, level, totalMissionsCompleted])

  function handleAction(action: GameAction, label: string) {
    const newLog: EventLog = { id: Date.now().toString(), type: 'info', message: '', timestamp: new Date() }
    setStatus((prev) => {
      const next = { ...prev }
      if (action === 'clean_waste')  { next.pollution = Math.max(0, prev.pollution - 5); next.credits -= 50; newLog.message = 'Sampah dibersihkan'; newLog.type = 'success' }
      else if (action === 'plant_tree')   { next.trees++; next.biodiversity = Math.min(100, prev.biodiversity + 2); next.credits -= 30; newLog.message = `Pohon ditanam (${next.trees}/50)`; newLog.type = 'success' }
      else if (action === 'scan_water')   { next.energy -= 10; newLog.message = `Kualitas air: ${prev.waterQuality}%` }
      else if (action === 'deploy_drone') { next.drones++; next.energy -= 30; newLog.message = 'Drone diterbangkan' }
      else if (action === 'build_filter') { next.waterQuality = Math.min(100, prev.waterQuality + 8); next.fishPopulation = Math.min(100, prev.fishPopulation + 5); next.credits -= 150; newLog.message = 'Filter terpasang — ikan mulai kembali'; newLog.type = 'success' }
      else { newLog.message = `Aksi: ${label}` }
      // Passive: fish recover as pollution drops
      if (next.pollution < prev.pollution) {
        next.fishPopulation = Math.min(100, next.fishPopulation + 3)
      }
      return next
    })
    setLogs((prev) => [newLog, ...prev.slice(0, 9)])
  }

  const barColor = (val: number, inv = false) => {
    const v = inv ? 100 - val : val
    return v > 60 ? '#22c55e' : v > 30 ? '#eab308' : '#ef4444'
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
              <p className="text-xs text-[var(--text-muted)] mb-4">{saving ? '⏳ Menyimpan...' : '✓ Progress tersimpan!'}</p>
              <div className="eco-card p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Research Points</span><span className="text-[var(--accent-amber)] font-bold">+250 ⭐</span></div>
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
                  { icon: '🌳', label: `${status.trees}/50` },
                  { icon: '⚡', label: `${status.energy}` },
                  { icon: '💰', label: `${status.credits}` },
                  { icon: '🚁', label: `${status.drones}` },
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
                  {objResults.map((obj, i) => (
                    <div key={i}>
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
                setLogs((prev) => [{
                  id: Date.now().toString(),
                  type: type === 'polluted' ? 'alert' : 'info',
                  message: msgs[type] ?? `Tile ${type}`,
                  timestamp: new Date(),
                }, ...prev.slice(0, 9)])
              }}
            />
          </div>

          {/* Right: action buttons (vertical) */}
          <div className="flex flex-col border-l overflow-y-auto flex-shrink-0" style={{ width: '72px', borderColor: '#1a3a2e', background: '#0d1f1a' }}>
            <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest text-center py-1.5 border-b flex-shrink-0" style={{ borderColor: '#1a3a2e' }}>Aksi</p>
            <div className="flex flex-col gap-1 p-1.5 flex-1">
              {ACTIONS.map(({ emoji, label, action, cost }) => (
                <button
                  key={action}
                  onClick={() => handleAction(action, label)}
                  className="flex flex-col items-center justify-center rounded-lg p-1.5 text-center transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e4a38', minHeight: '52px' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,222,128,0.08)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e4a38'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-lg leading-none mb-0.5">{emoji}</span>
                  <span className="text-[8px] text-white font-medium leading-tight">{label}</span>
                  <span className="text-[7px] text-[var(--text-muted)] mt-0.5">{cost}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
