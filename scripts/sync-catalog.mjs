import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function syncCatalog({ log = true } = {}) {
  process.chdir(projectRoot)

  const [validationModule, orderCatalogModule, sitemapModule, productsModule] = await Promise.all([
    import('../src/scripts/validateCatalogData.js'),
    import('./generate-bundled-order-catalog.mjs'),
    import('../src/scripts/generateSitemap.js'),
    import('../src/data/products.js'),
  ])

  const catalogWarnings = validationModule.validateCatalogData()
  if (catalogWarnings.length) {
    throw new Error(`Catalog sync stopped: ${catalogWarnings.length} validation warning(s).`)
  }

  const [orderCatalog, sitemap] = await Promise.all([
    orderCatalogModule.writeBundledOrderCatalog(),
    sitemapModule.generateSitemap(),
  ])

  if (sitemap.warnings.length) {
    throw new Error(`Catalog sync stopped: ${sitemap.warnings.length} sitemap warning(s).`)
  }

  const activeProducts = productsModule.products.filter((product) => product.isActive !== false)
  const sitemapProductRoutes = new Set(
    sitemap.routes.filter((route) => route.startsWith('/product/')),
  )
  const missingSitemapProducts = activeProducts.filter(
    (product) => !sitemapProductRoutes.has(`/product/${product.slug}`),
  )
  const orderProductIds = new Set(orderCatalog.items.map((item) => item.productId))
  const purchasableProducts = activeProducts.filter((product) =>
    Number(product.price) > 0
    || (product.variants || []).some(
      (variant) => variant.stockStatus !== 'out_of_stock' && Number(variant.price) > 0,
    ),
  )
  const missingOrderProducts = purchasableProducts.filter(
    (product) => !orderProductIds.has(product.id),
  )

  if (missingSitemapProducts.length || missingOrderProducts.length) {
    throw new Error([
      missingSitemapProducts.length
        ? `Missing sitemap products: ${missingSitemapProducts.map((product) => product.slug).join(', ')}`
        : '',
      missingOrderProducts.length
        ? `Missing order catalog products: ${missingOrderProducts.map((product) => product.id).join(', ')}`
        : '',
    ].filter(Boolean).join('\n'))
  }

  const summary = {
    activeProducts: activeProducts.length,
    purchasableProducts: purchasableProducts.length,
    orderCatalogProducts: orderCatalog.productCount,
    orderCatalogItems: orderCatalog.itemCount,
    sitemapProductRoutes: sitemapProductRoutes.size,
    sitemapUrls: sitemap.routes.length,
    warnings: 0,
  }

  if (log) {
    console.log('Catalog, CRM order resolver and sitemap are synchronized.')
    console.log(JSON.stringify(summary, null, 2))
  }

  return summary
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  syncCatalog().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
