import { Region, Mission, MissionLevel } from '@/types'

export const REGIONS: Region[] = [
  {
    id: 'west-java',
    name: 'West Java',
    location: 'Bandung',
    image: '/images/regions/ikon-bandung.png',
    ecosystem: ['Mountain ecosystem', 'Cool climate', 'Forest restoration'],
    unlocked: true,
  },
  {
    id: 'central-java',
    name: 'Central Java',
    location: 'Semarang',
    image: '/images/regions/ikon-semarang.png',
    ecosystem: ['Coastal ecosystem', 'Humid tropical zone', 'Flood management'],
    unlocked: false,
  },
  {
    id: 'east-java',
    name: 'East Java',
    location: 'Surabaya',
    image: '/images/regions/ikon-surabaya.png',
    ecosystem: ['Urban ecosystem', 'Industrial impact', 'Pollution control'],
    unlocked: false,
  },
]

export const MISSION_LEVELS: Record<string, MissionLevel[]> = {
  'west-java': [
    { id: 1, title: 'River Cleanup Initiative', image: '/images/missions/bandung-1.jpg', unlocked: true, completed: false },
    { id: 2, title: 'Forest Wildlife Recovery', image: '/images/missions/bandung-2.jpg', unlocked: false, completed: false },
    { id: 3, title: 'Coming Soon', image: '', unlocked: false, completed: false },
    { id: 4, title: 'Coming Soon', image: '', unlocked: false, completed: false },
    { id: 5, title: 'Coming Soon', image: '', unlocked: false, completed: false },
    { id: 6, title: 'Coming Soon', image: '', unlocked: false, completed: false },
    { id: 7, title: 'Coming Soon', image: '', unlocked: false, completed: false },
    { id: 8, title: 'Coming Soon', image: '', unlocked: false, completed: false },
    { id: 9, title: 'Coming Soon', image: '', unlocked: false, completed: false },
    { id: 10, title: 'Coming Soon', image: '', unlocked: false, completed: false },
  ],
}

export const MISSIONS: Mission[] = [
  {
    id: 'west-java-1',
    regionId: 'west-java',
    level: 1,
    title: 'River Cleanup Initiative',
    location: 'Bandung River Ecosystem',
    story:
      'The rivers surrounding Bandung have begun showing dangerous levels of pollution due to illegal waste disposal and ecosystem imbalance. As the lead environmental researcher, your task is to restore water quality and prevent further ecological collapse.',
    objectives: [
      'Reduce water pollution below 20%',
      'Restore fish population',
      'Plant 50 riverbank trees',
    ],
    rewards: [
      '+250 Research Points',
      'Unlock Advanced Water Filters',
      'Unlock Level 2',
    ],
  },
  {
    id: 'west-java-2',
    regionId: 'west-java',
    level: 2,
    title: 'Forest Wildlife Recovery',
    location: 'Bandung Highland Forest',
    story:
      'The highland forests surrounding Bandung are facing deforestation threats. Wildlife populations have declined significantly. Your mission is to restore the forest ecosystem and protect native species.',
    objectives: [
      'Plant 100 native trees',
      'Restore biodiversity above 60%',
      'Remove 10 illegal logging sites',
    ],
    rewards: [
      '+400 Research Points',
      'Unlock Drone Fleet',
      'Unlock Level 3',
    ],
  },
]
