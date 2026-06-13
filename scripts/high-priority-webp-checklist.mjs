import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { products } from '../src/data/products.js'

const root = process.cwd()
const publicDir = path.join(root, 'public')
const sourceReportPath = path.join(root, 'reports', 'product-images', 'product-image-launch-plan.md')
const outputDir = path.join(root, 'reports', 'product-images')
const outputPath = path.join(outputDir, 'high-priority-webp-checklist.md')

function parseMarkdownTable(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| ') && !line.includes('|---'))
    .slice(1)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .map(([slug, title, category, status, requiredPath, priority]) => ({
      slug,
      title,
      category,
      status,
      requiredPath,
      priority,
    }))
}

function localPublicFileExists(src) {
  if (!src || !src.startsWith('/')) return true
  return existsSync(path.join(publicDir, src.replace(/^\/+/, '')))
}

function getMainImage(product) {
  const image = product?.images?.[0]
  if (!image) return null
  return typeof image === 'string' ? { src: image } : image
}

function getRequiredPublicPath(row) {
  return `/${row.requiredPath.replace(/^public[\\/]/, '').replaceAll('\\', '/')}`
}

function recommendedPhotoType(row) {
  const text = `${row.slug} ${row.category} ${row.title}`.toLowerCase()

  if (/(teplyi-pol|mat-teplyi-pol|kabeldik-teplyi-pol|ventilyaciya-kanaly|kanalizaciya-truba|ppr|smesitel|aerator)/.test(text)) {
    return 'installed product'
  }

  if (/(cement|shtukatur|plita|rozetka|ochurguch|lampa|molotok|shpatel|ruletka|uroven|disk|bur|klipsa|kabel-kanal|podrozetnik|raspredkorobka|gofra|izolenta|klemma)/.test(text)) {
    return 'packshot'
  }

  if (/(kabel|provod|sip|shit|avtomat|difavtomat|termoregulyator|datchik|ppr-tutuk-keskich)/.test(text)) {
    return 'technical product photo'
  }

  if (/(instrument|elektrika)/.test(text)) return 'shelf photo'

  return 'technical product photo'
}

function priorityReason(row) {
  const text = `${row.slug} ${row.category} ${row.title}`.toLowerCase()
  const reasons = []

  if (/ppr/.test(text)) reasons.push('ППР is a launch-priority plumbing category')
  if (/kanaliz/.test(text)) reasons.push('канализация is a launch-priority plumbing category')
  if (/(^|[ /-])(elektrika|elektr-teplyi-pol|kabel|provod|rozet|ochurguch|avtomat|difavtomat|lampa|shit|gofra|klemma)/.test(text)) reasons.push('электрика is a launch-priority category')
  if (/(cement|shtukatur|plita)/.test(text)) reasons.push('цемент/штукатурка materials need clear commercial packshots')
  if (/smesitel|aerator/.test(text)) reasons.push('смесители need buyer-readable product visuals')
  if (/ventilyaciya|pvc-vent/.test(text)) reasons.push('вентиляция is a launch-priority category')
  if (/(instrument|drel|shurupovert|bolgarka|molotok|shpatel|ruletka|uroven|bur|disk|keskich)/.test(text)) reasons.push('инструмент is a launch-priority category')
  if (/teplyi-pol|termoregulyator|datchik/.test(text)) reasons.push('warm-floor components are electrical/technical buyer decisions')

  return reasons.length ? reasons.join('; ') : 'high priority in image launch plan'
}

function escapeCell(value) {
  return String(value || '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
}

const sourceMarkdown = readFileSync(sourceReportPath, 'utf8')
const highPriorityRows = parseMarkdownTable(sourceMarkdown).filter((row) => row.priority === 'high')
const productBySlug = new Map(products.map((product) => [product.slug, product]))

const rows = highPriorityRows.map((row) => {
  const product = productBySlug.get(row.slug)
  const image = getMainImage(product)
  const requiredPublicPath = getRequiredPublicPath(row)
  const mappedPath = image?.expectedSrc || image?.futureSrc || `/images/products/${row.slug}/main.webp`
  const fallbackSrc = image?.fallbackSrc || image?.fallback
  const mappingBroken = !product || mappedPath !== requiredPublicPath || !localPublicFileExists(fallbackSrc)

  return {
    ...row,
    recommendedType: recommendedPhotoType(row),
    reason: priorityReason(row),
    notes: 'No watermark; no competitor logo; no blurry image; no wrong product; no cropped-off key part; keep product centered on clean light background.',
    mappingBroken,
    mappingNote: mappingBroken ? `Check mapping: expected ${mappedPath || 'missing'}; fallback ${fallbackSrc || 'missing'}` : 'Mapping OK; add WebP at required path.',
  }
})

const brokenRows = rows.filter((row) => row.mappingBroken)

const markdown = [
  '# High Priority WebP Checklist',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Source: \`reports/product-images/product-image-launch-plan.md\``,
  '',
  '## Summary',
  `- High-priority products needing real WebP: ${rows.length}`,
  `- Product image mapping issues found: ${brokenRows.length}`,
  '- Do not download or add random internet images.',
  '- Use owned photos, supplier-approved packshots, or confirmed open-license images only.',
  '',
  '## Manual WebP Add Workflow',
  '1. Prepare a clean source image: no watermark, no competitor logo/contact, no blurry image, no wrong product.',
  '2. Export as WebP, target 900x675 px, product centered, light/white padding, `object-fit: contain` friendly composition.',
  '3. Save it exactly as `public/images/products/<product-slug>/main.webp`.',
  '4. Do not change product data when the required path already matches the checklist.',
  '5. Run `npm.cmd run validate:catalog`, `npm.cmd run generate:sitemap`, `npm.cmd run lint`, and `npm.cmd run build`.',
  '',
  '## Checklist',
  '',
  '| done | product slug | title | category | current image status | required image path | recommended photo type | priority reason | image quality notes | mapping note |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(
    (row) =>
      `| [ ] | ${escapeCell(row.slug)} | ${escapeCell(row.title)} | ${escapeCell(row.category)} | ${escapeCell(row.status)} | ${escapeCell(row.requiredPath)} | ${escapeCell(row.recommendedType)} | ${escapeCell(row.reason)} | ${escapeCell(row.notes)} | ${escapeCell(row.mappingNote)} |`,
  ),
  '',
].join('\n')

await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, markdown, 'utf8')

console.log(`Wrote ${path.relative(root, outputPath)}`)
console.log(JSON.stringify({ highPriorityCount: rows.length, mappingIssues: brokenRows.length }, null, 2))
