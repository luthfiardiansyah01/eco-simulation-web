'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  createTranslator,
  type Language,
  type Translator,
} from '@/lib/i18n'

export type { Language } from '@/lib/i18n'
export type Theme = 'dark' | 'light'

type PreferencesContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: Translator
  notifications: boolean
  setNotifications: (enabled: boolean) => void
  theme: Theme
  setTheme: (theme: Theme) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const LANGUAGE_KEY = 'ecosim_language'
const NOTIFICATIONS_KEY = 'ecosim_notifications'
const THEME_KEY = 'ecosim_theme'

function writeLanguageCookie(language: Language) {
  try {
    document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`
  } catch {
    // Cookies can be unavailable in restricted contexts.
  }
}

export default function PreferencesProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode
  initialLanguage?: Language
}) {
  const router = useRouter()
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const [notifications, setNotificationsState] = useState(true)
  const [theme, setThemeState] = useState<Theme>('dark')
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => {
    // Read device preferences after hydration so the server markup stays stable.
    const frame = requestAnimationFrame(() => {
      let storedLanguage: string | null = null
      let storedNotifications: string | null = null
      let storedTheme: string | null = null

      try {
        storedLanguage = localStorage.getItem(LANGUAGE_KEY)
        storedNotifications = localStorage.getItem(NOTIFICATIONS_KEY)
        storedTheme = localStorage.getItem(THEME_KEY)
      } catch {
        // Storage can be unavailable in private or sandboxed contexts.
      }

      if (storedLanguage === 'id' || storedLanguage === 'en') {
        setLanguageState(storedLanguage)
        // Older versions only stored the language in localStorage. Keep the
        // cookie in sync so server-rendered pages can use the same value.
        if (storedLanguage !== initialLanguage) {
          writeLanguageCookie(storedLanguage)
          router.refresh()
        }
      }
      if (storedNotifications !== null) {
        setNotificationsState(storedNotifications === '1')
      }
      if (storedTheme === 'dark' || storedTheme === 'light') {
        setThemeState(storedTheme)
      }
      setThemeReady(true)
    })

    return () => cancelAnimationFrame(frame)
  }, [initialLanguage, router])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    // The inline boot script has already applied the saved theme before paint.
    // Wait until storage has been read before syncing so we never flash the default.
    if (!themeReady) return

    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme

    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'light' ? '#f4faf6' : '#0d1f1a')
    }
  }, [theme, themeReady])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    writeLanguageCookie(next)
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // Ignore storage failures; the in-memory preference still works.
    }
    // Server components read the language cookie, so refresh them after the
    // client-side copy has updated immediately.
    router.refresh()
  }, [router])

  const setNotifications = useCallback((enabled: boolean) => {
    setNotificationsState(enabled)
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, enabled ? '1' : '0')
    } catch {
      // Ignore storage failures; the in-memory preference still works.
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Ignore storage failures; the in-memory preference still works.
    }
  }, [])

  const t = useMemo(() => createTranslator(language), [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      notifications,
      setNotifications,
      theme,
      setTheme,
    }),
    [
      language,
      setLanguage,
      t,
      notifications,
      setNotifications,
      theme,
      setTheme,
    ]
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider')
  }
  return context
}

/**
 * Translation-only hook with an Indonesian fallback. Components can therefore
 * be rendered in isolation (including in tests) without a provider.
 */
export function useI18n(): { language: Language; t: Translator } {
  const context = useContext(PreferencesContext)
  const language = context?.language ?? DEFAULT_LANGUAGE
  const t = useMemo(
    () => context?.t ?? createTranslator(language),
    [context?.t, language]
  )

  return { language, t }
}
