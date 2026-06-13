import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { products } from '../src/data/products.js'

const root = process.cwd()
const publicDir = path.join(root, 'public')
const reportDir = path.join(root, 'reports', 'product-images')
const reportPath = path.join(reportDir, 'product-image-launch-plan.md')

const highPriorityPatterns = [
  /ppr/i,
  /kanaliz/i,
  /elektr|kabel|provod|avtomat|uzo|rozet|vyklyuch|svet|lampa/i,
  /cement|shtukatur|shpak/i,
  /smesitel/i,
  /vent/i,
  /instrument|drel|shurupovert|perforator|bolgarka|ruletka|uroven|shpatel|sverlo|bur|disk|molotok/i,
]

const highPriorityRoots = new Set(['elektrika', 'ventilyaciya', 'instrument'])
const highPriorityPathSegments = new Set(['ppr-trubalar-fitingder', 'kanalizaciya', 'smesitelder'])

function localPublicFileExists(src) {
  if (!src || !src.startsWith('/')) return true
  return existsSync(path.join(publicDir, src.replace(/^\/+/, '')))
}

function getMainImage(product) {
  const image = product.images?.[0]
  if (!image) return null
  return typeof image === 'string' ? { src: image } : image
}

function expectedWebpFor(product) {
  const image = getMainImage(product)
  return image?.expectedSrc || image?.futureSrc || `/images/products/${product.slug}/main.webp`
}

function getImageStatus(product) {
  const image = getMainImage(product)
  const expectedWebp = expectedWebpFor(product)
  const fallbackSrc = image?.fallbackSrc || image?.fallback || null
  const realLocalWebp = Boolean(expectedWebp?.endsWith('.webp') && localPublicFileExists(expectedWebp))
  const hasProductSvgFallback = Boolean(fallbackSrc?.startsWith(`/images/products/${product.slug}/`) && fallbackSrc.endsWith('.svg'))
  const hasTypedPlaceholder = Boolean(fallbackSrc?.startsWith('/images/placeholders/product-') && fallbackSrc !== '/images/placeholders/product-placeholder.svg')

  if (realLocalWebp) return 'real local WebP'
  if (hasProductSvgFallback || hasTypedPlaceholder) return 'branded placeholder'
  return 'placeholder only'
}

function getPriority(product, status) {
  if (status === 'real local WebP') return 'low'

  const catalogPath = product.catalogPath || []
  const haystack = [product.slug, product.titleKg, product.name, ...catalogPath, ...(product.tags || [])].filter(Boolean).join(' ')
  const isTopCategory = highPriorityRoots.has(catalogPath[0]) || catalogPath.some((slug) => highPriorityPathSegments.has(slug))
  const isTopProduct = highPriorityPatterns.some((pattern) => pattern.test(haystack))

  return isTopCategory || isTopProduct ? 'high' : 'medium'
}

function escapeCell(value) {
  return String(value || '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
}

const rows = products.map((product) => {
  const status = getImageStatus(product)
  return {
    slug: product.slug,
    title: product.titleKg || product.name,
    category: (product.catalogPath || []).join(' / ') || product.categorySlug || 'uncategorized',
    status,
    neededPath: `public/images/products/${product.slug}/main.webp`,
    priority: getPriority(product, status),
  }
})

const summary = rows.reduce(
  (acc, row) => {
    acc.total += 1
    acc.status[row.status] = (acc.status[row.status] || 0) + 1
    acc.priority[row.priority] = (acc.priority[row.priority] || 0) + 1
    return acc
  },
  { total: 0, status: {}, priority: {} },
)

rows.sort((a, b) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const statusOrder = { 'placeholder only': 0, 'branded placeholder': 1, 'real local WebP': 2 }
  return (
    priorityOrder[a.priority] - priorityOrder[b.priority] ||
    statusOrder[a.status] - statusOrder[b.status] ||
    a.category.localeCompare(b.category) ||
    a.slug.localeCompare(b.slug)
  )
})

const markdown = [
  '# Product Image Launch Plan',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'Purpose: prepare StroyRayon product images for commercial launch without adding unverified or copyrighted internet images.',
  '',
  '## Summary',
  `- Products checked: ${summary.total}`,
  `- Real local WebP: ${summary.status['real local WebP'] || 0}`,
  `- Branded placeholder: ${summary.status['branded placeholder'] || 0}`,
  `- Placeholder only: ${summary.status['placeholder only'] || 0}`,
  `- Missing local WebP: ${summary.total - (summary.status['real local WebP'] || 0)}`,
  `- High priority missing photos: ${summary.priority.high || 0}`,
  `- Medium priority missing photos: ${summary.priority.medium || 0}`,
  '',
  '## Priority Categories',
  '- High: ППР, канализация, электрика, цемент/штукатурка, смесители, вентиляция, инструмент.',
  '- Medium: other products without confirmed local WebP.',
  '- Low: products that already have confirmed local WebP.',
  '',
  '## Product Table',
  '',
  '| product slug | product title | category | current image status | needed file path | priority |',
  '|---|---|---|---|---|---|',
  ...rows.map((row) => `| ${escapeCell(row.slug)} | ${escapeCell(row.title)} | ${escapeCell(row.category)} | ${escapeCell(row.status)} | ${escapeCell(row.neededPath)} | ${escapeCell(row.priority)} |`),
  '',
].join('\n')

await mkdir(reportDir, { recursive: true })
await writeFile(reportPath, markdown, 'utf8')

console.log(`Wrote ${path.relative(root, reportPath)}`)
console.log(JSON.stringify(summary, null, 2))
