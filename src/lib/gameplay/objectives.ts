import type { EnvironmentStatus, GameAction, MissionObjective, ObjectiveMetric } from '@/types'

const METRIC_LABELS: Record<ObjectiveMetric, string> = {
  pollution: 'Polusi',
  biodiversity: 'Biodiversitas',
  waterQuality: 'Kualitas air',
  fishPopulation: 'Ikan',
  trees: 'Pohon',
  drones: 'Drone',
}

const METRIC_UNITS: Record<ObjectiveMetric, string> = {
  pollution: '%',
  biodiversity: '%',
  waterQuality: '%',
  fishPopulation: '%',
  trees: '',
  drones: '',
}

const COMPARATOR_SYMBOLS = {
  lte: '≤',
  gte: '≥',
} as const

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function isObjectiveComplete(objective: MissionObjective, status: EnvironmentStatus): boolean {
  const value = status[objective.metric]
  return objective.comparator === 'lte'
    ? value <= objective.target
    : value >= objective.target
}

export function objectiveProgressPercent(objective: MissionObjective, status: EnvironmentStatus): number {
  const value = status[objective.metric]
  const { comparator, target } = objective

  if (comparator === 'gte') {
    if (target <= 0) return 100
    return clampPercent((value / target) * 100)
  }

  if (value <= target) return 100
  const span = Math.max(1, 100 - target)
  return clampPercent(((100 - value) / span) * 100)
}

export function missionProgressPercent(
  objectives: MissionObjective[],
  status: EnvironmentStatus
): number {
  if (objectives.length === 0) return 0

  const completed = objectives.every((objective) => isObjectiveComplete(objective, status))
  if (completed) return 100

  const total = objectives.reduce(
    (sum, objective) => sum + objectiveProgressPercent(objective, status),
    0
  )
  return Math.min(99, clampPercent(total / objectives.length))
}

export function formatObjectiveProgress(
  objective: MissionObjective,
  status: EnvironmentStatus
): string {
  const value = status[objective.metric]
  const unit = METRIC_UNITS[objective.metric]
  const label = METRIC_LABELS[objective.metric]
  const target = `${COMPARATOR_SYMBOLS[objective.comparator]}${objective.target}${unit}`

  if (unit === '') {
    return `${label}: ${value}/${objective.target}`
  }
  return `${label}: ${value}${unit} → target ${target}`
}

export function objectiveTarget(
  objectives: MissionObjective[],
  metric: ObjectiveMetric,
  fallback: number
): number {
  return objectives.find((objective) => objective.metric === metric)?.target ?? fallback
}

/**
 * Whether an action can still move an unmet objective forward.
 *
 * Utility actions (map, scan, analysis) intentionally return false here. This
 * is used to detect a mission that is out of resources and can no longer be
 * completed, rather than treating a free utility action as progress.
 */
export function canAdvanceObjective(
  action: GameAction,
  objectives: MissionObjective[],
  status: EnvironmentStatus
): boolean {
  const hasUnmet = (metric: ObjectiveMetric) => objectives.some(
    (objective) => objective.metric === metric && !isObjectiveComplete(objective, status)
  )

  switch (action) {
    case 'clean_waste':
      // Cleaning only adds fish when pollution actually decreases.
      return status.pollution > 0
        && (hasUnmet('pollution') || hasUnmet('fishPopulation'))
    case 'plant_tree':
      return hasUnmet('trees')
        || (hasUnmet('biodiversity') && status.biodiversity < 100)
    case 'build_filter':
      return hasUnmet('fishPopulation')
        || (hasUnmet('waterQuality') && status.waterQuality < 100)
    case 'deploy_drone':
      return hasUnmet('drones')
    default:
      return false
  }
}

/**
 * Credit/energy actions stay available while they can still move an objective.
 * Energy-only actions without an objective (e.g. drone survey on level 1) remain
 * usable; credit actions with no matching objective are disabled to protect the
 * mission budget from accidental overspending.
 */
export function isActionUseful(
  action: GameAction,
  objectives: MissionObjective[],
  status: EnvironmentStatus
): boolean {
  if (action === 'deploy_drone') {
    const hasDroneObjective = objectives.some((objective) => objective.metric === 'drones')
    return hasDroneObjective
      ? canAdvanceObjective(action, objectives, status)
      : true
  }

  if (
    action === 'clean_waste' ||
    action === 'plant_tree' ||
    action === 'build_filter'
  ) {
    return canAdvanceObjective(action, objectives, status)
  }

  // Map, scan, analysis, and base actions are utility actions.
  return true
}
