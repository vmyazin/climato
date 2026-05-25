// scripts/__tests__/backfill-largest-cities.test.ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  applyIndexUpdates,
  buildIndexUpdate,
  isPreferredRegionCountry,
  loadIndex,
  parseCitiesTsv,
  selectBackfillCandidates,
  type CityRow,
} from '../backfill-largest-cities-lib.js'

const FIXTURE_HEADER =
  'geonames_id\tname\tcountry\tcountry_code\tadmin1\tadmin1_code\tlat\tlon\tpopulation\ttimezone\tiata\tbooking_dest_id\n'

function row(
  id: string,
  name: string,
  country: string,
  countryCode: string,
  lat: number,
  lon: number,
  population: number,
  admin1 = '',
): string {
  return `${id}\t${name}\t${country}\t${countryCode}\t${admin1}\t\t${lat}\t${lon}\t${population}\t\t\t\n`
}

describe('isPreferredRegionCountry', () => {
  it('includes Americas, East/Southeast Asia, and Europe (TR/RU)', () => {
    expect(isPreferredRegionCountry('US')).toBe(true)
    expect(isPreferredRegionCountry('BR')).toBe(true)
    expect(isPreferredRegionCountry('CN')).toBe(true)
    expect(isPreferredRegionCountry('JP')).toBe(true)
    expect(isPreferredRegionCountry('DE')).toBe(true)
    expect(isPreferredRegionCountry('TR')).toBe(true)
    expect(isPreferredRegionCountry('RU')).toBe(true)
    expect(isPreferredRegionCountry('NG')).toBe(false)
    expect(isPreferredRegionCountry('IN')).toBe(false)
  })
})

describe('selectBackfillCandidates', () => {
  const cities: CityRow[] = parseCitiesTsv(
    FIXTURE_HEADER
      + row('1', 'Tokyo', 'Japan', 'JP', 35.6762, 139.6503, 14_000_000)
      + row('2', 'Lagos', 'Nigeria', 'NG', 6.4541, 3.3947, 15_000_000)
      + row('3', 'Paris', 'France', 'FR', 48.8566, 2.3522, 2_100_000)
      + row('4', 'Berlin', 'Germany', 'DE', 52.52, 13.405, 3_600_000)
      + row('5', 'Cached City', 'Spain', 'ES', 40.4168, -3.7038, 3_200_000),
  )

  it('excludes already cached ids', () => {
    const cached = new Set(['5'])
    const selected = selectBackfillCandidates(cities, cached, 10)
    expect(selected.some(city => city.id === '5')).toBe(false)
  })

  it('filters to preferred regions', () => {
    const selected = selectBackfillCandidates(cities, new Set(), 10)
    expect(selected.map(city => city.id)).toEqual(['1', '4', '5', '3'])
    expect(selected.some(city => city.id === '2')).toBe(false)
  })

  it('sorts by population descending', () => {
    const selected = selectBackfillCandidates(cities, new Set(), 10)
    expect(selected.map(city => city.id)).toEqual(['1', '4', '5', '3'])
  })

  it('respects LIMIT', () => {
    const selected = selectBackfillCandidates(cities, new Set(), 2)
    expect(selected).toHaveLength(2)
    expect(selected.map(city => city.id)).toEqual(['1', '4'])
  })
})

describe('applyIndexUpdates', () => {
  it('preserves unrelated existing _index.json entries', () => {
    const index = {
      '999': {
        fetched_at: '2026-01-01T00:00:00.000Z',
        name: 'Existing',
        country: 'France',
      },
    }
    const next = applyIndexUpdates(index, [{
      id: '100',
      name: 'Paris',
      country: 'France',
      fetchedAt: '2026-05-25T00:00:00.000Z',
    }])
    expect(next['999']).toEqual(index['999'])
    expect(next['100']?.name).toBe('Paris')
  })

  it('writes metadata for new ids', () => {
    const next = applyIndexUpdates({}, [{
      id: '2643743',
      name: 'London',
      country: 'United Kingdom',
      admin1: 'England',
      fetchedAt: '2026-05-25T12:00:00.000Z',
    }])
    expect(next['2643743']).toEqual({
      fetched_at: '2026-05-25T12:00:00.000Z',
      name: 'London',
      country: 'United Kingdom',
      admin1: 'England',
    })
  })

  it('does not leave missing name or country', () => {
    expect(() => applyIndexUpdates({}, [{
      id: '1',
      name: '',
      country: 'France',
      fetchedAt: '2026-05-25T00:00:00.000Z',
    }])).toThrow(/missing name or country/)

    expect(() => applyIndexUpdates({}, [{
      id: '1',
      name: 'Paris',
      country: '',
      fetchedAt: '2026-05-25T00:00:00.000Z',
    }])).toThrow(/missing name or country/)
  })
})

describe('loadIndex', () => {
  it('throws when an existing _index.json cannot be parsed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'climato-index-'))
    const path = join(dir, '_index.json')
    writeFileSync(path, '{not json')

    try {
      expect(() => loadIndex(path)).toThrow(/failed to parse normals index/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('buildIndexUpdate', () => {
  const validCity: CityRow = {
    id: '2643743',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    admin1: 'England',
    lat: 51.5074,
    lon: -0.1278,
    population: 8_799_800,
  }

  it('builds metadata for a valid city before the runner fetches normals', () => {
    expect(buildIndexUpdate(validCity, '2026-05-25T00:00:00.000Z')).toEqual({
      id: '2643743',
      name: 'London',
      country: 'United Kingdom',
      admin1: 'England',
      fetchedAt: '2026-05-25T00:00:00.000Z',
    })
  })

  it('rejects missing city metadata before the runner writes a normals file', () => {
    expect(() => buildIndexUpdate({
      ...validCity,
      name: '',
    }, '2026-05-25T00:00:00.000Z')).toThrow(/missing name or country/)

    expect(() => buildIndexUpdate({
      ...validCity,
      country: '',
    }, '2026-05-25T00:00:00.000Z')).toThrow(/missing name or country/)
  })
})
