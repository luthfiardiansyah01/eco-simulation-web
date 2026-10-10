export type Region = {
  id: string
  name: string
  location: string
  image: string
  ecosystem: string[]
  unlocked: boolean
}

export type MissionLevel = {
  id: number
  title: string
  image: string
  unlocked: boolean
  completed: boolean
}

export type Mission = {
  id: string
  regionId: string
  level: number
  title: string
  location: string
  story: string
  objectives: string[]
  rewards: string[]
}

export type EnvironmentStatus = {
  pollution: number
  biodiversity: number
  waterQuality: number
  fishPopulation: number
  trees: number
  energy: number
  credits: number
  drones: number
}

export type GameAction = 'clean_waste' | 'plant_tree' | 'scan_water' | 'deploy_drone' | 'build_filter' | 'open_map' | 'analyze_area' | 'return_base'

export type EventLog = {
  id: string
  type: 'alert' | 'info' | 'success'
  message: string
  timestamp: Date
}

export type UserProgress = {
  userId: string
  regionId: string
  currentLevel: number
  completedLevels: number[]
  researchPoints: number
  unlockedItems: string[]
}
