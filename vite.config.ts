import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { CITIES } from './src/data/cities'
import { toSlug } from './src/lib/slug'

function seoFiles(): Plugin {
  return {
    name: 'climato-seo-files',
    apply: 'build',
    generateBundle() {
      const siteUrl = (process.env.VITE_SITE_URL ?? 'https://climato.app').replace(/\/$/, '')
      const lastmod = new Date().toISOString().slice(0, 10)

      const urls = [
        { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'weekly' },
        ...CITIES.map(c => ({
          loc: `${siteUrl}${toSlug(c).path}`,
          priority: '0.8',
          changefreq: 'monthly',
        })),
      ]

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
    },
  }
}

export default defineConfig({
  plugins: [react(), seoFiles()],
})
