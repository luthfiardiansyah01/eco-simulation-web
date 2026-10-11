import { MISSIONS } from '@/data/regions'
import { notFound } from 'next/navigation'
import GameplayClient from './GameplayClient'

export const dynamic = 'force-dynamic'

export default async function PlayPage({
  params,
}: {
  params: Promise<{ regionId: string; level: string }>
}) {
  const { regionId, level } = await params
  const mission = MISSIONS.find((m) => m.regionId === regionId && m.level === parseInt(level))
  if (!mission) notFound()

  return <GameplayClient mission={mission} regionId={regionId} level={parseInt(level)} />
}
