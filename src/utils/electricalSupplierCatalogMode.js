import { electricalSupplierProducts } from '../data/electricalSupplierProducts.generated.js'
import { getFilteredProducts } from '../services/productService.js'

const bundledElectricalBrands = new Set(['chint', 'panasonic', 'viko'])
const bundledElectricalOverrideSlugs = new Set([
  'kabeldik-teplyi-pol-10m',
  'kabeldik-teplyi-pol-20m',
  'mat-teplyi-pol-1m2',
  'mat-teplyi-pol-2m2',
  'mat-teplyi-pol-3m2',
])

export function shouldUseBundledElectricalSupplier(filters = {}) {
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

  if (!hasCatalogScope) return false

  return (
    getFilteredProducts(filters, electricalSupplierProducts).length > 0
    || getFilteredProducts(filters).some((product) => bundledElectricalOverrideSlugs.has(product.slug))
  )
}

export function isBundledElectricalSupplierProduct(product) {
  return (
    bundledElectricalBrands.has(String(product?.brand || '').toLocaleLowerCase('ru'))
    || bundledElectricalOverrideSlugs.has(String(product?.slug || ''))
  )
}
