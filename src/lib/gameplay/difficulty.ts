import type { EnvironmentStatus, Mission } from '@/types'

export type Difficulty = 'easy' | 'normal' | 'hard'

export type DifficultyAdjustments = {
  pollution: number
  biodiversity: number
  waterQuality: number
  fishPopulation: number
  trees: number
  drones: number
  credits: number
  energy: number
}

export type DifficultyOption = {
  id: Difficulty
  label: string
  emoji: string
  tagline: string
  description: string
  accent: string
  adjustments: DifficultyAdjustments
}

export const DEFAULT_DIFFICULTY: Difficulty = 'normal'

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard']

export const DIFFICULTIES: Record<Difficulty, DifficultyOption> = {
  easy: {
    id: 'easy',
    label: 'Mudah',
    emoji: '🌿',
    tagline: 'Ekosistem lebih sehat',
    description:
      'Mulai dengan air dan udara yang lebih bersih, populasi ikan lebih tinggi, serta kredit dan energi tambahan.',
    accent: '#22c55e',
    adjustments: {
      pollution: -20,
      biodiversity: 12,
      waterQuality: 15,
      fishPopulation: 14,
      trees: 8,
      drones: 1,
      credits: 600,
      energy: 60,
    },
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    emoji: '⚖️',
    tagline: 'Tantangan seimbang',
    description:
      'Kondisi awal standar. Sumber daya cukup untuk menyelesaikan misi dengan perencanaan yang baik.',
    accent: '#2dd4bf',
    adjustments: {
      pollution: 0,
      biodiversity: 0,
      waterQuality: 0,
      fishPopulation: 0,
      trees: 0,
      drones: 0,
      credits: 0,
      energy: 0,
    },
  },
  hard: {
    id: 'hard',
    label: 'Sulit',
    emoji: '🔥',
    tagline: 'Ekosistem kritis',
    description:
      'Polusi lebih tinggi, ekosistem lebih rapuh, dan sumber daya lebih ketat. Setiap aksi harus direncanakan.',
    accent: '#f59e0b',
    adjustments: {
      pollution: 4,
      biodiversity: -6,
      waterQuality: -7,
      fishPopulation: -5,
      trees: -3,
      drones: -1,
      credits: -50,
      energy: -40,
    },
  },
}

const BASE_STARTING_ENVIRONMENT: Pick<
  EnvironmentStatus,
  'pollution' | 'biodiversity' | 'waterQuality' | 'fishPopulation' | 'trees' | 'drones'
> = {
  pollution: 78,
  biodiversity: 22,
  waterQuality: 31,
  fishPopulation: 18,
  trees: 23,
  drones: 3,
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampCount(value: number): number {
  return Math.max(0, Math.round(value))
}

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard'
}

export function parseDifficulty(
  value: string | string[] | undefined | null
): Difficulty {
  const candidate = Array.isArray(value) ? value[0] : value
  return isDifficulty(candidate) ? candidate : DEFAULT_DIFFICULTY
}

export function getStartingStatus(
  mission: Mission,
  difficulty: Difficulty = DEFAULT_DIFFICULTY
): EnvironmentStatus {
  const adjustment = DIFFICULTIES[difficulty].adjustments

  return {
    pollution: clampPercent(BASE_STARTING_ENVIRONMENT.pollution + adjustment.pollution),
    biodiversity: clampPercent(
      BASE_STARTING_ENVIRONMENT.biodiversity + adjustment.biodiversity
    ),
    waterQuality: clampPercent(
      BASE_STARTING_ENVIRONMENT.waterQuality + adjustment.waterQuality
    ),
    fishPopulation: clampPercent(
      BASE_STARTING_ENVIRONMENT.fishPopulation + adjustment.fishPopulation
    ),
    trees: clampCount(BASE_STARTING_ENVIRONMENT.trees + adjustment.trees),
    drones: clampCount(BASE_STARTING_ENVIRONMENT.drones + adjustment.drones),
    credits: clampCount(mission.startingCredits + adjustment.credits),
    energy: clampCount(mission.startingEnergy + adjustment.energy),
  }
}
