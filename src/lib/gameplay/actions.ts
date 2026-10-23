import type { EnvironmentStatus, EventLog, GameAction } from '@/types'

export type ActionCost = { credits?: number; energy?: number }

export const ACTION_COSTS: Record<GameAction, ActionCost> = {
  clean_waste: { credits: 50 },
  plant_tree: { credits: 30 },
  scan_water: { energy: 10 },
  deploy_drone: { energy: 30 },
  build_filter: { credits: 150 },
  open_map: {},
  analyze_area: {},
  return_base: {},
}

export function formatCost(cost: ActionCost): string {
  const parts: string[] = []
  if (cost.credits) parts.push(`-${cost.credits}💰`)
  if (cost.energy) parts.push(`-${cost.energy}⚡`)
  return parts.length > 0 ? parts.join(' ') : '—'
}

export function canAfford(cost: ActionCost, status: EnvironmentStatus): boolean {
  return (cost.credits ?? 0) <= status.credits
    && (cost.energy ?? 0) <= status.energy
}

export function applyAction(
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
