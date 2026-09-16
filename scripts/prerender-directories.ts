import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { GeoCity } from '../src/data/cities'
import { groupDirectoryCities } from '../src/lib/city-discovery'
import { toSlug } from '../src/lib/slug'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LogoMark } from '../src/components/LogoMark'

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function prerenderDirectories(cities: GeoCity[], baseHtml: string, dist: string, origin: string) {
  const countries = groupDirectoryCities(cities)
  const paths: string[] = []
  const logo = renderToStaticMarkup(createElement(LogoMark, { size: 36 }))
  const css = `<style>body{margin:0;background:#f0f1ed;color:#111;font-family:'Inter Tight',system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:32px 20px 64px}h1{font-size:clamp(36px,6vw,64px);line-height:1.1;margin:32px 0 16px;letter-spacing:-1px}h2{font-size:25px;margin:0 0 20px}a{color:inherit;text-underline-offset:4px}a:hover{color:#a72c16}a:focus-visible{outline:2px solid #cc3b1f;outline-offset:4px}nav{display:flex;gap:16px;flex-wrap:wrap;font-size:15px}section{background:white;border:1px solid #111;padding:24px;margin:24px 0;scroll-margin-top:20px}ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px 24px;list-style:none;padding:0;margin:0}li a{font-size:18px}p{font-size:17px;line-height:1.5;color:#55584f}.regions{padding:18px 0;border-block:1px solid #c9ccc1}.browse-header{height:56px;display:flex;align-items:center;border-bottom:1px solid #111;padding:0 32px}.brand{display:inline-flex;align-items:center;gap:10px;font-size:18px;font-weight:700;letter-spacing:-.5px;text-decoration:none;white-space:nowrap}.brand svg{flex-shrink:0}@media(max-width:767px){.browse-header{height:48px;padding:0 16px}.brand{font-size:17px;gap:8px}.brand svg{width:30px;height:30px}}</style>`
  function emit(path: string, title: string, description: string, content: string) {
    let head = baseHtml.slice(0, baseHtml.indexOf('</head>'))
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)} — Climato</title>`)
      .replace(/<meta\s+(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
    head += `<meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(origin + path)}">${css}</head>`
    const html = `${head}<body><header class="browse-header"><a class="brand" href="/" aria-label="Climato home">${logo}<span>CLIMATO</span></a></header><main><h1>${escape(title)}</h1><p>${escape(description)}</p>${content}</main></body></html>`
    for (const file of [join(dist, `${path}.html`), join(dist, path, 'index.html')]) {
      mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, html)
    }
    paths.push(path)
  }
  for (const country of countries) {
    const sections = country.regions.map(region => `<section id="${escape(region.anchor)}"><h2>${escape(region.name)}</h2><ul>${region.cities.map(city => `<li><a href="${escape(toSlug(city).path)}">${escape(city.name)} →</a></li>`).join('')}</ul></section>`).join('')
    const regionLinks = country.regions.map(r => `<a href="#${escape(r.anchor)}">${escape(r.name)}</a>`).join('')
    emit(country.path, `${country.name} cities`, `Browse monthly climate averages for cities in ${country.name}, grouped by region.`, `<nav aria-label="Country navigation"><a href="/browse">All countries →</a></nav><nav class="regions" aria-label="Regions">${regionLinks}</nav>${sections}`)
  }
  emit('/browse', 'Browse cities by country', 'Explore monthly temperature, rainfall and sunshine averages around the world.', `<section><ul>${countries.map(c => `<li><a href="${escape(c.path)}">${escape(c.name)} →</a></li>`).join('')}</ul></section>`)
  const sitemapPath = join(dist, 'sitemap.xml')
  const sitemap = readFileSync(sitemapPath, 'utf8')
  writeFileSync(sitemapPath, sitemap.replace('</urlset>', `${paths.map(path => `  <url><loc>${escape(origin + path)}</loc></url>`).join('\n')}\n</urlset>`))
  console.log(`[seo] prerendered ${paths.length} country directory pages`)
}
