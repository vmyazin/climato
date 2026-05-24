import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeMetNo } from '../providers/met-no-forecast.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(resolve(here, 'fixtures/met-no-sample.json'), 'utf8'),
)

describe('normalizeMetNo', () => {
  it('extracts air_temperature and time from first timeseries entry', () => {
    expect(normalizeMetNo(fixture)).toEqual({
      tempC: 18.2,
      observedAt: '2026-05-24T14:00:00Z',
    })
  })

  it('throws when timeseries is empty', () => {
    expect(() => normalizeMetNo({ properties: { timeseries: [] } })).toThrow(
      /missing|empty/i,
    )
  })

  it('throws when air_temperature is missing', () => {
    expect(() => normalizeMetNo({
      properties: {
        timeseries: [{ time: 'now', data: { instant: { details: {} } } }],
      },
    })).toThrow(/missing/i)
  })
})
