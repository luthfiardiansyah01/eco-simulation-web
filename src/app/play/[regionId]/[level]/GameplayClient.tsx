'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Mission, EnvironmentStatus, EventLog, GameAction, Achievement } from '@/types'
import { saveProgress, saveMissionResult } from '@/lib/supabase/progress'
import { checkAndUnlockAchievements } from '@/lib/supabase/achievements'
import AchievementToast from '@/components/game/AchievementToast'

const ACTIONS: { key: string; label: string; action: GameAction }[] = [
  { key: '1', label: 'CLEAN WASTE', action: 'clean_waste' },
  { key: '2', label: 'PLANT TREE', action: 'plant_tree' },
  { key: '3', label: 'SCAN WATER', action: 'scan_water' },
  { key: '4', label: 'DEPLOY DRONE', action: 'deploy_drone' },
  { key: '5', label: 'BUILD FILTER', action: 'build_filter' },
  { key: '6', label: 'OPEN MAP', action: 'open_map' },
  { key: '7', label: 'ANALYZE AREA', action: 'analyze_area' },
  { key: '8', label: 'RETURN TO BASE', action: 'return_base' },
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
  { id: '1', type: 'alert', message: 'Drone battery low', timestamp: new Date() },
  { id: '2', type: 'info', message: 'Ecosystem stabilizing', timestamp: new Date() },
  { id: '3', type: 'alert', message: 'Pollution spike detected', timestamp: new Date() },
  { id: '4', type: 'alert', message: 'Pollution spike detected', timestamp: new Date() },
  { id: '5', type: 'success', message: 'Research data collected', timestamp: new Date() },
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

  function handleAction(action: GameAction) {
    const newLog: EventLog = { id: Date.now().toString(), type: 'info', message: '', timestamp: new Date() }

    setStatus((prev) => {
      const next = { ...prev }
      if (action === 'clean_waste') {
        next.pollution = Math.max(0, prev.pollution - 5)
        next.credits = prev.credits - 50
        newLog.message = 'Waste cleaned — pollution reduced'
        newLog.type = 'success'
      } else if (action === 'plant_tree') {
        next.trees = prev.trees + 1
        next.biodiversity = Math.min(100, prev.biodiversity + 2)
        next.credits = prev.credits - 30
        newLog.message = `Tree planted (${next.trees}/50)`
        newLog.type = 'success'
      } else if (action === 'scan_water') {
        next.energy = prev.energy - 10
        newLog.message = `Water quality scan: ${prev.waterQuality}%`
        newLog.type = 'info'
      } else if (action === 'deploy_drone') {
        next.drones = prev.drones + 1
        next.energy = prev.energy - 30
        newLog.message = 'Drone deployed for surveillance'
        newLog.type = 'info'
      } else if (action === 'build_filter') {
        next.waterQuality = Math.min(100, prev.waterQuality + 8)
        next.credits = prev.credits - 150
        newLog.message = 'Water filter installed'
        newLog.type = 'success'
      } else {
        newLog.message = `Action: ${action.replace('_', ' ')}`
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

  return (
    <div className="min-h-screen flex flex-col bg-black text-green-400 font-mono text-xs relative">
      <AchievementToast achievements={newAchievements} />
      {missionComplete && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="border border-green-500 bg-black p-8 text-center max-w-sm">
            <h2 className="text-2xl font-bold tracking-widest mb-2 text-green-400">MISSION COMPLETE</h2>
            <p className="text-gray-400 text-sm mb-4">
              {saving ? 'Saving progress...' : 'Progress saved to your account!'}
            </p>
            <div className="space-y-1 text-sm mb-6">
              <p>Research Points: <span className="text-green-400">+250</span></p>
              <p>Level {level + 1} unlocked</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link href={`/mission/${regionId}`} className="border border-green-500 px-4 py-2 hover:bg-green-500 hover:text-black transition-colors text-xs tracking-widest">
                NEXT LEVEL
              </Link>
              <Link href="/" className="border border-gray-500 px-4 py-2 hover:bg-gray-500 hover:text-black transition-colors text-xs tracking-widest">
                MAIN MENU
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* Top bar */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-green-900 text-[11px]">
        <span>ECO-SIMULATION : ADVANCED MODE</span>
        <div className="flex gap-6 text-gray-400">
          <span>USER : <span className="text-green-400">RESEARCHER_01</span></span>
          <span>REGION : <span className="text-green-400">{regionId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</span></span>
          <span>LEVEL : <span className="text-green-400">{level}</span></span>
          <span>STATUS : <span className="text-green-400">LIVE SIMULATION</span></span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-56 border-r border-green-900 p-3 space-y-4 overflow-y-auto">
          <div>
            <p className="text-gray-500 mb-2 tracking-widest">ENVIRONMENT STATUS</p>
            {[
              { label: 'Pollution', val: status.pollution, inverted: true },
              { label: 'Biodiversity', val: status.biodiversity },
              { label: 'Water Quality', val: status.waterQuality },
              { label: 'Fish Pop.', val: status.fishPopulation },
            ].map(({ label, val, inverted }) => (
              <div key={label} className="mb-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-gray-400">{label}</span>
                  <span>{val}%</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded">
                  <div className={`h-1.5 rounded ${barColor(val, inverted)}`} style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] space-y-1 text-gray-400">
            <p>🌳 Trees <span className="text-green-400">{status.trees}/50</span> &nbsp; ⚡ Energy <span className="text-green-400">{status.energy}</span></p>
            <p>💰 Credits <span className="text-green-400">{status.credits}</span> · Drones <span className="text-green-400">{status.drones}</span> Active</p>
          </div>

          <div>
            <p className="text-gray-500 mb-2 tracking-widest">ACTIVE OBJECTIVES</p>
            {mission.objectives.map((obj) => (
              <div key={obj} className="flex items-start gap-2 mb-1 text-gray-400">
                <span className="mt-0.5 w-3 h-3 border border-gray-600 flex-shrink-0" />
                <span>{obj}</span>
              </div>
            ))}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-yellow-400">
                <span>Mission Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded">
                <div className="h-1.5 rounded bg-yellow-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-yellow-300 mt-1">
                <span>⭐ Research Points</span>
                <span>250</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center — map placeholder */}
        <div className="flex-1 flex flex-col items-center justify-center border-r border-green-900 relative bg-gray-950">
          <div className="text-center">
            <p className="text-gray-500 mb-2 tracking-widest">LIVE EVENT LOG</p>
            <div className="text-left space-y-1 max-w-xs">
              {logs.slice(0, 5).map((log) => (
                <p key={log.id} className={log.type === 'alert' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-400'}>
                  {log.type === 'alert' ? '⚠ ALERT: ' : '○ '}{log.message}
                </p>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 text-gray-700 text-[10px]">
            [Isometric map — Phase 3]
          </div>
        </div>
      </div>

      {/* Action toolbar */}
      <div className="border-t border-green-900 p-3">
        <div className="flex gap-2 flex-wrap justify-center mb-2">
          {ACTIONS.map(({ key, label, action }) => (
            <button
              key={key}
              onClick={() => handleAction(action)}
              className="border border-green-800 px-3 py-1 hover:bg-green-900/40 transition-colors text-[11px] tracking-widest"
            >
              [{key}] {label}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-8 text-[10px] text-gray-500">
          <span>CONTROLS : WASD MOVE</span>
          <span>E INTERACT</span>
          <span>Q QUICK SCAN</span>
          <span>SPACE BOOST</span>
          <span>TAB OBJECTIVES</span>
          <Link href={`/briefing/${regionId}/${level}`} className="text-red-400 hover:text-red-300">ESC PAUSE</Link>
        </div>
      </div>
    </div>
  )
}
