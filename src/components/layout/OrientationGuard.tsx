'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function lockOrientation(orientation: 'landscape' | 'portrait') {
  try {
    const w = window as unknown as { AndroidOrientation?: { lock: (o: string) => void } }
    if (w.AndroidOrientation) {
      w.AndroidOrientation.lock(orientation)
      return
    }
  } catch { /* ignore */ }
  try {
    if (screen.orientation && 'lock' in screen.orientation) {
      (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> }).lock(orientation)
    }
  } catch { /* ignore */ }
}

export default function OrientationGuard() {
  const pathname = usePathname()
  const isGameplay = pathname.startsWith('/play/')

  useEffect(() => {
    if (isGameplay) return
    lockOrientation('portrait')
  }, [isGameplay])

  return null
}
