import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const SITE_URL = 'https://dukansaathi.shop'

const pages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/login', priority: 0.5, changefreq: 'monthly' },
  { path: '/signup', priority: 0.8, changefreq: 'monthly' },
  { path: '/about', priority: 0.7, changefreq: 'monthly' },
  { path: '/features', priority: 0.9, changefreq: 'weekly' },
  { path: '/pricing', priority: 0.9, changefreq: 'weekly' },
  { path: '/security', priority: 0.6, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.3, changefreq: 'monthly' },
  { path: '/faq', priority: 0.8, changefreq: 'weekly' },
  { path: '/help-center', priority: 0.7, changefreq: 'weekly' },
  { path: '/blog', priority: 0.8, changefreq: 'daily' },
  // Landing Pages
  { path: '/inventory-management-software', priority: 0.9, changefreq: 'weekly' },
  { path: '/billing-software', priority: 0.9, changefreq: 'weekly' },
  { path: '/gst-billing-software', priority: 0.9, changefreq: 'weekly' },
  { path: '/stock-management-software', priority: 0.9, changefreq: 'weekly' },
  { path: '/retail-management-software', priority: 0.9, changefreq: 'weekly' },
  { path: '/shop-management-software', priority: 0.9, changefreq: 'weekly' },
  { path: '/inventory-tracking-software', priority: 0.9, changefreq: 'weekly' },
]

function generateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map((page) => {
    return `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  })
  .join('\n')}
</urlset>`

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap)
  console.log('✅ sitemap.xml generated in public directory!')
}

generateSitemap()
