'use client'

import { useEffect, useState } from 'react'
import SoundLink from '@/components/audio/SoundLink'
import { useI18n } from '@/components/settings/PreferencesProvider'
import { createClient } from '@/lib/supabase/client'

type GuestProgressBannerProps = {
  /**
   * `card` is used on the briefing page. `bar` is a compact strip that sits
   * directly under the gameplay top bar without crowding its controls.
   */
  variant?: 'card' | 'bar'
}

export default function GuestProgressBanner({
  variant = 'card',
}: GuestProgressBannerProps) {
  const { t } = useI18n()
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [isGuest, setIsGuest] = useState(!configured)
  const [ready, setReady] = useState(!configured)

  useEffect(() => {
    if (!configured) return

    let cancelled = false
    const supabase = createClient()

    const update = (hasUser: boolean) => {
      if (cancelled) return
      setIsGuest(!hasUser)
      setReady(true)
    }

    // getSession() reads the local session without a network round trip. The
    // server still validates every mission save, so this is UI-only state.
    supabase.auth
      .getSession()
      .then(({ data }) => update(Boolean(data.session?.user)))
      .catch(() => update(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      update(Boolean(session?.user))
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [configured])

  if (!ready || !isGuest) return null

  if (variant === 'bar') {
    return (
      <div
        role="note"
        className="flex flex-shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5"
        style={{
          borderColor: 'rgba(251, 191, 36, 0.35)',
          background: 'rgba(251, 191, 36, 0.08)',
        }}
      >
        <p className="truncate text-[10px] font-medium text-[var(--accent-amber)]">
          👤 {t('Mode tamu — progress tidak disimpan.')}
        </p>
        <SoundLink
          href="/login"
          className="badge badge-amber flex-shrink-0 text-[9px]"
        >
          {t('Masuk')}
        </SoundLink>
      </div>
    )
  }

  return (
    <div
      role="note"
      className="eco-card mt-4 flex items-center gap-3 border-[var(--accent-amber)]/30 p-4"
    >
      <span className="text-xl" aria-hidden="true">
        💡
      </span>
      <p className="flex-1 text-xs leading-relaxed text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--accent-amber)]">
          {t('Mode tamu — progress tidak disimpan.')}
        </span>{' '}
        <SoundLink
          href="/login"
          className="font-medium text-[var(--accent-amber)] hover:underline"
        >
          {t('Masuk agar progress tersimpan.')}
        </SoundLink>
      </p>
    </div>
  )
}
