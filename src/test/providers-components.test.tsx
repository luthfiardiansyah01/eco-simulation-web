import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}))

import { createClient } from '@/lib/supabase/client'
import { soundEngine } from '@/lib/audio/sound-engine'
import PreferencesProvider, {
  usePreferences,
} from '@/components/settings/PreferencesProvider'
import SoundProvider, { useSound } from '@/components/audio/SoundProvider'
import AchievementToast from '@/components/game/AchievementToast'
import SoundToggle from '@/components/audio/SoundToggle'
import AuthButton from '@/components/layout/AuthButton'
import ErrorFallback from '@/components/errors/ErrorFallback'
import OnboardingTutorial from '@/components/ui/OnboardingTutorial'

const navigationState = vi.hoisted(() => ({ pathname: '/' }))
const createClientMock = vi.mocked(createClient)
const engine = vi.mocked(soundEngine)

function PreferencesProbe() {
  const {
    language,
    setLanguage,
    notifications,
    setNotifications,
    theme,
    setTheme,
  } = usePreferences()

  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="notifications">{String(notifications)}</span>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setLanguage('en')}>set-en</button>
      <button onClick={() => setNotifications(false)}>disable-notifications</button>
      <button onClick={() => setTheme('light')}>set-light</button>
    </div>
  )
}

function SoundProbe() {
  const {
    muted,
    volume,
    toggleMuted,
    setVolume,
    play,
    startAmbience,
    stopAmbience,
  } = useSound()

  return (
    <div>
      <span data-testid="muted">{String(muted)}</span>
      <span data-testid="volume">{volume}</span>
      <button onClick={toggleMuted}>toggle-muted</button>
      <button onClick={() => setVolume(1.5)}>max-volume</button>
      <button onClick={() => play('click')}>play-click</button>
      <button onClick={startAmbience}>start-ambience</button>
      <button onClick={stopAmbience}>stop-ambience</button>
    </div>
  )
}

type AuthChangeHandler = (
  event: string,
  session: { user: { email?: string } } | null
) => { data: { subscription: { unsubscribe: () => void } } }

function soundClient(user: unknown = null) {
  const unsubscribe = vi.fn()
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
      onAuthStateChange: vi.fn<AuthChangeHandler>((event, session) => {
        void event
        void session
        return { data: { subscription: { unsubscribe } } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }
  return { client, unsubscribe }
}

beforeEach(() => {
  navigationState.pathname = '/'
  createClientMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('PreferencesProvider', () => {
  it('hydrates saved language, notification, and theme preferences', async () => {
    localStorage.setItem('ecosim_language', 'en')
    localStorage.setItem('ecosim_notifications', '0')
    localStorage.setItem('ecosim_theme', 'light')
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)

    render(
      <PreferencesProvider>
        <PreferencesProbe />
      </PreferencesProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('language')).toHaveTextContent('en')
    )
    expect(screen.getByTestId('notifications')).toHaveTextContent('false')
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe('light')
    )
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(meta).toHaveAttribute('content', '#f4faf6')
    meta.remove()
  })

  it('uses defaults and persists changes', async () => {
    const user = userEvent.setup()
    render(
      <PreferencesProvider>
        <PreferencesProbe />
      </PreferencesProvider>
    )

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe('dark')
    )
    expect(screen.getByTestId('language')).toHaveTextContent('id')
    expect(screen.getByTestId('notifications')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: 'set-en' }))
    await user.click(screen.getByRole('button', { name: 'disable-notifications' }))
    await user.click(screen.getByRole('button', { name: 'set-light' }))

    expect(screen.getByTestId('language')).toHaveTextContent('en')
    expect(screen.getByTestId('notifications')).toHaveTextContent('false')
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorage.getItem('ecosim_language')).toBe('en')
    expect(localStorage.getItem('ecosim_notifications')).toBe('0')
    expect(localStorage.getItem('ecosim_theme')).toBe('light')
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('ignores unknown stored values', async () => {
    localStorage.setItem('ecosim_language', 'fr')
    localStorage.setItem('ecosim_theme', 'neon')
    localStorage.setItem('ecosim_notifications', 'yes')
    render(
      <PreferencesProvider>
        <PreferencesProbe />
      </PreferencesProvider>
    )

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe('dark')
    )
    expect(screen.getByTestId('language')).toHaveTextContent('id')
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('notifications')).toHaveTextContent('false')
  })
})

describe('SoundProvider', () => {
  it('hydrates volume and mute preferences', async () => {
    localStorage.setItem('ecosim_sound_muted', '1')
    localStorage.setItem('ecosim_volume', '20')
    render(
      <SoundProvider>
        <SoundProbe />
      </SoundProvider>
    )

    await waitFor(() => expect(screen.getByTestId('volume')).toHaveTextContent('0.2'))
    expect(screen.getByTestId('muted')).toHaveTextContent('true')
    expect(engine.setVolume).toHaveBeenCalledWith(0.2)
    expect(engine.setMuted).toHaveBeenCalledWith(true)
  })

  it('clamps volume, persists preferences, and delegates controls', async () => {
    const user = userEvent.setup()
    render(
      <SoundProvider>
        <SoundProbe />
      </SoundProvider>
    )

    await user.click(screen.getByRole('button', { name: 'max-volume' }))
    expect(screen.getByTestId('volume')).toHaveTextContent('1')
    expect(engine.setVolume).toHaveBeenCalledWith(1)
    expect(localStorage.getItem('ecosim_volume')).toBe('100')

    await user.click(screen.getByRole('button', { name: 'play-click' }))
    expect(engine.play).toHaveBeenCalledWith('click')

    await user.click(screen.getByRole('button', { name: 'start-ambience' }))
    await user.click(screen.getByRole('button', { name: 'stop-ambience' }))
    expect(engine.startAmbience).toHaveBeenCalled()
    expect(engine.stopAmbience).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'toggle-muted' }))
    expect(screen.getByTestId('muted')).toHaveTextContent('true')
    expect(engine.setMuted).toHaveBeenCalledWith(true)
    expect(localStorage.getItem('ecosim_sound_muted')).toBe('1')
  })

  it('unlocks audio after the first user gesture and plays an unmute cue', async () => {
    const user = userEvent.setup()
    render(
      <SoundProvider>
        <SoundProbe />
      </SoundProvider>
    )

    fireEvent.pointerDown(window)
    expect(engine.unlock).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'toggle-muted' }))
    await user.click(screen.getByRole('button', { name: 'toggle-muted' }))
    await waitFor(() => expect(engine.play).toHaveBeenCalledWith('toggle'))
  })

  it('falls back to the default volume for invalid storage', async () => {
    localStorage.setItem('ecosim_volume', 'not-a-number')
    render(
      <SoundProvider>
        <SoundProbe />
      </SoundProvider>
    )

    await waitFor(() => expect(screen.getByTestId('volume')).toHaveTextContent('0.7'))
    expect(engine.setVolume).toHaveBeenCalledWith(0.7)
    expect(screen.getByTestId('muted')).toHaveTextContent('false')
  })
})

describe('AchievementToast', () => {
  const achievement = {
    id: 'tree-5',
    title: 'Tree Starter',
    description: 'Plant five trees',
    icon: '🌱',
    conditionType: 'trees_planted' as const,
    conditionValue: 5,
  }

  it('shows unlocked achievements when notifications are enabled', async () => {
    render(
      <PreferencesProvider>
        <AchievementToast achievements={[achievement]} />
      </PreferencesProvider>
    )

    expect(await screen.findByText('Tree Starter')).toBeInTheDocument()
    expect(screen.getByText('ACHIEVEMENT UNLOCKED')).toBeInTheDocument()
  })

  it('renders nothing when notifications are disabled or empty', async () => {
    localStorage.setItem('ecosim_notifications', '0')
    const { rerender } = render(
      <PreferencesProvider>
        <AchievementToast achievements={[achievement]} />
      </PreferencesProvider>
    )

    await waitFor(() =>
      expect(screen.queryByText('Tree Starter')).not.toBeInTheDocument()
    )

    localStorage.setItem('ecosim_notifications', '1')
    rerender(
      <PreferencesProvider>
        <AchievementToast achievements={[]} />
      </PreferencesProvider>
    )
    expect(screen.queryByText('ACHIEVEMENT UNLOCKED')).not.toBeInTheDocument()
  })
})

describe('SoundToggle', () => {
  function renderToggle(props: { floating?: boolean } = {}) {
    return render(
      <SoundProvider>
        <SoundToggle {...props} />
      </SoundProvider>
    )
  }

  it('toggles the label and pressed state', async () => {
    const user = userEvent.setup()
    renderToggle()

    const button = screen.getByRole('button', { name: 'Matikan suara & musik' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await user.click(button)
    expect(
      screen.getByRole('button', { name: 'Aktifkan suara & musik' })
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('hides only the floating control during gameplay', () => {
    navigationState.pathname = '/play/west-java/1'
    const { unmount } = renderToggle()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    unmount()

    renderToggle({ floating: false })
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})

describe('AuthButton', () => {
  it('shows the login link for guests', async () => {
    const { client } = soundClient(null)
    createClientMock.mockReturnValue(client as never)
    render(
      <SoundProvider>
        <AuthButton />
      </SoundProvider>
    )

    expect(await screen.findByRole('link', { name: /Masuk/ })).toHaveAttribute(
      'href',
      '/login'
    )
  })

  it('shows the signed-in user and signs out', async () => {
    const user = userEvent.setup()
    const { client, unsubscribe } = soundClient({
      id: 'user-1',
      email: 'ranger@example.com',
    })
    createClientMock.mockReturnValue(client as never)
    const { unmount } = render(
      <SoundProvider>
        <AuthButton />
      </SoundProvider>
    )

    expect(await screen.findByText('ranger')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keluar' }))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Masuk/ })).toBeInTheDocument()
    )
    expect(client.auth.signOut).toHaveBeenCalled()
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('reacts to auth state changes', async () => {
    const { client } = soundClient(null)
    createClientMock.mockReturnValue(client as never)
    render(
      <SoundProvider>
        <AuthButton />
      </SoundProvider>
    )
    await screen.findByRole('link', { name: /Masuk/ })

    const onChange = client.auth.onAuthStateChange.mock
      .calls[0][0] as unknown as AuthChangeHandler
    act(() => {
      onChange('SIGNED_IN', {
        user: { email: 'new-ranger@example.com' },
      })
    })
    expect(await screen.findByText('new-ranger')).toBeInTheDocument()

    act(() => onChange('SIGNED_OUT', null))
    expect(await screen.findByRole('link', { name: /Masuk/ })).toBeInTheDocument()
  })
})

describe('ErrorFallback', () => {
  it('renders details and retries', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()
    render(
      <ErrorFallback
        title="Terjadi kesalahan"
        description="Coba lagi."
        digest="abc123"
        onRetry={retry}
        backHref="/login"
        backLabel="Kembali"
      />
    )

    expect(screen.getByText('Terjadi kesalahan')).toBeInTheDocument()
    expect(screen.getByText('Coba lagi.')).toBeInTheDocument()
    expect(screen.getByText(/abc123/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Coba Lagi/ }))
    expect(retry).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Kembali' })).toHaveAttribute(
      'href',
      '/login'
    )
  })
})

describe('OnboardingTutorial', () => {
  function renderTutorial(props: { forceOpen?: boolean; onClose?: () => void } = {}) {
    return render(
      <SoundProvider>
        <OnboardingTutorial {...props} />
      </SoundProvider>
    )
  }

  it('opens on first visit and navigates steps', async () => {
    const user = userEvent.setup()
    renderTutorial()

    expect(await screen.findByText('Selamat Datang di EcoSim!')).toBeInTheDocument()
    expect(screen.getByText('1 / 8')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lanjut →' }))
    expect(screen.getByText('Pilih Mode Adventure')).toBeInTheDocument()
    expect(screen.getByText('2 / 8')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Kembali' }))
    expect(screen.getByText('Selamat Datang di EcoSim!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lewati' }))
    expect(screen.queryByText('Selamat Datang di EcoSim!')).not.toBeInTheDocument()
    expect(localStorage.getItem('ecosim_onboarding_done')).toBe('1')
    expect(engine.play).toHaveBeenCalledWith('start')
  })

  it('stays closed after completion and can be force-opened', async () => {
    localStorage.setItem('ecosim_onboarding_done', '1')
    const onClose = vi.fn()
    const { unmount } = renderTutorial()

    await waitFor(() =>
      expect(screen.queryByText('Selamat Datang di EcoSim!')).not.toBeInTheDocument()
    )
    unmount()

    renderTutorial({ forceOpen: true, onClose })
    expect(await screen.findByText('Selamat Datang di EcoSim!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lewati' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('walks through all steps and finishes on the final action', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderTutorial({ forceOpen: true, onClose })

    await screen.findByText('Selamat Datang di EcoSim!')
    for (let step = 1; step < 8; step += 1) {
      await user.click(screen.getByRole('button', { name: 'Lanjut →' }))
    }
    expect(screen.getByText('8 / 8')).toBeInTheDocument()
    expect(screen.getByText('Raih Achievement!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '🌿 Mulai Bermain!' }))
    expect(onClose).toHaveBeenCalled()
    expect(screen.queryByText('Raih Achievement!')).not.toBeInTheDocument()
    expect(localStorage.getItem('ecosim_onboarding_done')).toBe('1')
  })
})
