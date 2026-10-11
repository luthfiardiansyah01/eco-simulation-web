import Link from 'next/link'
import AuthButton from '@/components/layout/AuthButton'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl w-full">
        <h1 className="text-4xl font-bold tracking-widest mb-4">ECO-SIMULATION INTERFACE</h1>
        <div className="flex justify-between text-sm mb-12">
          <span>Status: <span className="text-green-400">ONLINE</span></span>
          <AuthButton />
        </div>

        <h2 className="text-sm tracking-widest mb-8 text-gray-300">SELECT SIMULATION MODE</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/region">
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded p-6 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer h-full flex flex-col">
              <h3 className="text-lg font-bold tracking-widest mb-4">ADVENTURE MODE</h3>
              <p className="text-sm text-gray-300 mb-4">
                Story-driven ecosystem simulation with dynamic environmental events.
              </p>
              <div className="text-xs text-gray-400 space-y-1 mb-6 flex-1">
                <p>Difficulty : <span className="text-red-400">HARD</span></p>
                <p>Biomass &nbsp;&nbsp;: <span className="text-white">82%</span></p>
                <p>Climate &nbsp;&nbsp;: <span className="text-white">Dynamic</span></p>
              </div>
              <button className="w-full border border-gray-400 text-sm py-1 hover:bg-white hover:text-black transition-colors">
                SELECT
              </button>
            </div>
          </Link>

          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded p-6 opacity-50 cursor-not-allowed flex flex-col">
            <h3 className="text-lg font-bold tracking-widest mb-4">CLASSIC FREE ROAM</h3>
            <p className="text-sm text-gray-300 mb-4">
              Explore the ecosystem freely without objectives.
            </p>
            <div className="text-xs text-gray-400 space-y-1 mb-6 flex-1">
              <p>Difficulty : <span className="text-green-400">RELAXED</span></p>
              <p>Biomass &nbsp;&nbsp;: <span className="text-white">∞</span></p>
              <p>Climate &nbsp;&nbsp;: <span className="text-white">Manual</span></p>
            </div>
            <button className="w-full border border-gray-600 text-sm py-1 text-gray-500 cursor-not-allowed">
              COMING SOON
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-10 text-xs text-gray-400">
          <span>[TAB] SWITCH MODE</span>
          <Link href="/region" className="text-green-400 hover:text-green-300">
            [ENTER] START SIMULATION →
          </Link>
        </div>
      </div>
    </main>
  )
}
