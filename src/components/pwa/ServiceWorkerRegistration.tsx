'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // A production service worker can keep controlling localhost after a
    // `next start` test. Remove it in development so edits are never stale.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .catch(() => undefined)
      return
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        // Check for an updated worker without blocking the first paint.
        void registration.update().catch(() => undefined)
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    if (document.readyState === 'complete') {
      void register()
      return
    }

    const onLoad = () => void register()
    window.addEventListener('load', onLoad, { once: true })

    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
