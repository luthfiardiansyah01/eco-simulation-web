import { MissionSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 space-y-2">
          <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <MissionSkeleton />
      </div>
    </main>
  )
}
