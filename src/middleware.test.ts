import { describe, expect, it } from 'vitest'
import middleware from '../middleware'

describe('middleware SPA fallback', () => {
  it('rewrites normal compare page requests to the SPA shell', () => {
    const res = middleware(new Request('https://climato.smoxu.com/compare/brazil/santa-catarina/florianopolis/vs/south-africa/cape-town', {
      headers: { 'user-agent': 'Mozilla/5.0' },
    }))

    expect(res.headers.get('x-middleware-rewrite')).toBe('https://climato.smoxu.com/')
  })

  it('rewrites normal non-prerendered city requests to the SPA shell', () => {
    const res = middleware(new Request('https://climato.smoxu.com/usa/chicago', {
      headers: { 'user-agent': 'Mozilla/5.0' },
    }))

    expect(res.headers.get('x-middleware-rewrite')).toBe('https://climato.smoxu.com/')
  })

  it('keeps social bot comparison responses as OG-only HTML', async () => {
    const res = middleware(new Request('https://climato.smoxu.com/compare/japan/tokyo/vs/uk/london', {
      headers: { 'user-agent': 'Twitterbot' },
    }))

    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('Tokyo vs London')
  })
})
