import { describe, expect, it } from 'vitest'
import { injectPrerenderedCityHtml } from './prerender-html'
import type { CitySeoMeta } from './seo'

describe('injectPrerenderedCityHtml', () => {
  it('replaces default SPA head metadata with route-specific metadata', () => {
    const baseHtml = `<!doctype html>
<html lang="en">
  <head>
    <title>Climato — Monthly Averages</title>
    <meta name="description" content="Default description" />
    <meta property="og:title" content="Default OG" />
    <meta property="og:image" content="/og-image.png" />
    <link rel="icon" href="/favicon.svg" />
  </head>
  <body><div id="root"></div><script type="module" src="/assets/index.js"></script></body>
</html>`
    const meta: CitySeoMeta = {
      title: 'Tokyo Monthly Weather Averages — Climato',
      description: 'Monthly temperature highs, lows, rainfall and sunshine hours for Tokyo, Japan. Average high in August: 31°C.',
      canonicalUrl: 'https://climato.smoxu.com/japan/tokyo',
      ogImageUrl: 'https://climato.smoxu.com/api/og?city=Tokyo',
      jsonLd: { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Monthly Climate Normals — Tokyo' },
    }

    const html = injectPrerenderedCityHtml(baseHtml, meta, '<main><h1>Tokyo</h1></main>')

    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/name="description"/g)).toHaveLength(1)
    expect(html.match(/property="og:title"/g)).toHaveLength(1)
    expect(html).toContain('<title>Tokyo Monthly Weather Averages — Climato</title>')
    expect(html).toContain('<link rel="canonical" href="https://climato.smoxu.com/japan/tokyo">')
    expect(html).toContain('<script id="climato-jsonld" type="application/ld+json">')
    expect(html).toContain('<div id="root"><main><h1>Tokyo</h1></main></div>')
  })
})
