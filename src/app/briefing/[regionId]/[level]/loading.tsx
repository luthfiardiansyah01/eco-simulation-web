import { BriefingSkeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5 h-3 w-24 rounded" style={{ background: 'var(--track-bg)' }} />
        <BriefingSkeleton />
      </div>
    </main>
  )
}
