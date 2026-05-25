import { describe, expect, it } from 'vitest'
import { CITIES } from '../data/cities'
import type { City } from '../data/cities'
import { buildComparisonSeoMeta } from './seo'

const SITE = 'https://climato.smoxu.com'

function findCity(id: string): City {
  const c = CITIES.find(city => city.id === id)
  if (!c) throw new Error(`fixture missing: ${id}`)
  return c
}

describe('buildComparisonSeoMeta', () => {
  it('produces a title, description, canonical, og image, and JSON-LD for the pair', () => {
    const tokyo = findCity('tokyo')
    const london = findCity('london')
    const meta = buildComparisonSeoMeta(tokyo, london, tokyo, london, SITE)

    expect(meta.title).toContain('Tokyo')
    expect(meta.title).toContain('London')
    expect(meta.title).toContain('Climato')
    expect(meta.description).toMatch(/Tokyo|London/)
    expect(meta.canonicalUrl).toMatch(/^https:\/\/climato\.smoxu\.com\/compare\//)
    expect(meta.canonicalUrl).toContain('/vs/')
    expect(meta.ogImageUrl).toContain('compare=1')
    expect(meta.ogImageUrl).toContain('aCity=Tokyo')
    expect(meta.ogImageUrl).toContain('bCity=London')
    expect(meta.ogImageUrl.startsWith(SITE)).toBe(true)
  })

  it('builds a BreadcrumbList JSON-LD that names both cities', () => {
    const tokyo = findCity('tokyo')
    const london = findCity('london')
    const meta = buildComparisonSeoMeta(tokyo, london, tokyo, london, SITE)
    const json = JSON.stringify(meta.jsonLd)
    expect(json).toContain('"BreadcrumbList"')
    expect(json).toContain('Tokyo vs London')
    expect(json).toContain('"Dataset"')
  })

  it('uses the resolved canonical when both halves are passed', () => {
    const a = findCity('tokyo')
    const b = findCity('cairo')
    const meta = buildComparisonSeoMeta(a, b, a, b, SITE)
    expect(meta.canonicalUrl).toMatch(/\/compare\/japan\/tokyo\/vs\/egypt\/cairo/)
  })
})
