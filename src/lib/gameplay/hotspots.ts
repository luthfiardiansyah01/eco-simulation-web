import type { EnvironmentStatus, GameAction, ObjectiveMetric } from '@/types'

/**
 * A problem area on the isometric map. Positions are tile coordinates so the
 * canvas can place a marker, while the copy stays translatable at render time.
 */
export type HotspotDefinition = {
  id: string
  kind: 'waste' | 'water' | 'erosion' | 'logging' | 'flood' | 'fire'
  icon: string
  row: number
  col: number
  label: string
  description: string
  /** The environment metric this hotspot affects, or null for disaster risk. */
  metric: ObjectiveMetric | null
  recommendedAction: GameAction
  disaster?: boolean
}

export type HotspotSeverity = 'critical' | 'warning' | 'watch'

export type MapHotspot = HotspotDefinition & {
  /** 0–100. Higher means the problem is more urgent. */
  severity: number
  level: HotspotSeverity
  /** Current value of the affected metric, or the risk score for disasters. */
  metricValue: number
}

export const MAP_HOTSPOTS: HotspotDefinition[] = [
  {
    id: 'waste-dump',
    kind: 'waste',
    icon: '🗑️',
    row: 6,
    col: 5,
    label: 'Tumpukan sampah liar',
    description:
      'Sampah menumpuk di bantaran sungai, menaikkan polusi, dan mencemari air di sekitarnya.',
    metric: 'pollution',
    recommendedAction: 'clean_waste',
  },
  {
    id: 'river-waste',
    kind: 'water',
    icon: '💧',
    row: 4,
    col: 7,
    label: 'Limbah di aliran sungai',
    description:
      'Air sungai keruh dan tercemar. Kualitas air serta populasi ikan menurun drastis.',
    metric: 'waterQuality',
    recommendedAction: 'build_filter',
  },
  {
    id: 'riverbank-erosion',
    kind: 'erosion',
    icon: '🌱',
    row: 5,
    col: 4,
    label: 'Erosi tepi sungai',
    description:
      'Tanah terbuka di tikungan sungai mudah terkikis dan longsor saat hujan deras.',
    metric: 'biodiversity',
    recommendedAction: 'plant_tree',
  },
  {
    id: 'illegal-logging',
    kind: 'logging',
    icon: '🪓',
    row: 2,
    col: 2,
    label: 'Pembalakan liar',
    description:
      'Pohon hilang mengurangi habitat satwa dan membuat lereng lebih rawan longsor.',
    metric: 'biodiversity',
    recommendedAction: 'deploy_drone',
  },
  {
    id: 'flood-risk',
    kind: 'flood',
    icon: '🌊',
    row: 7,
    col: 8,
    label: 'Titik rawan banjir',
    description:
      'Aliran sungai menyempit karena sampah. Saat curah hujan tinggi, air bisa meluap ke permukiman.',
    metric: null,
    recommendedAction: 'clean_waste',
    disaster: true,
  },
  {
    id: 'fire-risk',
    kind: 'fire',
    icon: '🔥',
    row: 8,
    col: 1,
    label: 'Titik rawan kebakaran',
    description:
      'Lahan kering dengan tutupan pohon rendah mudah terbakar pada musim kemarau.',
    metric: null,
    recommendedAction: 'plant_tree',
    disaster: true,
  },
]

const HOTSPOT_LEVEL_COLORS: Record<HotspotSeverity, string> = {
  critical: '#f87171',
  warning: '#fbbf24',
  watch: '#2dd4bf',
}

export function hotspotLevelColor(level: HotspotSeverity): string {
  return HOTSPOT_LEVEL_COLORS[level]
}

export function hotspotLevelLabel(level: HotspotSeverity): string {
  switch (level) {
    case 'critical':
      return 'Kritis'
    case 'warning':
      return 'Waspada'
    default:
      return 'Pantau'
  }
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function getRisk(id: string, status: EnvironmentStatus): {
  metricValue: number
  severity: number
} {
  switch (id) {
    case 'waste-dump':
      return { metricValue: status.pollution, severity: status.pollution }
    case 'river-waste': {
      const risk = 100 - status.waterQuality
      return { metricValue: status.waterQuality, severity: risk }
    }
    case 'riverbank-erosion': {
      const risk = 30 + (100 - status.biodiversity) * 0.5
      return { metricValue: status.biodiversity, severity: clamp(risk) }
    }
    case 'illegal-logging': {
      const risk = 20 + (100 - status.biodiversity) * 0.6
      return { metricValue: status.biodiversity, severity: clamp(risk) }
    }
    case 'flood-risk': {
      const treeBuffer = Math.max(0, 50 - status.trees) * 0.6
      const risk = 15 + status.pollution * 0.45 + treeBuffer
      return { metricValue: status.pollution, severity: clamp(risk) }
    }
    case 'fire-risk': {
      const risk =
        10 + (100 - status.biodiversity) * 0.4 + (100 - status.waterQuality) * 0.25
      return { metricValue: status.biodiversity, severity: clamp(risk) }
    }
    default:
      return { metricValue: 0, severity: 0 }
  }
}

export function getHotspotLevel(severity: number): HotspotSeverity {
  if (severity >= 70) return 'critical'
  if (severity >= 40) return 'warning'
  return 'watch'
}

export function buildHotspots(status: EnvironmentStatus): MapHotspot[] {
  return MAP_HOTSPOTS.map((definition) => {
    const { metricValue, severity } = getRisk(definition.id, status)
    return {
      ...definition,
      metricValue,
      severity: Math.round(severity),
      level: getHotspotLevel(severity),
    }
  }).sort((a, b) => b.severity - a.severity)
}

export function countByLevel(
  hotspots: MapHotspot[],
  level: HotspotSeverity
): number {
  return hotspots.filter((hotspot) => hotspot.level === level).length
}
