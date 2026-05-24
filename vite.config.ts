import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { CITIES, type GeoCity } from './src/data/cities'
import { buildSeoCityRoutes, priorityFor, type SeoCityInput } from './src/lib/seo-routes'

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

interface NormalsIndexEntry {
  fetched_at: string
  name?: string
  country?: string
  admin1?: string
}

function loadNormalsIndex(p: string): Record<string, NormalsIndexEntry> {
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return {}
  }
}

function seoFiles(): Plugin {
  return {
    name: 'climato-seo-files',
    apply: 'build',
    generateBundle() {
      const siteUrl = (process.env.VITE_SITE_URL ?? 'https://climato.smoxu.com').replace(/\/$/, '')
      const buildDate = new Date().toISOString().slice(0, 10)
      const catalog = loadCityCatalog(resolve(__dirname, 'data/cities.tsv'))
      // Per-city lastmod: when this city's climate data was last fetched
      // (drained from Upstash → committed to data/normals/). Falls back to
      // the build date for cities never visited yet. Google uses lastmod to
      // prioritise crawling pages that have actually changed.
      const normalsIndex = loadNormalsIndex(resolve(__dirname, 'data/normals/_index.json'))

      const items: SeoCityInput[] = [
        ...CITIES.map(c => ({ city: c as GeoCity, population: 0, isCurated: true })),
        ...catalog.map(c => ({ city: c as GeoCity, population: c.population, isCurated: false })),
      ]
      const routes = buildSeoCityRoutes(items)
      const pathsById = new Map(routes.map(route => [route.city.id, route.path]))

      const seen = new Set<string>()
      const urls: { loc: string; priority: string; changefreq: string; lastmod: string }[] = [
        { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'weekly', lastmod: buildDate },
      ]
      for (const it of routes) {
        const path = it.path
        if (!path || seen.has(path)) continue
        seen.add(path)
        const entry = normalsIndex[it.city.id]
        const lastmod = entry?.fetched_at?.slice(0, 10) ?? buildDate
        urls.push({
          loc: `${siteUrl}${path}`,
          priority: priorityFor(it.population, it.isCurated),
          changefreq: 'monthly',
          lastmod,
        })
      }

      // Comparison pages: pre-generate the top 50 × 50 = 1225 unique pairs
      // so Google can crawl them on first index. Lower priority (0.5) than
      // single-city pages since they're a derivative surface. Uncatalogued
      // pairs fall back to on-demand generation (the SPA handles any pair
      // at runtime, just not in the sitemap).
      const TOP_N_FOR_COMPARISON = 50
      const top = [...items]
        .sort((a, b) =>
          (b.isCurated ? 1 : 0) - (a.isCurated ? 1 : 0) || b.population - a.population
        )
        .slice(0, TOP_N_FOR_COMPARISON)

      let comparisonCount = 0
      for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
          const aPath = pathsById.get(top[i].city.id)
          const bPath = pathsById.get(top[j].city.id)
          if (!aPath || !bPath) continue
          urls.push({
            loc: `${siteUrl}/compare${aPath}/vs${bPath}`,
            priority: '0.5',
            changefreq: 'monthly',
            lastmod: buildDate,
          })
          comparisonCount++
        }
      }

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
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
      console.log(`[seo] sitemap.xml: ${urls.length} URLs (1 root + ${urls.length - 1 - comparisonCount} cities + ${comparisonCount} comparison pairs)`)

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

function previewCleanUrls(): Plugin {
  return {
    name: 'climato-preview-clean-urls',
    apply: 'serve',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
        if (pathname === '/' || pathname.endsWith('/') || pathname.includes('.')) return next()
        const file = resolve(__dirname, 'dist', `${pathname.slice(1)}.html`)
        if (!existsSync(file)) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(file))
      })
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

// Merge .env.local (and other .env* files) into process.env so that
// server-side code running inside the Vite dev SSR context — i.e. the
// api/* handlers mounted by devApiRoutes — can read secrets like
// ADMIN_PASSWORD via process.env without needing them in the shell.
// The empty prefix string tells loadEnv to return all variables, not
// just the VITE_-prefixed ones. This only runs during `pnpm dev`; the
// Vercel production environment injects vars directly.
const localEnv = loadEnv('development', process.cwd(), '')
Object.assign(process.env, localEnv)

export default defineConfig({
  plugins: [
    react(),
    seoFiles(),
    previewCleanUrls(),
    devApiRoutes([
      { path: '/api/normals', module: '/api/normals.ts' },
      { path: '/api/current', module: '/api/current.ts' },
      { path: '/api/nearby',  module: '/api/nearby.ts' },
      { path: '/api/admin',   module: '/api/admin.ts',   defaultContentType: 'text/html; charset=utf-8' },
      { path: '/admin',       module: '/api/admin.ts',   defaultContentType: 'text/html; charset=utf-8' },
    ]),
  ],
})
