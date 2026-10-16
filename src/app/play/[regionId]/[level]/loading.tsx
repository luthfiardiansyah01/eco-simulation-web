export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1a14' }}>
      <div className="text-center">
        <div className="text-4xl mb-4" style={{ animation: 'float 2s ease-in-out infinite' }}>🌿</div>
        <p className="text-sm text-[var(--accent-green)]">Memuat simulasi...</p>
        <div className="mt-3 w-32 h-1 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-1 rounded-full" style={{
            width: '60%',
            background: 'linear-gradient(90deg,#16a34a,#2dd4bf)',
            animation: 'skeleton-shimmer 1.5s infinite',
            backgroundSize: '200% 100%',
          }} />
        </div>
      </div>
    </div>
  )
}
