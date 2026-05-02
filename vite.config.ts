import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
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
      const siteUrl = (process.env.VITE_SITE_URL ?? 'https://climato.smoxu.com').replace(/\/$/, '')
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

      // Bake committed climate normals into the bundle. Cache hits are served
      // from /normals/{id}.json by the CDN; the API route is only invoked on
      // a cold cache.
      const normalsDir = resolve(__dirname, 'data/normals')
      if (existsSync(normalsDir)) {
        let count = 0
        for (const file of readdirSync(normalsDir)) {
          if (!file.endsWith('.json')) continue
          // Skip dotfiles and bookkeeping (.gitkeep). The drain index
          // (_index.json) IS exposed at /normals/_index.json so the admin
          // page can introspect what's been ingested without a function.
          if (file.startsWith('.')) continue
          const source = readFileSync(resolve(normalsDir, file), 'utf8')
          this.emitFile({ type: 'asset', fileName: `normals/${file}`, source })
          count++
        }
        console.log(`[seo] normals: ${count} cached cities (incl. _index.json)`)
      }
    },
  }
}

// Mount Vercel-style /api/* handlers during `vite dev` so the dev server
// matches production. Each route loads the corresponding api/*.ts module
// via SSR and invokes it with a minimal Express-like (req, res) shim.
interface DevApiRoute {
  path: string
  module: string
  defaultContentType?: string
}

async function readRawBody(req: import('node:http').IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function devApiRoutes(routes: DevApiRoute[]): Plugin {
  return {
    name: 'climato-dev-api-routes',
    apply: 'serve',
    configureServer(server) {
      for (const route of routes) {
        server.middlewares.use(route.path, async (req, res) => {
          const { default: handler } = await server.ssrLoadModule(route.module)
          let statusCode = 200
          let body = ''
          const headers: Record<string, string | string[]> = {}
          const shimRes = {
            status(code: number) { statusCode = code; return shimRes },
            setHeader(name: string, value: string | string[]) { headers[name] = value },
            json(payload: unknown) { body = JSON.stringify(payload) },
            send(payload: string) { body = payload },
          }
          const rawBody = req.method && req.method !== 'GET' && req.method !== 'HEAD'
            ? await readRawBody(req)
            : undefined
          try {
            await handler(
              { url: req.url, method: req.method, headers: req.headers, rawBody },
              shimRes,
            )
          } catch (err) {
            statusCode = 500
            body = JSON.stringify({ error: String(err) })
          }
          for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
          if (!headers['Content-Type']) {
            res.setHeader('Content-Type', route.defaultContentType ?? 'application/json')
          }
          res.statusCode = statusCode
          res.end(body)
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    seoFiles(),
    devApiRoutes([
      { path: '/api/normals', module: '/api/normals.ts' },
      { path: '/api/admin',   module: '/api/admin.ts',   defaultContentType: 'text/html; charset=utf-8' },
      { path: '/admin',       module: '/api/admin.ts',   defaultContentType: 'text/html; charset=utf-8' },
    ]),
  ],
})
