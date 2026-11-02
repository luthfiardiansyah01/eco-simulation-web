import SoundLink from '@/components/audio/SoundLink'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <SoundLink
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-card)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--border-glow)] hover:bg-[var(--surface-selected)] hover:text-[var(--accent-green)] active:scale-[0.98]"
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </SoundLink>
  )
}

export function Breadcrumbs({
  items,
  ariaLabel = 'Breadcrumb',
}: {
  items: BreadcrumbItem[]
  ariaLabel?: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] text-[var(--text-muted)]"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-[var(--border-card)]">
              /
            </span>
          )}
          {item.href ? (
            <SoundLink
              href={item.href}
              className="rounded-full px-1 py-0.5 transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--accent-green)]"
            >
              {item.label}
            </SoundLink>
          ) : (
            <span
              aria-current="page"
              className="px-1 py-0.5 font-medium text-[var(--foreground)]"
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function AdventureSteps({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) {
  return (
    <ol
      aria-label={steps.join(' → ')}
      className="flex flex-wrap items-center gap-1"
    >
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current

        return (
          <li key={step} className="flex items-center gap-1">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
                done
                  ? 'bg-[var(--accent-green)] text-[#062016]'
                  : active
                    ? 'border border-[var(--accent-teal)] bg-[var(--surface-selected)] text-[var(--accent-teal)]'
                    : 'bg-[var(--surface-muted)] text-[var(--text-muted)]'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span
              className={`text-[9px] font-medium ${
                active ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]'
              }`}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="h-px w-2 bg-[var(--border-card)]" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
