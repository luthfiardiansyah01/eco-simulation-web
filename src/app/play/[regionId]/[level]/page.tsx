import { MISSIONS, MISSION_LEVELS } from '@/data/regions'
import { parseDifficulty } from '@/lib/gameplay/difficulty'
import { notFound, redirect } from 'next/navigation'
import { getTranslator } from '@/lib/i18n-server'
import { localizeMission } from '@/lib/i18n-content'
import GameplayClient from './GameplayClient'

export const dynamic = 'force-dynamic'

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ regionId: string; level: string }>
  searchParams: Promise<{ difficulty?: string | string[] }>
}) {
  const { regionId, level } = await params
  const { difficulty: difficultyParam } = await searchParams
  const { language } = await getTranslator()
  const levelNumber = parseInt(level)
  const mission = MISSIONS.find((m) => m.regionId === regionId && m.level === levelNumber)
  if (!mission) {
    if (MISSION_LEVELS[regionId]?.some((missionLevel) => missionLevel.id === levelNumber)) {
      redirect(`/mission/${regionId}`)
    }
    notFound()
  }

  return (
    <GameplayClient
      mission={localizeMission(mission, language)}
      regionId={regionId}
      level={levelNumber}
      difficulty={parseDifficulty(difficultyParam)}
    />
  )
}
