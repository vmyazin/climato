import { describe, it, expect } from 'vitest'
import { monthlySunriseSunset, POLAR_SENTINEL } from '../sun.js'

describe('monthlySunriseSunset', () => {
  it('returns 12 HH:MM entries each for sunrise and sunset', () => {
    const { sunrise, sunset } = monthlySunriseSunset(35.6762, 139.6503)
    expect(sunrise).toHaveLength(12)
    expect(sunset).toHaveLength(12)
    for (const s of [...sunrise, ...sunset]) {
      expect(s).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  it('produces Tokyo-local times (sunrise mid-Jun around 04:25 JST)', () => {
    const { sunrise } = monthlySunriseSunset(35.6762, 139.6503)
    // June is index 5; tolerate ±10 minutes for equation/rounding
    const [hh, mm] = sunrise[5]!.split(':').map(Number)
    const minutes = hh! * 60 + mm!
    expect(minutes).toBeGreaterThan(4 * 60 + 15)
    expect(minutes).toBeLessThan(4 * 60 + 35)
  })

  it('handles polar twilight (Reykjavik in December sunrise after 11:00)', () => {
    const { sunrise } = monthlySunriseSunset(64.1466, -21.9426)
    const [hh] = sunrise[11]!.split(':').map(Number)
    expect(hh).toBeGreaterThanOrEqual(11)
  })

  it('handles a southern-hemisphere city (Buenos Aires Jan sunrise before 07:00 local)', () => {
    const { sunrise } = monthlySunriseSunset(-34.6037, -58.3816)
    const [hh] = sunrise[0]!.split(':').map(Number)
    expect(hh).toBeLessThan(7)
  })

  it('emits POLAR_SENTINEL for polar-day months (Murmansk in June)', () => {
    const { sunrise, sunset } = monthlySunriseSunset(68.97, 33.08)
    expect(sunrise[5]).toBe(POLAR_SENTINEL)
    expect(sunset[5]).toBe(POLAR_SENTINEL)
  })

  it('emits POLAR_SENTINEL for polar-night months (Murmansk in December)', () => {
    const { sunrise, sunset } = monthlySunriseSunset(68.97, 33.08)
    expect(sunrise[11]).toBe(POLAR_SENTINEL)
    expect(sunset[11]).toBe(POLAR_SENTINEL)
  })
})
