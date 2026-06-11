import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { catalogTree } from '../src/data/catalogTree.js'
import { products } from '../src/data/products.js'
import { legacyProductSlugAliases } from '../src/services/productService.js'

const root = process.cwd()
const reportDir = path.join(root, 'reports', 'production-audit')
const publicDir = path.join(root, 'public')

const staticRoutes = ['/', '/catalog', '/contacts', '/delivery', '/payment', '/return', '/about', '/privacy', '/blog']
const requiredCommercialRoutes = ['/contacts', '/delivery', '/payment', '/return', '/about', '/privacy']
const knownLegacyProductRoutes = ['/product/kabel-vvgng', '/product/gips-shtukaturka', '/product/smesitel-kuhnya']
const genericDescriptionPatterns = [/сапаттуу товар/i, /курулуш үчүн колдонулат/i, /жакшы материал/i]
const requiredVisualViewportLabels = [
  'Mobile 360x800',
  'Mobile 390x844',
  'Mobile 430x932',
  'Tablet 768x1024',
  'Desktop 1024x900',
  'Desktop 1440x1200',
]

function flattenCatalog(nodes, parentPath = []) {
  return nodes.flatMap((node) => {
    const nodePath = [...parentPath, node.slug]
    return [{ node, path: nodePath }, ...flattenCatalog(node.children || [], nodePath)]
  })
}

function descendantSlugs(node) {
  return [node.slug, ...(node.children || []).flatMap((child) => descendantSlugs(child))]
}

function productsForNode(node) {
  const slugs = descendantSlugs(node)
  const tags = node.productTags || []

  return products.filter((product) => {
    const pathMatch = product.catalogPath?.some((slug) => slugs.includes(slug))
    const tagMatch = tags.some((tag) => product.tags?.includes(tag))
    return pathMatch || tagMatch
  })
}

function localPublicFileExists(src) {
  if (!src || !src.startsWith('/')) return true
  return existsSync(path.join(publicDir, src.replace(/^\/+/, '')))
}

function getMainImage(product) {
  const image = product.images?.[0]
  if (!image) return null
  return typeof image === 'string' ? { src: image } : image
}

function hasRealImage(product) {
  const image = getMainImage(product)
  return Boolean(image?.src && image.src.endsWith('.webp') && localPublicFileExists(image.src))
}

function expectedWebpFor(product) {
  const image = getMainImage(product)
  return image?.expectedSrc || image?.futureSrc || `/images/products/${product.slug}/main.webp`
}

function getImageStatus(product) {
  const image = getMainImage(product)
  const expectedWebp = expectedWebpFor(product)
  const fallbackSrc = image?.fallbackSrc || image?.fallback || null
  const realImageExists = Boolean(expectedWebp?.endsWith('.webp') && localPublicFileExists(expectedWebp))
  const fallbackExists = Boolean(fallbackSrc && localPublicFileExists(fallbackSrc))
  const hasProductSvgFallback = Boolean(fallbackSrc?.startsWith(`/images/products/${product.slug}/`) && fallbackSrc.endsWith('.svg'))
  const hasTypedPlaceholder = Boolean(fallbackSrc?.startsWith('/images/placeholders/product-') && fallbackSrc !== '/images/placeholders/product-placeholder.svg')
  const missingLocalWebp = Boolean(expectedWebp?.endsWith('.webp') && !localPublicFileExists(expectedWebp))

  let status = 'placeholder гана'
  if (realImageExists) status = 'real image бар'
  else if (hasProductSvgFallback || hasTypedPlaceholder) status = 'branded placeholder'

  return {
    slug: product.slug,
    titleKg: product.titleKg,
    catalogPath: product.catalogPath || [],
    status,
    missingLocalWebp,
    mainSrc: image?.src || null,
    expectedWebp,
    fallbackSrc,
    fallbackExists,
  }
}

function hasReadyDescription(product) {
  const description = product.descriptionKg || product.description || ''
  return description.trim().length >= 180 && !genericDescriptionPatterns.some((pattern) => pattern.test(description))
}

function hasReadySeo(product) {
  return Boolean(product.seoTitleKg && product.seoDescriptionKg && product.seoDescriptionKg.length >= 120)
}

function hasReadyFaq(product) {
  return Array.isArray(product.faqKg) && product.faqKg.length >= 2
}

function hasReadyAliases(product) {
  return Array.isArray(product.aliases) && product.aliases.length >= 6
}

function checkVariantPrices(product) {
  if (!Array.isArray(product.variants) || product.variants.length < 2) return null
  const prices = product.variants.map((variant) => Number(variant.price))
  const isIncreasing = prices.every((price, index) => index === 0 || price >= prices[index - 1])
  return isIncreasing ? null : product.slug
}

function checkProductCompleteness(product) {
  const issues = []
  const description = product.descriptionKg || product.description || ''

  if (!product.titleKg) issues.push('missing titleKg')
  if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) issues.push('missing positive price')
  if (!product.unit) issues.push('missing unit')
  if (description.trim().length < 70) issues.push('short description')
  if (genericDescriptionPatterns.some((pattern) => pattern.test(description))) issues.push('generic description')
  if (!product.recommendedUseKg) issues.push('missing usage notes')
  if (!product.packageInfoKg && !product.minOrder && !product.variants?.some((variant) => variant.packageInfo)) issues.push('missing package/min order info')
  if (!product.specs || !Object.keys(product.specs).length) issues.push('missing specs')
  if (!Array.isArray(product.faqKg)) issues.push('faqKg not array')
  if (!Array.isArray(product.aliases) || product.aliases.length < 2) issues.push('weak search aliases')
  if (!Array.isArray(product.catalogPath) || !product.catalogPath.length) issues.push('missing catalogPath')
  if (!getMainImage(product)) issues.push('missing image entry')
  if (getMainImage(product) && !localPublicFileExists(getMainImage(product).src) && !localPublicFileExists(getMainImage(product).fallbackSrc)) {
    issues.push('broken image and fallback')
  }

  ;(product.variants || []).forEach((variant) => {
    if (!variant.id || !variant.size || !variant.sku || !variant.unit || !variant.packageInfo) {
      issues.push(`variant incomplete: ${variant.id || variant.size || 'unknown'}`)
    }
    if (!Number.isFinite(Number(variant.price)) || Number(variant.price) <= 0) {
      issues.push(`variant missing positive price: ${variant.id || variant.size || 'unknown'}`)
    }
  })

  return issues
}

async function readSitemapRoutes() {
  const sitemapPath = path.join(publicDir, 'sitemap.xml')
  if (!existsSync(sitemapPath)) return []
  const xml = await readFile(sitemapPath, 'utf8')
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname || '/')
}

async function readVisualSummary() {
  const summaryPath = path.join(root, 'reports', 'visual-audit', 'visual-audit-summary.json')
  if (!existsSync(summaryPath)) {
    return {
      screenshotCount: 0,
      brokenImages: null,
      viewportLabels: [],
      missingRequiredViewports: requiredVisualViewportLabels,
    }
  }

  const summary = JSON.parse(await readFile(summaryPath, 'utf8'))
  const viewportLabels = [
    ...new Set((summary.results || []).flatMap((group) => (group.captures || []).map((capture) => capture.viewportLabel))),
  ]

  return {
    screenshotCount: Number(summary.screenshotCount || 0),
    brokenImages: Number(summary.brokenImages || 0),
    viewportLabels,
    missingRequiredViewports: requiredVisualViewportLabels.filter((label) => !viewportLabels.includes(label)),
  }
}

function routeExistsInSource(route) {
  if (route === '/') return true
  const routePath = route.replace(/^\//, '')
  const routerText = existsSync(path.join(root, 'src', 'app', 'router.jsx'))
    ? String(readFileSyncCompat(path.join(root, 'src', 'app', 'router.jsx')))
    : ''
  return routerText.includes(`path: '${routePath}'`)
}

function readFileSyncCompat(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
}

function markdownList(items, emptyText = 'None') {
  if (!items.length) return `- ${emptyText}`
  return items.map((item) => `- ${item}`).join('\n')
}

async function main() {
  await mkdir(reportDir, { recursive: true })

  const flatCatalog = flattenCatalog(catalogTree)
  const emptyCatalogNodes = flatCatalog
    .filter(({ node }) => productsForNode(node).length === 0)
    .map(({ path: nodePath, node }) => `${nodePath.join('/')} (${node.titleKg})`)

  const productIssueEntries = products
    .map((product) => ({ slug: product.slug, issues: checkProductCompleteness(product) }))
    .filter((entry) => entry.issues.length)

  const missingRealImageProducts = products
    .filter((product) => !hasRealImage(product))
    .map((product) => product.slug)

  const imageStatusEntries = products.map(getImageStatus)
  const imageStatusCounts = imageStatusEntries.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1
    if (item.missingLocalWebp) counts['missing local WebP'] = (counts['missing local WebP'] || 0) + 1
    return counts
  }, {})

  const brokenImageProducts = products
    .filter((product) => {
      const image = getMainImage(product)
      return image?.src && !localPublicFileExists(image.src) && !localPublicFileExists(image.fallbackSrc)
    })
    .map((product) => product.slug)

  const variantPriceOrderIssues = products.map(checkVariantPrices).filter(Boolean)
  const sitemapRoutes = await readSitemapRoutes()
  const visualSummary = await readVisualSummary()
  const sitemapMissingStaticRoutes = staticRoutes.filter((route) => !sitemapRoutes.includes(route))
  const aliasMappings = Object.entries(legacyProductSlugAliases).map(([legacy, current]) => `/product/${legacy} -> /product/${current}`)
  const missingCommercialRoutes = requiredCommercialRoutes.filter((route) => !routeExistsInSource(route))
  const legacyAliasMissing = knownLegacyProductRoutes.filter((route) => !legacyProductSlugAliases[route.replace('/product/', '')])

  const summary = {
    generatedAt: new Date().toISOString(),
    catalog: {
      rootCategories: catalogTree.length,
      totalNodes: flatCatalog.length,
      emptyNodes: emptyCatalogNodes.length,
    },
    products: {
      total: products.length,
      withVariants: products.filter((product) => product.variants?.length).length,
      descriptionReadyCount: products.filter(hasReadyDescription).length,
      seoReadyCount: products.filter(hasReadySeo).length,
      faqReadyCount: products.filter(hasReadyFaq).length,
      aliasReadyCount: products.filter(hasReadyAliases).length,
      productIssueCount: productIssueEntries.length,
      missingRealImageCount: missingRealImageProducts.length,
      brokenImageCount: brokenImageProducts.length,
      variantPriceOrderIssueCount: variantPriceOrderIssues.length,
      imageStatusCounts,
    },
    routes: {
      staticRoutes,
      requiredCommercialRoutes,
      missingCommercialRoutes,
      legacyAliases: aliasMappings,
      legacyAliasMissing,
    },
    sitemap: {
      urlCount: sitemapRoutes.length,
      missingStaticRoutes: sitemapMissingStaticRoutes,
      legacyAliasesInSitemap: knownLegacyProductRoutes.filter((route) => sitemapRoutes.includes(route)),
    },
    visual: visualSummary,
    findings: {
      emptyCatalogNodes,
      productIssueEntries,
      missingRealImageProducts,
      imageStatusEntries,
      brokenImageProducts,
      variantPriceOrderIssues,
    },
  }

  const imageStatusMarkdown = `# Product Image Status

Generated: ${summary.generatedAt}

## Summary
- Products checked: ${summary.products.total}
- Real local WebP: ${summary.products.imageStatusCounts['real image бар'] || 0}
- Branded placeholder: ${summary.products.imageStatusCounts['branded placeholder'] || 0}
- Placeholder only: ${summary.products.imageStatusCounts['placeholder гана'] || 0}
- Missing local WebP: ${summary.products.imageStatusCounts['missing local WebP'] || 0}
- Broken image fallback: ${summary.products.brokenImageCount}

## Products
${imageStatusEntries
  .map((item) => `- ${item.slug}: ${item.status}${item.missingLocalWebp ? '; missing local WebP' : ''}; fallback ${item.fallbackExists ? 'ok' : 'missing'}; future ${item.expectedWebp}`)
  .join('\n')}
`

  const markdown = `# StroyRayon Production Audit

Generated: ${summary.generatedAt}

## Critical Issues
${markdownList([
  ...missingCommercialRoutes.map((route) => `Commercial route missing in router: ${route}`),
  ...brokenImageProducts.map((slug) => `Broken product image without usable fallback: ${slug}`),
  ...legacyAliasMissing.map((route) => `Legacy product alias missing: ${route}`),
], 'None detected by automated checks')}

## Important Issues
${markdownList([
  `Admin/CRM production readiness is not implemented in the React storefront scope and remains a launch TODO.`,
  ...emptyCatalogNodes.slice(0, 30).map((item) => `Empty catalog node: ${item}`),
  ...productIssueEntries.slice(0, 30).map((entry) => `${entry.slug}: ${entry.issues.join(', ')}`),
], 'None detected by automated checks')}

## Minor Issues
${markdownList([
  ...missingRealImageProducts.slice(0, 40).map((slug) => `No local WebP product photo detected: ${slug}`),
  ...variantPriceOrderIssues.map((slug) => `Variant prices are not monotonic: ${slug}`),
], 'None detected by automated checks')}

## Commercial Launch Blockers
${markdownList([
  missingCommercialRoutes.length ? `Missing commercial pages: ${missingCommercialRoutes.join(', ')}` : '',
  'Admin/CRM remains TODO: secure login, roles, product/category CRUD, price/stock edit, image upload, order management, status changes, validation, audit logs.',
].filter(Boolean), 'None detected in customer-facing storefront after safe fixes')}

## SEO Blockers
${markdownList([
  sitemapMissingStaticRoutes.length ? `Static routes missing from sitemap: ${sitemapMissingStaticRoutes.join(', ')}` : '',
  summary.sitemap.legacyAliasesInSitemap.length ? `Legacy alias URLs are included in sitemap: ${summary.sitemap.legacyAliasesInSitemap.join(', ')}` : '',
].filter(Boolean), 'None detected by automated checks')}

## Mobile Blockers
${markdownList([
  visualSummary.missingRequiredViewports.length
    ? `Fresh 6-viewport screenshot capture is incomplete. Existing visual report has ${visualSummary.screenshotCount} screenshots and viewports: ${visualSummary.viewportLabels.join(', ') || 'none'}. Missing: ${visualSummary.missingRequiredViewports.join(', ')}.`
    : `Visual report has ${visualSummary.screenshotCount} screenshots across all required viewport widths.`,
], 'None detected by automated checks')}

## Content Blockers
${markdownList([
  missingRealImageProducts.length ? `${missingRealImageProducts.length} products still rely on placeholder, SVG, or planned image fallback instead of confirmed local WebP photo.` : '',
  productIssueEntries.length ? `${productIssueEntries.length} products need manual content review for descriptions, aliases, specs, FAQ, or package details.` : '',
].filter(Boolean), 'None detected by automated checks')}

## Content Readiness
- Descriptions ready: ${summary.products.descriptionReadyCount}/${summary.products.total}
- SEO title/meta ready: ${summary.products.seoReadyCount}/${summary.products.total}
- FAQ ready: ${summary.products.faqReadyCount}/${summary.products.total}
- Search aliases ready: ${summary.products.aliasReadyCount}/${summary.products.total}

## Product Image Status
- Real local WebP: ${summary.products.imageStatusCounts['real image бар'] || 0}
- Branded placeholder: ${summary.products.imageStatusCounts['branded placeholder'] || 0}
- Placeholder only: ${summary.products.imageStatusCounts['placeholder гана'] || 0}
- Missing local WebP: ${summary.products.imageStatusCounts['missing local WebP'] || 0}
- Full list: reports/production-audit/product-image-status.md

## Route And Alias Checks
${markdownList(aliasMappings)}

## Sitemap
- URL count: ${summary.sitemap.urlCount}
- Missing static routes: ${summary.sitemap.missingStaticRoutes.length || 0}
- Legacy alias URLs in sitemap: ${summary.sitemap.legacyAliasesInSitemap.length || 0}

## Exact Files To Maintain Next
- src/data/products.js
- src/data/productAssets.js
- public/images/products/{product-slug}/main.webp
- scripts/production-audit.mjs
- reports/production-audit/product-image-status.md

## Exact Routes Affected
${markdownList([
  '/about',
  '/payment',
  '/return',
  '/privacy',
  '/product/*',
  '/cart',
  '/checkout',
  '/catalog/*',
])}
`

  await writeFile(path.join(reportDir, 'production-audit.json'), JSON.stringify(summary, null, 2), 'utf8')
  await writeFile(path.join(reportDir, 'production-audit.md'), markdown, 'utf8')
  await writeFile(path.join(reportDir, 'product-image-status.json'), JSON.stringify(imageStatusEntries, null, 2), 'utf8')
  await writeFile(path.join(reportDir, 'product-image-status.md'), imageStatusMarkdown, 'utf8')
  console.log(JSON.stringify({
    report: 'reports/production-audit/production-audit.md',
    imageStatus: 'reports/production-audit/product-image-status.md',
    products: summary.products.total,
    catalogNodes: summary.catalog.totalNodes,
    emptyCatalogNodes: summary.catalog.emptyNodes,
    descriptionReadyCount: summary.products.descriptionReadyCount,
    seoReadyCount: summary.products.seoReadyCount,
    faqReadyCount: summary.products.faqReadyCount,
    productIssueCount: summary.products.productIssueCount,
    missingRealImageCount: summary.products.missingRealImageCount,
    brokenImageCount: summary.products.brokenImageCount,
    sitemapUrlCount: summary.sitemap.urlCount,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
