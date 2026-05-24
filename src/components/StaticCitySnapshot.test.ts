import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CITIES } from '../data/cities'
import { StaticCitySnapshot } from './StaticCitySnapshot'

describe('StaticCitySnapshot', () => {
  it('renders crawlable city climate content and nearby canonical anchors', () => {
    const tokyo = CITIES.find(city => city.id === 'tokyo')
    expect(tokyo).toBeDefined()

    const html = renderToStaticMarkup(createElement(StaticCitySnapshot, {
      city: tokyo!,
      neighbors: [
        {
          id: '1848004',
          name: 'Zama',
          country: 'Japan',
          admin1: 'Kanagawa',
          lat: 35.4879,
          lon: 139.3910,
          distance_km: 31,
        },
      ],
    }))

    expect(html).toContain('<h1')
    expect(html).toContain('Tokyo')
    expect(html).toContain('Tokyo has a')
    expect(html).toContain('Monthly climate normals for Tokyo, Japan')
    expect(html).toContain('Nearby Cities')
    expect(html).toContain('href="/japan/kanagawa/zama"')
  })
})
