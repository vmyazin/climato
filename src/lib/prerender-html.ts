import { JSONLD_ID, type CitySeoMeta } from './seo'

export function injectPrerenderedCityHtml(baseHtml: string, meta: CitySeoMeta, appHtml: string): string {
  const cleaned = removeManagedHeadTags(baseHtml)
  const headTags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Climato">',
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:image" content="${escapeHtml(meta.ogImageUrl)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:type" content="image/png">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(meta.ogImageUrl)}">`,
    `<script id="${JSONLD_ID}" type="application/ld+json">${escapeScriptJson(meta.jsonLd)}</script>`,
  ].join('\n    ')

  return cleaned
    .replace('</head>', `    ${headTags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
}

function removeManagedHeadTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/\s*<meta\s+name=["']description["'][^>]*>\s*/gi, '\n    ')
    .replace(/\s*<meta\s+name=["']twitter:(?:card|title|description|image)["'][^>]*>\s*/gi, '\n    ')
    .replace(/\s*<meta\s+property=["']og:(?:type|site_name|title|description|image|image:width|image:height|image:type)["'][^>]*>\s*/gi, '\n    ')
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, '\n    ')
    .replace(new RegExp(`\\s*<script\\s+id=["']${JSONLD_ID}["'][\\s\\S]*?<\\/script>\\s*`, 'gi'), '\n    ')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeScriptJson(value: object): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
