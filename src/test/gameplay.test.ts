import { describe, expect, it } from 'vitest'
import type {
  EnvironmentStatus,
  Mission,
  MissionObjective,
  ObjectiveMetric,
} from '@/types'
import {
  canAdvanceObjective,
  clampPercent,
  formatObjectiveProgress,
  isActionUseful,
  isObjectiveComplete,
  missionProgressPercent,
  objectiveProgressPercent,
  objectiveTarget,
} from '@/lib/gameplay/objectives'
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getStartingStatus,
  isDifficulty,
  parseDifficulty,
} from '@/lib/gameplay/difficulty'
import {
  ACTION_COSTS,
  applyAction,
  canAfford,
  formatCost,
} from '@/lib/gameplay/actions'
import {
  MISSION_LEVELS,
  MISSIONS,
  REGIONS,
} from '@/data/regions'

function status(overrides: Partial<EnvironmentStatus> = {}): EnvironmentStatus {
  return {
    pollution: 78,
    biodiversity: 22,
    waterQuality: 31,
    fishPopulation: 18,
    trees: 23,
    drones: 3,
    credits: 2000,
    energy: 270,
    ...overrides,
  }
}

function objective(
  metric: ObjectiveMetric,
  comparator: 'lte' | 'gte',
  target: number
): MissionObjective {
  return { label: `${metric} ${comparator} ${target}`, metric, comparator, target }
}

const LEVEL_ONE_OBJECTIVES = MISSIONS[0].objectives

describe('percentage helpers', () => {
  it('clamps, rounds, and rejects non-finite input', () => {
    expect(clampPercent(42.6)).toBe(43)
    expect(clampPercent(-1)).toBe(0)
    expect(clampPercent(101)).toBe(100)
    expect(clampPercent(Number.NaN)).toBe(0)
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('evaluates both comparators at the boundary', () => {
    expect(isObjectiveComplete(objective('pollution', 'lte', 20), status({ pollution: 20 }))).toBe(true)
    expect(isObjectiveComplete(objective('pollution', 'lte', 20), status({ pollution: 21 }))).toBe(false)
    expect(isObjectiveComplete(objective('fishPopulation', 'gte', 60), status({ fishPopulation: 60 }))).toBe(true)
    expect(isObjectiveComplete(objective('fishPopulation', 'gte', 60), status({ fishPopulation: 59 }))).toBe(false)
  })

  it('calculates gte/lte objective progress', () => {
    expect(objectiveProgressPercent(objective('fishPopulation', 'gte', 60), status({ fishPopulation: 30 }))).toBe(50)
    expect(objectiveProgressPercent(objective('fishPopulation', 'gte', 0), status({ fishPopulation: 0 }))).toBe(100)
    expect(objectiveProgressPercent(objective('fishPopulation', 'gte', 60), status({ fishPopulation: 90 }))).toBe(100)
    expect(objectiveProgressPercent(objective('pollution', 'lte', 20), status({ pollution: 78 }))).toBe(28)
    expect(objectiveProgressPercent(objective('pollution', 'lte', 20), status({ pollution: 20 }))).toBe(100)
    expect(objectiveProgressPercent(objective('pollution', 'lte', 100), status({ pollution: 50 }))).toBe(100)
  })

  it('averages mission progress and caps incomplete missions at 99%', () => {
    expect(missionProgressPercent([], status())).toBe(0)
    expect(missionProgressPercent(LEVEL_ONE_OBJECTIVES, status())).toBe(35)
    expect(
      missionProgressPercent(
        LEVEL_ONE_OBJECTIVES,
        status({ pollution: 20, fishPopulation: 60, trees: 50 })
      )
    ).toBe(100)
    expect(
      missionProgressPercent(
        [objective('fishPopulation', 'gte', 100)],
        status({ fishPopulation: 99 })
      )
    ).toBe(99)
  })

  it('formats percent and count objectives', () => {
    expect(
      formatObjectiveProgress(
        objective('pollution', 'lte', 20),
        status({ pollution: 78 })
      )
    ).toBe('Polusi: 78% → target ≤20%')
    expect(
      formatObjectiveProgress(
        objective('trees', 'gte', 50),
        status({ trees: 23 })
      )
    ).toBe('Pohon: 23/50')
  })

  it('finds objective targets and falls back when absent', () => {
    expect(objectiveTarget(LEVEL_ONE_OBJECTIVES, 'trees', 0)).toBe(50)
    expect(objectiveTarget(LEVEL_ONE_OBJECTIVES, 'drones', 5)).toBe(5)
  })
})

describe('action usefulness and mission reachability', () => {
  it('knows when each resource action can still move an objective', () => {
    expect(canAdvanceObjective('clean_waste', LEVEL_ONE_OBJECTIVES, status())).toBe(true)
    expect(
      canAdvanceObjective('clean_waste', LEVEL_ONE_OBJECTIVES, status({ pollution: 0 }))
    ).toBe(false)
    expect(canAdvanceObjective('plant_tree', LEVEL_ONE_OBJECTIVES, status())).toBe(true)
    expect(
      canAdvanceObjective(
        'plant_tree',
        [objective('biodiversity', 'gte', 60)],
        status({ biodiversity: 100 })
      )
    ).toBe(false)
    expect(canAdvanceObjective('build_filter', LEVEL_ONE_OBJECTIVES, status())).toBe(true)
    expect(
      canAdvanceObjective(
        'build_filter',
        [objective('waterQuality', 'gte', 80)],
        status({ waterQuality: 100 })
      )
    ).toBe(false)
    expect(
      canAdvanceObjective('deploy_drone', [objective('drones', 'gte', 5)], status())
    ).toBe(true)
    expect(
      canAdvanceObjective(
        'deploy_drone',
        [objective('drones', 'gte', 5)],
        status({ drones: 5 })
      )
    ).toBe(false)
    expect(canAdvanceObjective('open_map', LEVEL_ONE_OBJECTIVES, status())).toBe(false)
  })

  it('keeps utility actions and objective-free drones usable', () => {
    for (const action of ['open_map', 'analyze_area', 'return_base'] as const) {
      expect(isActionUseful(action, LEVEL_ONE_OBJECTIVES, status())).toBe(true)
    }
    expect(isActionUseful('deploy_drone', LEVEL_ONE_OBJECTIVES, status())).toBe(true)
    expect(isActionUseful('clean_waste', LEVEL_ONE_OBJECTIVES, status())).toBe(true)
    expect(
      isActionUseful(
        'clean_waste',
        [objective('trees', 'gte', 50)],
        status()
      )
    ).toBe(false)
    expect(
      isActionUseful(
        'plant_tree',
        [objective('fishPopulation', 'gte', 60)],
        status()
      )
    ).toBe(false)
    expect(
      isActionUseful(
        'build_filter',
        [objective('trees', 'gte', 50)],
        status()
      )
    ).toBe(false)
  })
})

describe('difficulty', () => {
  it('parses valid values and falls back to normal', () => {
    expect(DEFAULT_DIFFICULTY).toBe('normal')
    expect(DIFFICULTY_ORDER).toEqual(['easy', 'normal', 'hard'])
    expect(isDifficulty('easy')).toBe(true)
    expect(isDifficulty('normal')).toBe(true)
    expect(isDifficulty('hard')).toBe(true)
    expect(isDifficulty('impossible')).toBe(false)
    expect(isDifficulty(null)).toBe(false)
    expect(parseDifficulty('easy')).toBe('easy')
    expect(parseDifficulty(['hard', 'easy'])).toBe('hard')
    expect(parseDifficulty(undefined)).toBe('normal')
    expect(parseDifficulty('unknown')).toBe('normal')
  })

  it('creates starting statuses for every difficulty', () => {
    expect(getStartingStatus(MISSIONS[0], 'normal')).toEqual(status())
    expect(getStartingStatus(MISSIONS[0], 'easy')).toEqual(
      status({
        pollution: 58,
        biodiversity: 34,
        waterQuality: 46,
        fishPopulation: 32,
        trees: 31,
        drones: 4,
        credits: 2600,
        energy: 330,
      })
    )
    expect(getStartingStatus(MISSIONS[0], 'hard')).toEqual(
      status({
        pollution: 82,
        biodiversity: 16,
        waterQuality: 24,
        fishPopulation: 13,
        trees: 20,
        drones: 2,
        credits: 1950,
        energy: 230,
      })
    )
  })

  it('clamps resources and counts at zero', () => {
    const toughMission: Mission = {
      ...MISSIONS[0],
      startingCredits: 10,
      startingEnergy: 5,
    }
    expect(getStartingStatus(toughMission, 'hard')).toMatchObject({
      credits: 0,
      energy: 0,
      trees: 20,
      drones: 2,
    })
    expect(DIFFICULTIES.easy.adjustments.credits).toBe(600)
  })
})

describe('gameplay actions', () => {
  it('defines costs for every action and formats them', () => {
    expect(ACTION_COSTS.clean_waste).toEqual({ credits: 50 })
    expect(ACTION_COSTS.plant_tree).toEqual({ credits: 30 })
    expect(ACTION_COSTS.build_filter).toEqual({ credits: 150 })
    expect(ACTION_COSTS.deploy_drone).toEqual({ energy: 30 })
    expect(ACTION_COSTS.open_map).toEqual({})
    expect(formatCost({ credits: 50 })).toBe('-50💰')
    expect(formatCost({ energy: 30 })).toBe('-30⚡')
    expect(formatCost({ credits: 50, energy: 10 })).toBe('-50💰 -10⚡')
    expect(formatCost({})).toBe('—')
  })

  it('checks affordability independently for credits and energy', () => {
    expect(canAfford({ credits: 2000, energy: 270 }, status())).toBe(true)
    expect(canAfford({ credits: 2001 }, status())).toBe(false)
    expect(canAfford({ energy: 271 }, status())).toBe(false)
    expect(canAfford({}, status())).toBe(true)
  })

  it('applies cleaning, planting, filters, drones, and utility actions', () => {
    const cleaned = applyAction(status(), 'clean_waste', 'Bersihkan', 50, 5)
    expect(cleaned.status).toMatchObject({
      pollution: 73,
      fishPopulation: 21,
      credits: 1950,
      energy: 270,
    })
    expect(cleaned).toMatchObject({ message: 'Sampah dibersihkan', type: 'success' })

    const polluted = applyAction(status({ pollution: 0 }), 'clean_waste', 'Bersihkan', 50, 5)
    expect(polluted.status).toMatchObject({ pollution: 0, fishPopulation: 18, credits: 1950 })

    const planted = applyAction(status({ trees: 49, biodiversity: 99 }), 'plant_tree', 'Tanam', 50, 5)
    expect(planted.status).toMatchObject({ trees: 50, biodiversity: 100, credits: 1970 })
    expect(planted.message).toBe('Pohon ditanam (50/50)')

    const scanned = applyAction(status(), 'scan_water', 'Scan', 50, 5)
    expect(scanned.status).toMatchObject({ energy: 260, waterQuality: 31 })
    expect(scanned).toMatchObject({ message: 'Kualitas air: 31%', type: 'info' })

    const drone = applyAction(status(), 'deploy_drone', 'Drone', 50, 5)
    expect(drone.status).toMatchObject({ drones: 4, energy: 240 })
    expect(drone.message).toBe('Drone diterbangkan (4/5)')

    const filtered = applyAction(
      status({ waterQuality: 95, fishPopulation: 98 }),
      'build_filter',
      'Filter',
      50,
      5
    )
    expect(filtered.status).toMatchObject({
      waterQuality: 100,
      fishPopulation: 100,
      credits: 1850,
    })
    expect(filtered.type).toBe('success')
  })

  it('leaves the environment untouched for utility actions', () => {
    const result = applyAction(status(), 'open_map', 'Peta', 50, 5)
    expect(result.status).toEqual(status())
    expect(result).toEqual({ status: status(), message: 'Aksi: Peta', type: 'info' })
  })
})

describe('static game data', () => {
  it('keeps region, mission, and level ids internally consistent', () => {
    const regionIds = REGIONS.map((region) => region.id)
    expect(regionIds).toEqual(['west-java', 'central-java', 'east-java'])
    expect(new Set(regionIds).size).toBe(regionIds.length)
    expect(REGIONS.filter((region) => region.unlocked).map((region) => region.id)).toEqual(['west-java'])
    expect(REGIONS.every((region) => region.image.startsWith('/images/regions/'))).toBe(true)

    expect(Object.keys(MISSION_LEVELS)).toEqual(['west-java'])
    const levels = MISSION_LEVELS['west-java']
    expect(levels).toHaveLength(10)
    expect(levels.map((level) => level.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(levels.filter((level) => level.unlocked).map((level) => level.id)).toEqual([1])
    expect(levels.slice(2).every((level) => level.title === 'Coming Soon')).toBe(true)

    const missionKeys = MISSIONS.map((mission) => `${mission.regionId}-${mission.level}`)
    expect(new Set(missionKeys).size).toBe(missionKeys.length)
    expect(MISSIONS.map((mission) => mission.id)).toEqual(['west-java-1', 'west-java-2'])
    expect(MISSIONS.every((mission) => regionIds.includes(mission.regionId))).toBe(true)
  })

  it('defines valid objectives and rewards for every mission', () => {
    const metrics: ObjectiveMetric[] = [
      'pollution',
      'biodiversity',
      'waterQuality',
      'fishPopulation',
      'trees',
      'drones',
    ]

    for (const mission of MISSIONS) {
      expect(mission.objectives.length).toBeGreaterThan(0)
      expect(mission.researchPoints).toBeGreaterThan(0)
      expect(mission.startingCredits).toBeGreaterThan(0)
      expect(mission.startingEnergy).toBeGreaterThan(0)
      expect(mission.rewards).toContain(`+${mission.researchPoints} Research Points`)

      for (const item of mission.objectives) {
        expect(metrics).toContain(item.metric)
        expect(['lte', 'gte']).toContain(item.comparator)
        expect(Number.isFinite(item.target)).toBe(true)
        expect(item.target).toBeGreaterThanOrEqual(0)
        expect(item.label.length).toBeGreaterThan(0)
      }
    }
  })
})
