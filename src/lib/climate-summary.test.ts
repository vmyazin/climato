import { describe, expect, it } from 'vitest'
import { CITIES, type City } from '../data/cities'
import { compareCities } from './comparison'
import { monthlySuitability } from './climate-summary'

const florianopolisCurrentNormals: City = {
  id: '3463237',
  name: 'Florianópolis',
  country: 'Brazil',
  admin1: 'Santa Catarina',
  lat: -27.5967,
  lon: -48.5492,
  elev: 5,
  high: [28.7, 28.3, 27.2, 25.3, 22.5, 20.8, 20.3, 21, 22.2, 23.3, 24.7, 27],
  low: [22.8, 22.3, 21.7, 19.5, 16.7, 14.4, 13.9, 14.5, 16.5, 18, 19.1, 21.2],
  precip: [171, 182, 143, 79, 122, 120, 66, 85, 117, 156, 133, 160],
  sun: [10, 10.4, 9.5, 8.8, 7.8, 7.3, 7.9, 8.3, 7.8, 7.3, 9.1, 9.9],
  sunrise: ['05:32', '05:57', '06:14', '06:31', '06:47', '07:02', '07:03', '06:44', '06:11', '05:38', '05:14', '05:13'],
  sunset: ['19:14', '18:58', '18:31', '17:57', '17:33', '17:26', '17:36', '17:52', '18:06', '18:21', '18:43', '19:05'],
}

describe('monthlySuitability', () => {
  it('does not classify Florianópolis winter as ideal beach-travel weather', () => {
    const scores = monthlySuitability(florianopolisCurrentNormals)

    expect(scores[6]).toBeLessThan(3)
    expect(scores[7]).toBeLessThan(3)
    expect(scores[10]).toBe(3)
  })
})

describe('compareCities', () => {
  it('does not report Moscow and Florianópolis as both ideal in July-August', () => {
    const moscow = CITIES.find(city => city.id === 'moscow')
    expect(moscow).toBeDefined()

    const result = compareCities(moscow!, florianopolisCurrentNormals)

    expect(result.overlapMonths).not.toContain(6)
    expect(result.overlapMonths).not.toContain(7)
    expect(result.overlapFormatted).not.toBe('July–August')
  })
})
