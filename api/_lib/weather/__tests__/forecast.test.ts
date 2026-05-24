import { describe, it, expect, vi } from 'vitest'

vi.mock('../providers/open-meteo-forecast.js', () => ({
  fetchOpenMeteoForecast: vi.fn(),
}))
vi.mock('../providers/met-no-forecast.js', () => ({
  fetchMetNoForecast: vi.fn(),
}))

import { fetchCurrentTemp } from '../forecast.js'
import { fetchOpenMeteoForecast } from '../providers/open-meteo-forecast.js'
import { fetchMetNoForecast } from '../providers/met-no-forecast.js'

const sample = { tempC: 18.2, observedAt: '2026-05-24T14:00:00Z' }

describe('fetchCurrentTemp', () => {
  it('uses Open-Meteo when it succeeds', async () => {
    vi.mocked(fetchOpenMeteoForecast).mockResolvedValueOnce(sample)
    const out = await fetchCurrentTemp(35.6762, 139.6503)
    expect(out).toEqual({ data: sample, source: 'open-meteo' })
    expect(fetchMetNoForecast).not.toHaveBeenCalled()
  })

  it('falls back to MET Norway when Open-Meteo fails', async () => {
    vi.mocked(fetchOpenMeteoForecast).mockRejectedValueOnce(new Error('500'))
    vi.mocked(fetchMetNoForecast).mockResolvedValueOnce(sample)
    const out = await fetchCurrentTemp(35.6762, 139.6503)
    expect(out.source).toBe('met-no')
  })
})
