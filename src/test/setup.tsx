import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { forwardRef } from 'react'
import { afterEach, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    onClick,
    'aria-current': ariaCurrent,
  }: {
    href?: unknown
    children?: React.ReactNode
    className?: string
    onClick?: React.MouseEventHandler<HTMLAnchorElement>
    'aria-current'?: React.AriaAttributes['aria-current']
  }) => (
    <a
      href={typeof href === 'string' ? href : '#'}
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
    >
      {children}
    </a>
  ),
}))

vi.mock('framer-motion', () => {
  const MotionDiv = forwardRef<HTMLDivElement, Record<string, unknown>>(
    function MotionDiv(props, ref) {
      const domProps = { ...props }
      delete domProps.initial
      delete domProps.animate
      delete domProps.exit
      delete domProps.transition
      delete domProps.variants
      delete domProps.whileHover
      delete domProps.whileTap
      return <div ref={ref} {...domProps} />
    }
  )

  return {
    motion: {
      div: MotionDiv,
      span: MotionDiv,
      button: MotionDiv,
      section: MotionDiv,
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
      <>{children}</>
    ),
  }
})

vi.mock('@/lib/audio/sound-engine', () => ({
  soundEngine: {
    play: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    unlock: vi.fn().mockResolvedValue(undefined),
    startAmbience: vi.fn(),
    stopAmbience: vi.fn(),
  },
}))

globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
  callback(0)
  return 0
}
globalThis.cancelAnimationFrame = () => undefined

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

afterEach(() => {
  cleanup()
  if (typeof window !== 'undefined') {
    localStorage.clear()
    sessionStorage.clear()
  }
  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('lang')
    document.documentElement.style.colorScheme = ''
  }
  vi.useRealTimers()
})
