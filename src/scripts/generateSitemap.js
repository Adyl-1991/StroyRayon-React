import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { siteConfig } from '../config/site.js'
import { catalogTree } from '../data/catalogTree.js'
import { products } from '../data/products.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '../..')
const publicDir = resolve(projectRoot, 'public')
const sitemapPath = resolve(publicDir, 'sitemap.xml')
const robotsPath = resolve(publicDir, 'robots.txt')

const staticRoutes = ['/', '/catalog', '/contacts', '/delivery', '/payment', '/return', '/about', '/privacy', '/blog']

function normalizePath(path) {
  if (path === '/') return '/'
  return `/${String(path).replace(/^\/+|\/+$/g, '')}`
}

function absoluteUrl(path) {
  return `${siteConfig.siteUrl}${normalizePath(path) === '/' ? '' : normalizePath(path)}`
}

function collectCatalogRoutes(nodes, parentPath = []) {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.slug]
    return [`/catalog/${path.join('/')}`, ...collectCatalogRoutes(node.children || [], path)]
  })
}

function validateRoutes(routes) {
  const warnings = []
  const duplicates = routes.filter((route, index) => routes.indexOf(route) !== index)

  if (duplicates.length) {
    warnings.push(`Duplicate sitemap routes: ${[...new Set(duplicates)].join(', ')}`)
  }

  routes.forEach((route) => {
    if (!route || !route.startsWith('/')) warnings.push(`Invalid sitemap route: ${route}`)
  })

  products.forEach((product) => {
    if (!product.slug || !product.titleKg) warnings.push(`${product.id}: empty product slug/title for sitemap`)
  })

  return warnings
}

export function getSitemapRoutes() {
  const catalogRoutes = collectCatalogRoutes(catalogTree)
  const productRoutes = products.map((product) => `/product/${product.slug}`)
  return [...new Set([...staticRoutes, ...catalogRoutes, ...productRoutes].map(normalizePath))]
}

function buildSitemapXml(routes) {
  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${absoluteUrl(route)}</loc>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl('/sitemap.xml')}
`
}

export async function generateSitemap() {
  const routes = getSitemapRoutes()
  const warnings = validateRoutes(routes)

  await mkdir(publicDir, { recursive: true })
  await writeFile(sitemapPath, buildSitemapXml(routes), 'utf8')
  await writeFile(robotsPath, buildRobotsTxt(), 'utf8')

  return { routes, warnings }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { routes, warnings } = await generateSitemap()

  warnings.forEach((warning) => console.warn(`[sitemap] ${warning}`))
  console.log(`Generated sitemap.xml with ${routes.length} URLs`)
  console.log(`Sitemap warnings: ${warnings.length}`)
}
