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

export type ObjectiveMetric =
  | 'pollution'
  | 'biodiversity'
  | 'waterQuality'
  | 'fishPopulation'
  | 'trees'
  | 'drones'

export type ObjectiveComparator = 'lte' | 'gte'

export type MissionObjective = {
  label: string
  metric: ObjectiveMetric
  comparator: ObjectiveComparator
  target: number
}

export type Mission = {
  id: string
  regionId: string
  level: number
  title: string
  location: string
  story: string
  objectives: MissionObjective[]
  rewards: string[]
  researchPoints: number
  startingCredits: number
  startingEnergy: number
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

export type AchievementCondition =
  | 'trees_planted'
  | 'pollution_below'
  | 'missions_completed'
  | 'research_points'

export type Achievement = {
  id: string
  title: string
  description: string
  icon: string
  conditionType: AchievementCondition
  conditionValue: number
}

export type UserAchievement = {
  achievementId: string
  unlockedAt: string
}

export type LeaderboardEntry = {
  rank: number
  username: string
  totalPoints: number
  missionsCompleted: number
  achievementsCount: number
  regionsCount: number
  isCurrentUser: boolean
}
