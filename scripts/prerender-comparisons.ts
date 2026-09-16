import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { CITIES, type City, type GeoCity, type Normals } from '../src/data/cities'
import { StaticComparisonSnapshot } from '../src/components/StaticComparisonSnapshot'
import { buildSeoCityRoutes, pickComparisonCities, COMPARISON_TOP_N, type SeoCityInput } from '../src/lib/seo-routes'
import { buildComparisonSeoMeta } from '../src/lib/seo'
import { injectPrerenderedCityHtml } from '../src/lib/prerender-html'
import { buildPrerenderSeedScript } from '../src/lib/prerender-seed'

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
const TOP_N = Number(process.env.PRERENDER_COMPARISON_TOP_N ?? String(COMPARISON_TOP_N))

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

// One file per route. `cleanUrls` serves dist/a/b.html at /a/b; the sibling
// dist/a/b/index.html we used to also write was served at /a/b/ as a second
// 200, which Google reported as a duplicate.
function writeRouteHtml(path: string, html: string): void {
  const file = join(distDir, `${path}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
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

  // Same selection the sitemap uses, so the two can't drift apart.
  const eligible = pickComparisonCities(buildSeoCityRoutes(items, cachedIds), TOP_N)

  const eligibleCities: { city: City; path: string }[] = eligible.map(r => ({
    city: { ...r.city, ...readNormals(r.cachedNormalsId!), source: 'open-meteo' },
    path: r.path,
  }))

  let rendered = 0
  let skipped = 0

  for (let i = 0; i < eligibleCities.length; i++) {
    for (let j = i + 1; j < eligibleCities.length; j++) {
      const a = eligibleCities[i]!.city
      const b = eligibleCities[j]!.city

      // Built from the route paths, not the city names, so the URL matches
      // the sitemap entry even where a name variant was merged away.
      const path = `/compare${eligibleCities[i]!.path}/vs${eligibleCities[j]!.path}`
      if (existsSync(join(distDir, `${path}.html`))) { skipped++; continue }

      const appHtml = renderToStaticMarkup(React.createElement(StaticComparisonSnapshot, { a, b }))
      const meta = buildComparisonSeoMeta(a, b, a, b, siteUrl, path)
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
