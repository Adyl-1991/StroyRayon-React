import { everPlastProducts } from '../data/everPlastProducts.generated.js'
import { getFilteredProducts } from '../services/productService.js'

export function shouldUseBundledEverPlast(filters = {}) {
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

  return hasCatalogScope && getFilteredProducts(filters, everPlastProducts).length > 0
}

export function isBundledEverPlastProduct(product) {
  return String(product?.brand || '').toLocaleLowerCase('ru') === 'ever plast'
}
