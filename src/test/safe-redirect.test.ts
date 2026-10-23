import { describe, expect, it } from 'vitest'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

const ORIGIN = 'https://eco.example.com'

describe('getSafeRedirectPath', () => {
  it('returns the home page for empty input', () => {
    expect(getSafeRedirectPath(null, ORIGIN)).toBe('/')
    expect(getSafeRedirectPath('', ORIGIN)).toBe('/')
  })

  it('preserves safe relative paths, queries, and hashes', () => {
    expect(getSafeRedirectPath('/region', ORIGIN)).toBe('/region')
    expect(getSafeRedirectPath('/region?tab=missions#level-2', ORIGIN)).toBe(
      '/region?tab=missions#level-2'
    )
    expect(getSafeRedirectPath('region', ORIGIN)).toBe('/region')
  })

  it('accepts absolute same-origin URLs but strips the origin', () => {
    expect(
      getSafeRedirectPath(
        'https://eco.example.com/briefing/west-java/1?difficulty=easy#start',
        ORIGIN
      )
    ).toBe('/briefing/west-java/1?difficulty=easy#start')
  })

  it('rejects cross-origin, protocol-relative, and invalid URLs', () => {
    expect(getSafeRedirectPath('https://evil.example.com/steal', ORIGIN)).toBe('/')
    expect(getSafeRedirectPath('//evil.example.com/steal', ORIGIN)).toBe('/')
    expect(getSafeRedirectPath('javascript:alert(1)', ORIGIN)).toBe('/')
    expect(getSafeRedirectPath('http://[invalid', ORIGIN)).toBe('/')
  })
})
