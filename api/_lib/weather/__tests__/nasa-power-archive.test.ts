import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeNasaPower } from '../providers/nasa-power-archive.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(resolve(here, 'fixtures/nasa-power-sample.json'), 'utf8'),
)

describe('normalizeNasaPower', () => {
  it('produces parallel arrays in ISO date order', () => {
    const out = normalizeNasaPower(fixture, 35.6762)
    expect(out.time).toEqual(['2023-01-01', '2023-01-02', '2023-07-15'])
    expect(out.temperature_2m_max).toEqual([5.2, 6.1, 30.4])
    expect(out.temperature_2m_min).toEqual([-1.3, -0.8, 22.1])
    expect(out.precipitation_sum).toEqual([0.0, 4.5, 1.1])
  })

  it('derives sunshine_duration from radiation ratio × day length, in seconds', () => {
    const out = normalizeNasaPower(fixture, 35.6762)
    // Day 1: ratio = 1.45/4.20 ≈ 0.345. Tokyo Jan 1 day length ~ 9h36m = 34560s.
    // Expected sunshine ≈ 0.345 × 34560 ≈ 11923s. Allow ±25% slack for day-length approx.
    expect(out.sunshine_duration[0]).toBeGreaterThan(8000)
    expect(out.sunshine_duration[0]).toBeLessThan(16000)
    // Day 2 (overcast): ratio ≈ 0.40/4.10 = 0.098 → small sunshine number.
    expect(out.sunshine_duration[1]).toBeLessThan(out.sunshine_duration[0]!)
  })

  it('clamps the ratio to [0, 1] when the upstream returns weird data', () => {
    const fx = {
      properties: {
        parameter: {
          T2M_MAX: { '20230101': 0 },
          T2M_MIN: { '20230101': 0 },
          PRECTOTCORR: { '20230101': 0 },
          ALLSKY_SFC_SW_DWN: { '20230101': 10 },
          CLRSKY_SFC_SW_DWN: { '20230101': 5 }, // ratio = 2.0
        },
      },
    }
    const out = normalizeNasaPower(fx, 35.6762)
    expect(out.sunshine_duration[0]).toBeLessThanOrEqual(15 * 3600)
  })

  it('handles missing fields by emitting null', () => {
    const fx = {
      properties: {
        parameter: {
          T2M_MAX: { '20230101': 5.0 },
          T2M_MIN: { '20230101': -1 },
          PRECTOTCORR: {},
          ALLSKY_SFC_SW_DWN: {},
          CLRSKY_SFC_SW_DWN: {},
        },
      },
    }
    const out = normalizeNasaPower(fx, 35.6762)
    expect(out.precipitation_sum[0]).toBeNull()
    expect(out.sunshine_duration[0]).toBeNull()
  })
})
