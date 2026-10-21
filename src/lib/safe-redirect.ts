/**
 * Returns a safe same-origin path for post-auth redirects. Absolute URLs are
 * accepted only when they point at the current origin.
 */
export function getSafeRedirectPath(value: string | null, origin: string) {
  if (!value) return '/'

  try {
    const url = new URL(value, origin)
    if (url.origin !== origin) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}
