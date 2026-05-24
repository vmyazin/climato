import { describe, it, expect } from 'vitest'
import { aggregate } from '../normals.js'

const blankDaily = {
  time: ['2023-01-15', '2023-07-15'],
  temperature_2m_max: [5, 30],
  temperature_2m_min: [-2, 22],
  precipitation_sum: [3, 1],
  sunshine_duration: [3600, 36000], // 1h, 10h
}

describe('aggregate', () => {
  it('returns 12 monthly entries for every field', () => {
    const out = aggregate(blankDaily, 35.6762, 139.6503)
    expect(out.high).toHaveLength(12)
    expect(out.low).toHaveLength(12)
    expect(out.precip).toHaveLength(12)
    expect(out.sun).toHaveLength(12)
    expect(out.sunrise).toHaveLength(12)
    expect(out.sunset).toHaveLength(12)
  })

  it('uses local sunrise/sunset (Tokyo June sunrise around 04:25 JST)', () => {
    const out = aggregate(blankDaily, 35.6762, 139.6503)
    const [hh, mm] = out.sunrise[5]!.split(':').map(Number)
    const minutes = hh! * 60 + mm!
    expect(minutes).toBeGreaterThan(4 * 60 + 15)
    expect(minutes).toBeLessThan(4 * 60 + 35)
  })

  it('produces correct January high for Tokyo data', () => {
    const out = aggregate(blankDaily, 35.6762, 139.6503)
    expect(out.high[0]).toBe(5)
    expect(out.high[6]).toBe(30)
  })
})
