'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { soundEngine, type SoundName } from '@/lib/audio/sound-engine'

type SoundContextValue = {
  muted: boolean
  volume: number
  toggleMuted: () => void
  setVolume: (volume: number) => void
  play: (name: SoundName) => void
  startAmbience: () => void
  stopAmbience: () => void
}

const SoundContext = createContext<SoundContextValue | null>(null)
const STORAGE_KEY = 'ecosim_sound_muted'
const VOLUME_KEY = 'ecosim_volume'
const DEFAULT_VOLUME = 0.7

export default function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false)
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)

  useEffect(() => {
    // Defer the preference read to the next frame so the server-rendered
    // default (sound on) and the hydrated client tree stay consistent.
    const frame = requestAnimationFrame(() => {
      let storedMute: string | null = null
      let storedVolume: string | null = null
      try {
        storedMute = localStorage.getItem(STORAGE_KEY)
        storedVolume = localStorage.getItem(VOLUME_KEY)
      } catch {
        // Storage can be unavailable in private or sandboxed contexts.
      }

      const parsedVolume = storedVolume === null ? DEFAULT_VOLUME : Number(storedVolume) / 100
      const nextVolume = Number.isFinite(parsedVolume)
        ? Math.max(0, Math.min(1, parsedVolume))
        : DEFAULT_VOLUME
      const shouldMute = storedMute === '1'

      soundEngine.setVolume(nextVolume)
      soundEngine.setMuted(shouldMute)
      setVolumeState(nextVolume)
      setMuted(shouldMute)
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    // Browsers only allow audio after a user gesture. Resume lazily, then leave
    // the listeners installed so the context can recover after tab suspension.
    const unlock = () => {
      void soundEngine.unlock()
    }

    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const play = useCallback((name: SoundName) => {
    soundEngine.play(name)
  }, [])

  const updateVolume = useCallback((next: number) => {
    const normalized = Math.max(0, Math.min(1, next))
    setVolumeState(normalized)
    soundEngine.setVolume(normalized)

    try {
      localStorage.setItem(VOLUME_KEY, String(Math.round(normalized * 100)))
    } catch {
      // Ignore storage failures; the in-memory preference still works.
    }
  }, [])

  const startAmbience = useCallback(() => {
    soundEngine.startAmbience()
  }, [])

  const stopAmbience = useCallback(() => {
    soundEngine.stopAmbience()
  }, [])

  const toggleMuted = useCallback(() => {
    const next = !muted
    setMuted(next)
    soundEngine.setMuted(next)

    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // Ignore storage failures; the in-memory preference still works.
    }

    if (!next) {
      // Let the master gain ramp up before playing the confirmation.
      window.setTimeout(() => soundEngine.play('toggle'), 30)
    }
  }, [muted])

  const value = useMemo(
    () => ({
      muted,
      volume,
      toggleMuted,
      setVolume: updateVolume,
      play,
      startAmbience,
      stopAmbience,
    }),
    [muted, volume, toggleMuted, updateVolume, play, startAmbience, stopAmbience]
  )

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound() {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error('useSound must be used inside SoundProvider')
  }
  return context
}
