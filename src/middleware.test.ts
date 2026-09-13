import { describe, expect, it } from 'vitest'
import middleware from '../middleware'

describe('prerender delivery', () => {
  const paths = [
    '/algeria/jijel',
    '/compare/usa/new-york/vs/china/tianjin',
    '/uncached/city?@12,34',
    '/',
  ]

  for (const userAgent of ['Mozilla/5.0', 'Googlebot', 'Bingbot', '']) {
    it.each(paths)(`lets filesystem routing handle %s for ${userAgent || 'no user agent'}`, path => {
      const response = middleware(new Request(`https://climato.smoxu.com${path}`, {
        headers: { 'user-agent': userAgent },
      }))
      expect(response.headers.get('x-middleware-rewrite')).toBeNull()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })
  }

  it.each(paths.slice(0, 2))('keeps social preview metadata for %s', async path => {
    const response = middleware(new Request(`https://climato.smoxu.com${path}`, {
      headers: { 'user-agent': 'Twitterbot' },
    }))
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('property="og:image"')
  })

  it('keeps direct image preview redirects', () => {
    const response = middleware(new Request('https://climato.smoxu.com/algeria/jijel/ogimage'))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://climato.smoxu.com/api/og?city=Jijel&country=Algeria')
  })
})
