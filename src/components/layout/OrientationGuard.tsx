'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function OrientationGuard() {
  const pathname = usePathname()
  const isGameplay = pathname.startsWith('/play/')

  useEffect(() => {
    if (isGameplay) return // GameplayClient handles its own lock

    const lockPortrait = async () => {
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as ScreenOrientation & { lock: (o: string) => Promise<void> }).lock('portrait')
        }
      } catch { /* not supported on all devices */ }
    }

    lockPortrait()
  }, [isGameplay])

  return null
}
