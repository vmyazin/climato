import { describe, it, expect, vi } from 'vitest'

// Mock both providers before importing the orchestrator.
vi.mock('../providers/open-meteo-archive.js', () => ({
  fetchOpenMeteoArchive: vi.fn(),
}))
vi.mock('../providers/nasa-power-archive.js', () => ({
  fetchNasaPowerArchive: vi.fn(),
}))

import { fetchArchiveNormals } from '../archive.js'
import { fetchOpenMeteoArchive } from '../providers/open-meteo-archive.js'
import { fetchNasaPowerArchive } from '../providers/nasa-power-archive.js'

const fakeDaily = {
  time: ['2023-01-15'],
  temperature_2m_max: [5],
  temperature_2m_min: [-2],
  precipitation_sum: [3],
  sunshine_duration: [3600],
}

describe('fetchArchiveNormals', () => {
  it('uses Open-Meteo when it succeeds', async () => {
    vi.mocked(fetchOpenMeteoArchive).mockResolvedValueOnce(fakeDaily)
    const out = await fetchArchiveNormals(35.6762, 139.6503)
    expect(out.source).toBe('open-meteo')
    expect(out.data.high).toHaveLength(12)
    expect(fetchNasaPowerArchive).not.toHaveBeenCalled()
  })

  it('falls back to NASA POWER on Open-Meteo failure', async () => {
    vi.mocked(fetchOpenMeteoArchive).mockRejectedValueOnce(new Error('500'))
    vi.mocked(fetchNasaPowerArchive).mockResolvedValueOnce(fakeDaily)
    const out = await fetchArchiveNormals(35.6762, 139.6503)
    expect(out.source).toBe('nasa-power')
  })
})
