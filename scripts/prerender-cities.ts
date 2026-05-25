import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { CITIES, type City, type GeoCity, type Normals } from '../src/data/cities'
import { StaticCitySnapshot } from '../src/components/StaticCitySnapshot'
import { findNearest } from '../api/_lib/catalog'
import { buildSeoCityRoutes, type SeoCityInput } from '../src/lib/seo-routes'
import { buildCitySeoMeta } from '../src/lib/seo'
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

function cachedNormalIds(): Set<string> {
  if (!existsSync(normalsDir)) return new Set()
  return new Set(
    readdirSync(normalsDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('.') && file !== '_index.json')
      .map(file => file.replace(/\.json$/, '')),
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
  const eligible = buildSeoCityRoutes(items, cachedIds).filter(route => route.hasCachedNormals && route.cachedNormalsId)

  let rendered = 0
  for (const route of eligible) {
    const normals = readNormals(route.cachedNormalsId!)
    const city: City = { ...route.city, ...normals, source: 'open-meteo' }
    const neighbors = findNearest({ lat: city.lat, lon: city.lon }, 5, city.id)
    const appHtml = renderToStaticMarkup(React.createElement(StaticCitySnapshot, { city, neighbors }))
    const meta = buildCitySeoMeta(city, city, siteUrl, route.path)
    const seedScript = buildPrerenderSeedScript({ city, climate: city, neighbors })
    const html = injectPrerenderedCityHtml(baseHtml, meta, appHtml, seedScript)
    writeRouteHtml(route.path, html)
    rendered++
  }

  console.log(`[seo] prerendered ${rendered} cached city pages from ${cachedIds.size} committed normals`)
}

main()
