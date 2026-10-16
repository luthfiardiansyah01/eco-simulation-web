import { RegionSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 space-y-2">
          <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-7 w-48 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <RegionSkeleton />
      </div>
    </main>
  )
}
