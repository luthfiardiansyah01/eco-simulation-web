import type {
  Achievement,
  Mission,
  MissionLevel,
  Region,
} from '@/types'
import type { Language } from './i18n'

const REGION_ID: Record<
  string,
  { name: string; ecosystem: string[] }
> = {
  'west-java': {
    name: 'Jawa Barat',
    ecosystem: ['Ekosistem pegunungan', 'Iklim sejuk', 'Restorasi hutan'],
  },
  'central-java': {
    name: 'Jawa Tengah',
    ecosystem: ['Ekosistem pesisir', 'Zona tropis lembap', 'Pengelolaan banjir'],
  },
  'east-java': {
    name: 'Jawa Timur',
    ecosystem: ['Ekosistem perkotaan', 'Dampak industri', 'Pengendalian polusi'],
  },
}

const REGION_EN: Record<string, string> = {
  'west-java': 'West Java',
  'central-java': 'Central Java',
  'east-java': 'East Java',
}

const LEVEL_TITLE_ID: Record<string, string> = {
  'River Cleanup Initiative': 'Inisiatif Pembersihan Sungai',
  'Forest Wildlife Recovery': 'Pemulihan Satwa Hutan',
  'Coming Soon': 'Segera Hadir',
}

const MISSION_ID: Record<
  string,
  {
    title: string
    location: string
    story: string
    objectives: string[]
    rewards: string[]
  }
> = {
  'west-java-1': {
    title: 'Inisiatif Pembersihan Sungai',
    location: 'Ekosistem Sungai Bandung',
    story:
      'Sungai-sungai di sekitar Bandung mulai menunjukkan tingkat pencemaran yang berbahaya akibat pembuangan sampah ilegal dan ketidakseimbangan ekosistem. Sebagai peneliti lingkungan utama, tugasmu adalah memulihkan kualitas air dan mencegah keruntuhan ekologis lebih lanjut.',
    objectives: [
      'Kurangi polusi air di bawah 20%',
      'Pulihkan populasi ikan di atas 60%',
      'Tanam 50 pohon di tepi sungai',
    ],
    rewards: ['+250 Poin Riset', 'Buka Filter Air Lanjutan', 'Buka Level 2'],
  },
  'west-java-2': {
    title: 'Pemulihan Satwa Hutan',
    location: 'Hutan Dataran Tinggi Bandung',
    story:
      'Hutan dataran tinggi di sekitar Bandung menghadapi ancaman deforestasi. Populasi satwa liar menurun signifikan. Misimu adalah memulihkan ekosistem hutan dan melindungi spesies asli.',
    objectives: [
      'Tanam 100 pohon asli',
      'Pulihkan biodiversitas di atas 60%',
      'Terbangkan 5 drone survei untuk memetakan pembalakan liar',
    ],
    rewards: ['+400 Poin Riset', 'Buka Armada Drone', 'Buka Level 3'],
  },
}

const ACHIEVEMENTS: Record<
  string,
  { idTitle: string; idDescription: string; enDescription: string }
> = {
  'first-mission': {
    idTitle: 'Langkah Pertama',
    idDescription: 'Selesaikan misi pertamamu',
    enDescription: 'Complete your first mission',
  },
  'river-keeper': {
    idTitle: 'Penjaga Sungai',
    idDescription: 'Selesaikan 2 misi pemulihan sungai',
    enDescription: 'Complete 2 river restoration missions',
  },
  'tree-planter': {
    idTitle: 'Penanam Pohon',
    idDescription: 'Tanam 50 pohon',
    enDescription: 'Plant 50 trees',
  },
  'forest-guardian': {
    idTitle: 'Penjaga Hutan',
    idDescription: 'Tanam 100 pohon',
    enDescription: 'Plant 100 trees',
  },
  'clean-river': {
    idTitle: 'Sungai Bersih',
    idDescription: 'Turunkan polusi hingga 20% atau kurang',
    enDescription: 'Reduce pollution to 20% or below',
  },
  researcher: {
    idTitle: 'Peneliti',
    idDescription: 'Kumpulkan 250 poin riset',
    enDescription: 'Collect 250 research points',
  },
  'lead-researcher': {
    idTitle: 'Peneliti Utama',
    idDescription: 'Kumpulkan 1.000 poin riset',
    enDescription: 'Collect 1,000 research points',
  },
}

export function localizeRegion(region: Region, language: Language): Region {
  if (language !== 'id') return region
  const copy = REGION_ID[region.id]
  return copy ? { ...region, ...copy } : region
}

export function localizeMissionLevel(
  level: MissionLevel,
  language: Language
): MissionLevel {
  if (language !== 'id') return level
  return {
    ...level,
    title: LEVEL_TITLE_ID[level.title] ?? level.title,
  }
}

export function localizeMission(mission: Mission, language: Language): Mission {
  if (language !== 'id') return mission
  const copy = MISSION_ID[mission.id]
  if (!copy) return mission

  return {
    ...mission,
    title: copy.title,
    location: copy.location,
    story: copy.story,
    objectives: mission.objectives.map((objective, index) => ({
      ...objective,
      label: copy.objectives[index] ?? objective.label,
    })),
    rewards: mission.rewards.map(
      (reward, index) => copy.rewards[index] ?? reward
    ),
  }
}

export function localizeAchievement(
  achievement: Achievement,
  language: Language
): Achievement {
  const copy = ACHIEVEMENTS[achievement.id]
  if (!copy) return achievement

  return language === 'id'
    ? { ...achievement, title: copy.idTitle, description: copy.idDescription }
    : { ...achievement, description: copy.enDescription }
}

export function regionDisplayName(regionId: string, language: Language): string {
  return language === 'id'
    ? REGION_ID[regionId]?.name ?? regionId
    : REGION_EN[regionId] ?? regionId
}
