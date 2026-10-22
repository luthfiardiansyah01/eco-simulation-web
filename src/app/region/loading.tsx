import { RegionSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 space-y-2">
          <div className="h-3 w-24 rounded" style={{ background: 'var(--track-bg)' }} />
          <div className="h-7 w-48 rounded" style={{ background: 'var(--track-bg)' }} />
        </div>
        <RegionSkeleton />
      </div>
    </main>
  )
}
