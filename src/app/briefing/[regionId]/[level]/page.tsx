import Link from 'next/link'
import { MISSIONS } from '@/data/regions'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ regionId: string; level: string }>
}) {
  const { regionId, level } = await params
  const mission = MISSIONS.find((m) => m.regionId === regionId && m.level === parseInt(level))
  if (!mission) notFound()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold tracking-widest mb-8 text-center">STORY BRIEFING</h1>

        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <p className="text-gray-400 tracking-widest">LOCATION : <span className="text-white">{mission.location.toUpperCase()}</span></p>
            <p className="text-gray-400 tracking-widest">LEVEL &nbsp;&nbsp;&nbsp;: <span className="text-white">{mission.level}</span></p>
            <p className="text-gray-400 tracking-widest">MISSION &nbsp;: <span className="text-white">{mission.title.toUpperCase()}</span></p>
          </div>

          <p className="text-base leading-relaxed text-gray-200 py-2">
            {mission.story}
          </p>

          <div>
            <p className="text-gray-400 tracking-widest mb-2">OBJECTIVES</p>
            <ul className="space-y-1">
              {mission.objectives.map((obj) => (
                <li key={obj} className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-gray-400 inline-block flex-shrink-0" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-gray-400 tracking-widest mb-2">REWARDS</p>
            <ul className="space-y-1">
              {mission.rewards.map((reward) => (
                <li key={reward} className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-gray-400 inline-block flex-shrink-0" />
                  <span>{reward}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-between mt-10 text-xs text-gray-400">
          <Link href={`/mission/${regionId}`} className="flex items-center gap-2 hover:text-white transition-colors">
            <span className="text-red-400">←</span> [ESC] BACK
          </Link>
          <Link
            href={`/play/${regionId}/${level}`}
            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
          >
            [ENTER] BEGIN SIMULATION →
          </Link>
        </div>
      </div>
    </main>
  )
}
