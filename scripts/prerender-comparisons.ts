import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { CITIES, type City, type GeoCity, type Normals } from '../src/data/cities'
import { StaticComparisonSnapshot } from '../src/components/StaticComparisonSnapshot'
import { buildSeoCityRoutes, type SeoCityInput } from '../src/lib/seo-routes'
import { buildComparisonSeoMeta } from '../src/lib/seo'
import { injectPrerenderedCityHtml } from '../src/lib/prerender-html'
import { buildPrerenderSeedScript } from '../src/lib/prerender-seed'
import { toCompareSlug } from '../src/lib/slug'

interface CatalogCity extends GeoCity {
  population: number
}

const root = process.cwd()
const siteUrl = (process.env.VITE_SITE_URL ?? 'https://climato.smoxu.com').replace(/\/$/, '')
const distDir = resolve(root, 'dist')
const normalsDir = resolve(root, 'data/normals')
const catalogPath = resolve(root, 'data/cities.tsv')
const baseHtmlPath = resolve(distDir, 'index.html')

// Cap per-pair rendering to the same top-N used by the sitemap. Keeps the
// build fast and the output set predictable regardless of how many cities
// accumulate in data/normals.
const TOP_N = Number(process.env.PRERENDER_COMPARISON_TOP_N ?? '50')

function loadCityCatalog(tsvPath: string): CatalogCity[] {
  if (!existsSync(tsvPath)) return []
  const text = readFileSync(tsvPath, 'utf8')
  const lines = text.split('\n')
  const cities: CatalogCity[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const cols = line.split('\t')
    cities.push({
      id: cols[0]!, name: cols[1]!, country: cols[2]!,
      ...(cols[4] ? { admin1: cols[4] } : {}),
      lat: parseFloat(cols[6]!), lon: parseFloat(cols[7]!),
      elev: 0, population: parseInt(cols[8]!, 10),
    })
  }
  return cities
}

function cachedNormalIds(): Set<string> {
  if (!existsSync(normalsDir)) return new Set()
  return new Set(
    readdirSync(normalsDir)
      .filter(f => f.endsWith('.json') && !f.startsWith('.') && f !== '_index.json')
      .map(f => f.replace(/\.json$/, '')),
  )
}

function readNormals(id: string): Normals {
  return JSON.parse(readFileSync(resolve(normalsDir, `${id}.json`), 'utf8')) as Normals
}

function writeRouteHtml(path: string, html: string): void {
  const indexPath = join(distDir, path, 'index.html')
  const cleanUrlPath = join(distDir, `${path}.html`)
  mkdirSync(dirname(indexPath), { recursive: true })
  mkdirSync(dirname(cleanUrlPath), { recursive: true })
  writeFileSync(indexPath, html)
  writeFileSync(cleanUrlPath, html)
}

function main() {
  if (!existsSync(baseHtmlPath)) {
    throw new Error(`Missing ${baseHtmlPath}; run vite build before prerendering`)
  }

  const baseHtml = readFileSync(baseHtmlPath, 'utf8')
  const catalog = loadCityCatalog(catalogPath)
  const cachedIds = cachedNormalIds()

  const items: SeoCityInput[] = [
    ...CITIES.map(city => ({ city: city as GeoCity, population: 0, isCurated: true })),
    ...catalog.map(city => ({ city: city as GeoCity, population: city.population, isCurated: false })),
  ]

  // Eligible candidates: cached normals + known route path, ranked by curated-first then population.
  const eligible = buildSeoCityRoutes(items, cachedIds)
    .filter(r => r.hasCachedNormals && r.cachedNormalsId)
    .sort((a, b) =>
      (b.isCurated ? 1 : 0) - (a.isCurated ? 1 : 0) ||
      (b.population ?? 0) - (a.population ?? 0)
    )
    .slice(0, TOP_N)

  const eligibleCities: City[] = eligible.map(r => ({
    ...r.city,
    ...readNormals(r.cachedNormalsId!),
    source: 'open-meteo',
  }))

  let rendered = 0
  let skipped = 0

  for (let i = 0; i < eligibleCities.length; i++) {
    for (let j = i + 1; j < eligibleCities.length; j++) {
      const a = eligibleCities[i]!
      const b = eligibleCities[j]!

      const { path } = toCompareSlug(a, b)
      const outPath = join(distDir, path, 'index.html')
      if (existsSync(outPath)) { skipped++; continue }

      const appHtml = renderToStaticMarkup(React.createElement(StaticComparisonSnapshot, { a, b }))
      const meta = buildComparisonSeoMeta(a, b, a, b, siteUrl)
      const seedScript = buildPrerenderSeedScript({ kind: 'comparison', a, b })
      const html = injectPrerenderedCityHtml(baseHtml, meta, appHtml, seedScript)
      writeRouteHtml(path, html)
      rendered++
    }
  }

  const total = eligibleCities.length * (eligibleCities.length - 1) / 2
  console.log(`[seo] comparison: ${rendered} rendered, ${skipped} already present (${total} pairs from top ${eligibleCities.length} eligible cities)`)
}

main()
