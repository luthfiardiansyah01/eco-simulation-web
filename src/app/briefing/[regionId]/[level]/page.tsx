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

  const regionMeta: Record<string, { emoji: string; color: string }> = {
    'west-java':    { emoji: '🏔️', color: 'from-green-900/40 to-teal-900/20' },
    'central-java': { emoji: '🌾', color: 'from-amber-900/40 to-green-900/20' },
    'east-java':    { emoji: '🌊', color: 'from-blue-900/40 to-teal-900/20' },
  }
  const meta = regionMeta[regionId] ?? { emoji: '🌿', color: 'from-green-900/40 to-teal-900/20' }

  const objectiveIcons = ['🎯', '🔬', '🌱', '💧', '📊', '🦋']
  const rewardIcons = ['⭐', '🏆', '💎', '🔓', '🌿', '📈']

  return (
    <main className="min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full bg-green-900/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full bg-teal-900/15 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Back nav */}
        <Link href={`/mission/${regionId}`} className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-5">
          ← Kembali ke Daftar Misi
        </Link>

        {/* Mission header */}
        <div className={`eco-card bg-gradient-to-br ${meta.color} p-5 mb-4`}>
          <div className="flex items-start gap-3">
            <span className="text-4xl mt-1">{meta.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="badge badge-teal">Level {mission.level}</span>
                <span className="badge badge-amber">⭐ +250 pts</span>
              </div>
              <h1 className="text-xl font-bold text-white mb-1">{mission.title}</h1>
              <p className="text-xs text-[var(--text-muted)]">📍 {mission.location}</p>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="eco-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📖</span>
            <h2 className="text-sm font-semibold text-[var(--accent-green)] tracking-wide uppercase">Latar Belakang</h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--foreground)] opacity-90">
            {mission.story}
          </p>
        </div>

        {/* Objectives */}
        <div className="eco-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h2 className="text-sm font-semibold text-[var(--accent-teal)] tracking-wide uppercase">Objektif Misi</h2>
          </div>
          <ul className="space-y-2.5">
            {mission.objectives.map((obj, i) => (
              <li key={obj} className="flex items-start gap-3">
                <span className="text-base mt-0.5 flex-shrink-0">{objectiveIcons[i] ?? '•'}</span>
                <span className="text-sm text-[var(--foreground)] opacity-85">{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rewards */}
        <div className="eco-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🏆</span>
            <h2 className="text-sm font-semibold text-[var(--accent-amber)] tracking-wide uppercase">Hadiah</h2>
          </div>
          <ul className="space-y-2.5">
            {mission.rewards.map((reward, i) => (
              <li key={reward} className="flex items-start gap-3">
                <span className="text-base mt-0.5 flex-shrink-0">{rewardIcons[i] ?? '•'}</span>
                <span className="text-sm text-[var(--foreground)] opacity-85">{reward}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Link href={`/mission/${regionId}`} className="flex-1">
            <button className="eco-btn-secondary w-full py-3 text-sm">
              ← Kembali
            </button>
          </Link>
          <Link href={`/play/${regionId}/${level}`} className="flex-2 w-full" style={{ flex: 2 }}>
            <button className="eco-btn-primary w-full py-3 text-sm">
              ▶ Mulai Simulasi
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
