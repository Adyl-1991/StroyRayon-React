import { alinexProducts } from '../data/alinexProducts.generated.js'
import { getFilteredProducts } from '../services/productService.js'

export function shouldUseBundledAlinex(filters = {}) {
  const hasCatalogScope = Boolean(
    filters.catalogNode
      || filters.categorySlug
      || filters.subcategorySlug
      || filters.search
      || filters.brands?.length
      || filters.tags?.length
      || filters.units?.length
      || filters.stockStatuses?.length,
  )

  return hasCatalogScope && getFilteredProducts(filters, alinexProducts).length > 0
}

export function isBundledAlinexProduct(product) {
  return String(product?.brand || '').toLowerCase() === 'alinex'
}
