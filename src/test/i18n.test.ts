import { describe, expect, it } from 'vitest'
import { MISSIONS, MISSION_LEVELS, REGIONS } from '@/data/regions'
import {
  createTranslator,
  formatDate,
  formatNumber,
  normalizeLanguage,
  translate,
} from '@/lib/i18n'
import {
  localizeAchievement,
  localizeMission,
  localizeMissionLevel,
  localizeRegion,
  regionDisplayName,
} from '@/lib/i18n-content'
import type { Achievement } from '@/types'

describe('i18n translator', () => {
  it('normalizes unknown languages to Indonesian', () => {
    expect(normalizeLanguage('en')).toBe('en')
    expect(normalizeLanguage('id')).toBe('id')
    expect(normalizeLanguage('fr')).toBe('id')
    expect(normalizeLanguage(undefined)).toBe('id')
  })

  it('keeps Indonesian source copy and translates known English strings', () => {
    expect(translate('id', 'Masuk')).toBe('Masuk')
    expect(translate('en', 'Masuk')).toBe('Sign In')
    expect(translate('en', 'Bahasa Indonesia')).toBe('Bahasa Indonesia')
    expect(translate('en', 'Keluar dari Simulasi?')).toBe('Exit Simulation?')
    expect(translate('en', 'Lanjut Bermain')).toBe('Keep Playing')
    expect(translate('en', 'Keluar Aplikasi')).toBe('Exit App')
    expect(translate('en', 'Keluar dari Aplikasi?')).toBe('Exit App?')
    expect(translate('en', 'Belum ada terjemahan')).toBe('Belum ada terjemahan')
  })

  it('replaces variables and keeps unknown placeholders visible', () => {
    expect(
      translate('en', 'Kirim ulang dalam {seconds} detik', { seconds: 15 })
    ).toBe('Resend in 15 seconds')
    expect(translate('en', 'Level {level}', { level: 3 })).toBe('Level 3')
    expect(translate('en', '{one} dan {two}', { one: 'A' })).toBe('A dan {two}')
  })

  it('creates reusable translators for either language', () => {
    const id = createTranslator('id')
    const en = createTranslator('en')

    expect(id('Pengaturan')).toBe('Pengaturan')
    expect(en('Pengaturan')).toBe('Settings')
    expect(en('Wilayah {number}', { number: 2 })).toBe('Region 2')
  })

  it('formats numbers and dates for the selected language', () => {
    expect(formatNumber(1250, 'id')).toBe('1.250')
    expect(formatNumber(1250, 'en')).toBe('1,250')
    expect(formatDate('2026-10-23T00:00:00.000Z', 'en')).toMatch(/2026/)
    expect(formatDate('2026-10-23T00:00:00.000Z', 'id')).toMatch(/2026/)
  })
})

describe('localized game content', () => {
  it('localizes region names and ecosystem tags in Indonesian only', () => {
    const [westJava] = REGIONS

    expect(localizeRegion(westJava, 'en')).toBe(westJava)
    expect(localizeRegion(westJava, 'id')).toMatchObject({
      name: 'Jawa Barat',
      ecosystem: ['Ekosistem pegunungan', 'Iklim sejuk', 'Restorasi hutan'],
    })
    expect(regionDisplayName('west-java', 'id')).toBe('Jawa Barat')
    expect(regionDisplayName('west-java', 'en')).toBe('West Java')
  })

  it('localizes mission titles, stories, objectives, and rewards', () => {
    const mission = MISSIONS[0]

    expect(localizeMission(mission, 'en')).toBe(mission)
    expect(localizeMission(mission, 'id')).toMatchObject({
      title: 'Inisiatif Pembersihan Sungai',
      location: 'Ekosistem Sungai Bandung',
    })
    expect(localizeMission(mission, 'id').objectives[0].label).toBe(
      'Kurangi polusi air di bawah 20%'
    )
    expect(localizeMission(mission, 'id').rewards[0]).toBe('+250 Poin Riset')
  })

  it('localizes mission level titles and keeps coming-soon levels translated', () => {
    const level = MISSION_LEVELS['west-java'][0]

    expect(localizeMissionLevel(level, 'en')).toBe(level)
    expect(localizeMissionLevel(level, 'id').title).toBe(
      'Inisiatif Pembersihan Sungai'
    )
    expect(
      localizeMissionLevel(
        { ...level, title: 'Coming Soon' },
        'id'
      ).title
    ).toBe('Segera Hadir')
  })

  it('localizes achievement titles and descriptions', () => {
    const achievement: Achievement = {
      id: 'first-mission',
      title: 'First Step',
      description: 'Complete your first mission',
      icon: '🌱',
      conditionType: 'missions_completed',
      conditionValue: 1,
    }

    expect(localizeAchievement(achievement, 'id')).toMatchObject({
      title: 'Langkah Pertama',
      description: 'Selesaikan misi pertamamu',
    })
    expect(localizeAchievement(achievement, 'en')).toMatchObject({
      title: 'First Step',
      description: 'Complete your first mission',
    })
  })
})
