import bundledOrderCatalog = require('./bundled-order-catalog.generated.json')

export type BundledOrderCatalogItem = (typeof bundledOrderCatalog.items)[number]

export type BundledOrderLookup = {
  productId?: string
  variantId?: string
  slug?: string
  sku?: string
}

export function findBundledOrderCatalogItem(lookup: BundledOrderLookup) {
  const hasIdentity = Boolean(lookup.productId || lookup.variantId || lookup.slug || lookup.sku)
  if (!hasIdentity) return null

  return bundledOrderCatalog.items.find((item) => {
    if (lookup.productId && lookup.productId !== item.productId) return false
    if (lookup.slug && lookup.slug !== item.slug) return false
    if (lookup.variantId) {
      if (lookup.variantId !== item.variantId) return false
    } else if (item.variantId !== null) {
      return false
    }

    const authoritativeSku = item.variantSku || item.productSku
    if (lookup.sku && lookup.sku !== authoritativeSku) return false
    return true
  }) || null
}

export const bundledOrderCatalogStats = {
  schemaVersion: bundledOrderCatalog.schemaVersion,
  productCount: bundledOrderCatalog.productCount,
  itemCount: bundledOrderCatalog.itemCount,
}
