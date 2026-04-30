import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { CITIES, type GeoCity } from './src/data/cities'
import { countrySlug, slugify } from './src/lib/slug'

interface CatalogCity extends GeoCity {
  population: number
}

function loadCityCatalog(tsvPath: string): CatalogCity[] {
  if (!existsSync(tsvPath)) {
    console.warn(`[seo] ${tsvPath} not found — sitemap will only cover hand-curated CITIES`)
    return []
  }
  const text = readFileSync(tsvPath, 'utf8')
  const lines = text.split('\n')
  const cities: CatalogCity[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const cols = line.split('\t')
    cities.push({
      id: cols[0],
      name: cols[1],
      country: cols[2],
      ...(cols[4] ? { admin1: cols[4] } : {}),
      lat: parseFloat(cols[6]),
      lon: parseFloat(cols[7]),
      elev: 0,
      population: parseInt(cols[8], 10),
    })
  }
  return cities
}

function priorityFor(population: number, isCurated: boolean): string {
  if (isCurated) return '0.9'
  if (population >= 1_000_000) return '0.9'
  if (population >= 250_000) return '0.7'
  return '0.5'
}

interface SeoCity {
  city: GeoCity
  population: number
  isCurated: boolean
}

/**
 * Build canonical URL paths, including the admin1 segment ONLY when needed
 * to disambiguate cities sharing a name within the same country (e.g. the
 * three US Springfields). Singletons get the short, pretty form.
 */
function canonicalPaths(items: SeoCity[]): Map<SeoCity, string> {
  const groups = new Map<string, SeoCity[]>()
  for (const it of items) {
    const key = countrySlug(it.city.country) + '|' + slugify(it.city.name)
    const arr = groups.get(key) ?? []
    arr.push(it)
    groups.set(key, arr)
  }

  const out = new Map<SeoCity, string>()
  for (const [, group] of groups) {
    const distinctAdmin1s = new Set(
      group.map(g => (g.city.admin1 ? slugify(g.city.admin1) : '')).filter(Boolean),
    )
    const ambiguous = distinctAdmin1s.size > 1
    if (!ambiguous) {
      // Pick representative: prefer curated, then highest population
      const rep = group.find(g => g.isCurated)
        ?? [...group].sort((a, b) => b.population - a.population)[0]
      const cs = countrySlug(rep.city.country)
      const ns = slugify(rep.city.name)
      out.set(rep, `/${cs}/${ns}`)
    } else {
      for (const it of group) {
        const cs = countrySlug(it.city.country)
        const ns = slugify(it.city.name)
        const a1 = it.city.admin1 ? slugify(it.city.admin1) : ''
        out.set(it, a1 && a1 !== ns ? `/${cs}/${a1}/${ns}` : `/${cs}/${ns}`)
      }
    }
  }
  return out
}

function seoFiles(): Plugin {
  return {
    name: 'climato-seo-files',
    apply: 'build',
    generateBundle() {
      const siteUrl = (process.env.VITE_SITE_URL ?? 'https://climato.app').replace(/\/$/, '')
      const lastmod = new Date().toISOString().slice(0, 10)
      const catalog = loadCityCatalog(resolve(__dirname, 'data/cities.tsv'))

      const items: SeoCity[] = [
        ...CITIES.map(c => ({ city: c as GeoCity, population: 0, isCurated: true })),
        ...catalog.map(c => ({ city: c as GeoCity, population: c.population, isCurated: false })),
      ]
      const paths = canonicalPaths(items)

      const seen = new Set<string>()
      const urls: { loc: string; priority: string; changefreq: string }[] = [
        { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'weekly' },
      ]
      for (const it of items) {
        const path = paths.get(it)
        if (!path || seen.has(path)) continue
        seen.add(path)
        urls.push({
          loc: `${siteUrl}${path}`,
          priority: priorityFor(it.population, it.isCurated),
          changefreq: 'monthly',
        })
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

      const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`

      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      console.log(`[seo] sitemap.xml: ${urls.length} URLs (1 root + ${urls.length - 1} cities)`)
    },
  }
}

export default defineConfig({
  plugins: [react(), seoFiles()],
})
