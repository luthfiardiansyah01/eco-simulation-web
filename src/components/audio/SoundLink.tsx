'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useSound } from '@/components/audio/SoundProvider'
import type { SoundName } from '@/lib/audio/sound-engine'

type LinkProps = ComponentProps<typeof Link>

interface Props extends LinkProps {
  sound?: SoundName
}

/**
 * Next.js Link with a short UI sound. Server components can use this wrapper
 * without becoming client components themselves.
 */
export default function SoundLink({ sound = 'click', onClick, ...props }: Props) {
  const { play } = useSound()

  return (
    <Link
      {...props}
      onClick={(event) => {
        play(sound)
        onClick?.(event)
      }}
    />
  )
}
