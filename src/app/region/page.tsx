import Link from 'next/link'
import { REGIONS } from '@/data/regions'

export default function RegionPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        <h1 className="text-4xl font-bold tracking-widest mb-2">ECO-SIMULATION INTERFACE</h1>
        <div className="flex justify-between text-sm mb-10">
          <span>Status: <span className="text-green-400">ONLINE</span></span>
          <span>User: <span className="text-white">Guest</span></span>
        </div>

        <h2 className="text-sm tracking-widest mb-8 text-gray-300">SELECT ADVENTURE REGION</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REGIONS.map((region) => (
            <div key={region.id} className={`bg-[var(--bg-card)] border border-[var(--border-card)] rounded p-4 flex flex-col ${!region.unlocked ? 'opacity-50' : ''}`}>
              <h3 className="text-base font-bold tracking-widest mb-3">{region.name.toUpperCase()}</h3>

              <div className="bg-gray-600 rounded mb-3 h-36 flex items-center justify-center text-gray-400 text-sm">
                {region.location}
              </div>

              <ul className="text-xs text-gray-300 space-y-1 mb-4 flex-1 text-left">
                {region.ecosystem.map((item) => (
                  <li key={item}>› {item}</li>
                ))}
              </ul>

              {region.unlocked ? (
                <Link href={`/mission/${region.id}`}>
                  <button className="w-full border border-gray-400 text-sm py-1 hover:bg-white hover:text-black transition-colors">
                    PLAY
                  </button>
                </Link>
              ) : (
                <button className="w-full border border-gray-600 text-sm py-1 text-gray-500 cursor-not-allowed">
                  LOCKED
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-10 text-xs text-gray-400">
          <Link href="/" className="flex items-center gap-2 hover:text-white transition-colors">
            <span className="text-red-400">←</span> [ESC] BACK
          </Link>
          <span>SELECT REGION TO CONTINUE</span>
        </div>
      </div>
    </main>
  )
}
