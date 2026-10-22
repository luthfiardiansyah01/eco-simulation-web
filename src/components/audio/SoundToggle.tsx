'use client'

import { usePathname } from 'next/navigation'
import { useSound } from '@/components/audio/SoundProvider'

interface Props {
  /** Position the toggle at the top-right of the viewport. */
  floating?: boolean
  className?: string
}

export default function SoundToggle({ floating = true, className = '' }: Props) {
  const { muted, toggleMuted } = useSound()
  const pathname = usePathname()

  // Gameplay has its own toggle in the top bar so it never covers the map.
  if (floating && pathname.startsWith('/play/')) return null

  const label = muted ? 'Aktifkan suara & musik' : 'Matikan suara & musik'

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={label}
      title={label}
      aria-pressed={!muted}
      className={[
        'flex items-center justify-center rounded-full border transition-all',
        'border-[var(--border-card)] bg-[var(--bg-card)]/80 text-sm text-foreground',
        'hover:border-[var(--accent-green)] hover:bg-[var(--bg-card-hover)] active:scale-95',
        'backdrop-blur-sm',
        floating ? 'fixed top-3 right-3 z-40 h-9 w-9 shadow-lg' : 'h-7 w-7 text-xs',
        className,
      ].join(' ')}
    >
      <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
    </button>
  )
}
