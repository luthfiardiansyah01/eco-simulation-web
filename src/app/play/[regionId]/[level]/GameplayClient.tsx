'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Mission, EnvironmentStatus, EventLog, GameAction, Achievement } from '@/types'
import { saveProgress, saveMissionResult } from '@/lib/supabase/progress'
import { checkAndUnlockAchievements } from '@/lib/supabase/achievements'
import AchievementToast from '@/components/game/AchievementToast'
import IsometricMap from '@/components/game/IsometricMap'

const ACTIONS: { emoji: string; label: string; desc: string; action: GameAction; cost: string }[] = [
  { emoji: '🗑️', label: 'Bersihkan Sampah', desc: '-50 💰 | -5% polusi', action: 'clean_waste', cost: '50' },
  { emoji: '🌱', label: 'Tanam Pohon',       desc: '-30 💰 | +2% biodiv', action: 'plant_tree',  cost: '30' },
  { emoji: '🔬', label: 'Scan Air',          desc: '-10 ⚡ | analisis', action: 'scan_water',  cost: '10⚡' },
  { emoji: '🚁', label: 'Deploy Drone',      desc: '-30 ⚡ | +1 drone',  action: 'deploy_drone', cost: '30⚡' },
  { emoji: '💧', label: 'Pasang Filter',     desc: '-150 💰 | +8% air',  action: 'build_filter', cost: '150' },
  { emoji: '🗺️', label: 'Buka Peta',        desc: 'lihat wilayah',      action: 'open_map',    cost: '-' },
  { emoji: '📊', label: 'Analisis Area',     desc: 'data ekosistem',     action: 'analyze_area', cost: '-' },
  { emoji: '🏕️', label: 'Kembali ke Base',  desc: 'simpan progress',    action: 'return_base', cost: '-' },
]

const initialStatus: EnvironmentStatus = {
  pollution: 78,
  biodiversity: 22,
  waterQuality: 31,
  fishPopulation: 18,
  trees: 23,
  energy: 270,
  credits: 1200,
  drones: 3,
}

const initialLogs: EventLog[] = [
  { id: '1', type: 'alert',   message: 'Baterai drone hampir habis', timestamp: new Date() },
  { id: '2', type: 'info',    message: 'Ekosistem mulai stabil', timestamp: new Date() },
  { id: '3', type: 'alert',   message: 'Lonjakan polusi terdeteksi', timestamp: new Date() },
  { id: '4', type: 'success', message: 'Data riset berhasil dikumpulkan', timestamp: new Date() },
]

export default function GameplayClient({
  mission,
  regionId,
  level,
}: {
  mission: Mission
  regionId: string
  level: number
}) {
  const [status, setStatus] = useState<EnvironmentStatus>(initialStatus)
  const [logs, setLogs] = useState<EventLog[]>(initialLogs)
  const [progress, setProgress] = useState(12)
  const [missionComplete, setMissionComplete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [totalMissionsCompleted, setTotalMissionsCompleted] = useState(0)
  const [lastAction, setLastAction] = useState<string | null>(null)

  useEffect(() => {
    if (newAchievements.length === 0) return
    const t = setTimeout(() => setNewAchievements([]), 4000)
    return () => clearTimeout(t)
  }, [newAchievements])

  const checkMissionComplete = useCallback(async (s: EnvironmentStatus, prog: number) => {
    if (prog >= 100 && !missionComplete) {
      setMissionComplete(true)
      setSaving(true)
      const newTotal = totalMissionsCompleted + 1
      setTotalMissionsCompleted(newTotal)
      await saveMissionResult(regionId, level, {
        pollutionFinal: s.pollution,
        biodiversityFinal: s.biodiversity,
        treesPlanted: s.trees,
        researchPointsEarned: 250,
      })
      await saveProgress(regionId, {
        currentLevel: level + 1,
        completedLevels: [level],
        researchPoints: 250,
      })
      const unlocked = await checkAndUnlockAchievements({
        treesPlanted: s.trees,
        pollutionLevel: s.pollution,
        missionsCompleted: newTotal,
        researchPoints: 250,
      })
      if (unlocked.length > 0) setNewAchievements(unlocked)
      setSaving(false)
    }
  }, [missionComplete, regionId, level, totalMissionsCompleted])

  function handleAction(action: GameAction, label: string) {
    const newLog: EventLog = { id: Date.now().toString(), type: 'info', message: '', timestamp: new Date() }
    setLastAction(label)
    setStatus((prev) => {
      const next = { ...prev }
      if (action === 'clean_waste') {
        next.pollution = Math.max(0, prev.pollution - 5)
        next.credits = prev.credits - 50
        newLog.message = 'Sampah dibersihkan — polusi berkurang'
        newLog.type = 'success'
      } else if (action === 'plant_tree') {
        next.trees = prev.trees + 1
        next.biodiversity = Math.min(100, prev.biodiversity + 2)
        next.credits = prev.credits - 30
        newLog.message = `Pohon ditanam (${next.trees}/50)`
        newLog.type = 'success'
      } else if (action === 'scan_water') {
        next.energy = prev.energy - 10
        newLog.message = `Kualitas air: ${prev.waterQuality}%`
        newLog.type = 'info'
      } else if (action === 'deploy_drone') {
        next.drones = prev.drones + 1
        next.energy = prev.energy - 30
        newLog.message = 'Drone diterbangkan untuk survei'
        newLog.type = 'info'
      } else if (action === 'build_filter') {
        next.waterQuality = Math.min(100, prev.waterQuality + 8)
        next.credits = prev.credits - 150
        newLog.message = 'Filter air terpasang'
        newLog.type = 'success'
      } else {
        newLog.message = `Aksi: ${label}`
        newLog.type = 'info'
      }
      return next
    })
    setLogs((prev) => [newLog, ...prev.slice(0, 9)])
    setProgress((prev) => {
      const next = Math.min(100, prev + 3)
      checkMissionComplete(status, next)
      return next
    })
  }

  const barColor = (val: number, inverted = false) => {
    const v = inverted ? 100 - val : val
    if (v > 60) return 'bg-green-500'
    if (v > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const progressColor = progress >= 75 ? 'bg-green-500' : progress >= 40 ? 'bg-yellow-500' : 'bg-teal-500'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1a14', color: '#e8f5e9' }}>
      <AchievementToast achievements={newAchievements} />

      {/* Mission Complete Overlay */}
      {missionComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="eco-card p-8 text-center max-w-sm w-full" style={{ borderColor: '#22c55e', boxShadow: '0 0 40px rgba(74,222,128,0.3)' }}>
            <div className="text-5xl mb-4 float">🎉</div>
            <h2 className="text-2xl font-bold text-[var(--accent-green)] mb-2">Misi Selesai!</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">
              {saving ? '⏳ Menyimpan progress...' : '✓ Progress tersimpan!'}
            </p>
            <div className="space-y-2 text-sm mb-6 eco-card p-3">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Research Points</span>
                <span className="text-[var(--accent-amber)] font-bold">+250 ⭐</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Level berikutnya</span>
                <span className="text-[var(--accent-teal)]">Level {level + 1} 🔓</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href={`/mission/${regionId}`} className="flex-1">
                <button className="eco-btn-primary w-full py-2.5 text-sm">Level Berikutnya →</button>
              </Link>
              <Link href="/" className="flex-1">
                <button className="eco-btn-secondary w-full py-2.5 text-sm">Menu Utama</button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#1a3a2e', background: '#0d1f1a' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <div>
            <p className="text-xs font-semibold text-white">{mission.title}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{mission.location} · Level {level}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="badge badge-green">● LIVE</span>
          <Link href={`/briefing/${regionId}/${level}`} className="badge badge-gray hover:opacity-80">⏸ Pause</Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — status */}
        <div className="w-52 flex flex-col border-r overflow-y-auto" style={{ borderColor: '#1a3a2e', background: '#0d1f1a' }}>
          <div className="p-3 space-y-4">

            {/* Environment bars */}
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2">Status Lingkungan</p>
              {[
                { label: 'Polusi',       val: status.pollution,    inverted: true, emoji: '☁️' },
                { label: 'Biodiversitas',val: status.biodiversity, inverted: false, emoji: '🦋' },
                { label: 'Kualitas Air', val: status.waterQuality, inverted: false, emoji: '💧' },
                { label: 'Populasi Ikan',val: status.fishPopulation,inverted: false, emoji: '🐟' },
              ].map(({ label, val, inverted, emoji }) => (
                <div key={label} className="mb-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                      <span>{emoji}</span>{label}
                    </span>
                    <span className="text-[11px] font-medium text-white">{val}%</span>
                  </div>
                  <div className="progress-bar-bg h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${barColor(val, inverted)}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Resources */}
            <div className="eco-card p-2.5 space-y-1.5">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Sumber Daya</p>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">🌳 Pohon</span>
                <span className="text-[var(--accent-green)] font-medium">{status.trees}/50</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">⚡ Energi</span>
                <span className="text-[var(--accent-teal)] font-medium">{status.energy}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">💰 Kredit</span>
                <span className="text-[var(--accent-amber)] font-medium">{status.credits}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">🚁 Drone</span>
                <span className="text-white font-medium">{status.drones} aktif</span>
              </div>
            </div>

            {/* Objectives */}
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2">Objektif</p>
              {mission.objectives.map((obj) => (
                <div key={obj} className="flex items-start gap-1.5 mb-1.5">
                  <span className="mt-0.5 w-3 h-3 rounded-sm border border-[var(--border-card)] flex-shrink-0" />
                  <span className="text-[11px] text-[var(--text-muted)] leading-tight">{obj}</span>
                </div>
              ))}
            </div>

            {/* Mission progress */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-muted)]">Progres Misi</span>
                <span className="text-[var(--accent-amber)] font-bold">{progress}%</span>
              </div>
              <div className="progress-bar-bg h-2">
                <div className={`h-2 rounded-full transition-all ${progressColor}`} style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">⭐ Hadiah: +250 pts</p>
            </div>
          </div>
        </div>

        {/* Center — event log */}
        <div className="flex-1 flex flex-col border-r" style={{ borderColor: '#1a3a2e', background: '#0a1a14' }}>

          {/* Isometric Map */}
          <div className="flex-1 relative overflow-hidden">
            <IsometricMap
              pollution={status.pollution}
              biodiversity={status.biodiversity}
              waterQuality={status.waterQuality}
              trees={status.trees}
              onTileClick={(type) => {
                const msgs: Record<string, string> = {
                  water: 'Sungai terdeteksi — scan kualitas air',
                  grass: 'Area hijau — cocok untuk tanam pohon',
                  tree: 'Pohon teridentifikasi — biodiversitas meningkat',
                  polluted: 'Area tercemar — perlu dibersihkan segera!',
                  dirt: 'Tanah kosong — bisa dimanfaatkan',
                }
                const newLog: EventLog = {
                  id: Date.now().toString(),
                  type: type === 'polluted' ? 'alert' : 'info',
                  message: msgs[type] ?? `Tile ${type} dipilih`,
                  timestamp: new Date(),
                }
                setLogs((prev) => [newLog, ...prev.slice(0, 9)])
              }}
            />
            {lastAction && (
              <div className="absolute top-2 right-2">
                <span className="badge badge-green text-[10px]">▶ {lastAction}</span>
              </div>
            )}
          </div>

          {/* Event log */}
          <div className="border-t p-3" style={{ borderColor: '#1a3a2e', maxHeight: '180px', overflowY: 'auto' }}>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2">Log Kejadian</p>
            <div className="space-y-1.5">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">
                    {log.type === 'alert' ? '⚠️' : log.type === 'success' ? '✅' : 'ℹ️'}
                  </span>
                  <p className={`text-[11px] leading-tight ${
                    log.type === 'alert' ? 'text-red-400' :
                    log.type === 'success' ? 'text-[var(--accent-green)]' :
                    'text-[var(--text-muted)]'
                  }`}>
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action toolbar */}
      <div className="border-t p-3" style={{ borderColor: '#1a3a2e', background: '#0d1f1a' }}>
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2 text-center">Pilih Aksi</p>
        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.map(({ emoji, label, desc, action }) => (
            <button
              key={action}
              onClick={() => handleAction(action, label)}
              className="eco-card p-2 text-center hover:border-[var(--border-glow)] active:scale-95 transition-all cursor-pointer"
            >
              <div className="text-xl mb-1">{emoji}</div>
              <p className="text-[10px] text-white font-medium leading-tight">{label}</p>
              <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
