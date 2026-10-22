import { MISSIONS } from '@/data/regions'
import { parseDifficulty } from '@/lib/gameplay/difficulty'
import { notFound } from 'next/navigation'
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
  const mission = MISSIONS.find((m) => m.regionId === regionId && m.level === parseInt(level))
  if (!mission) notFound()

  return (
    <GameplayClient
      mission={mission}
      regionId={regionId}
      level={parseInt(level)}
      difficulty={parseDifficulty(difficultyParam)}
    />
  )
}
